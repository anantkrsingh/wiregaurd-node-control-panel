import { Request, Response } from "express";
import {
  getServerByIdStmt,
  getServerByIdWithCountryStmt,
  getServerByIpStmt,
  insertServerStmt,
  listServersStmt,
  updateServerErrorStmt,
  updateServerStmt,
  updateServerVerifiedStmt,
  updateServerWireguardInstalledStmt,
  deleteServerStmt,
  type ServerRow,
} from "../db/query/servers";
import { encryptString, decryptString } from "../utils/crypto";
import { generateSshKeyPair, verifySsh, runSshCommand } from "../utils/ssh";
import { doCreatePeerAndGetConfig } from "./public";

const SSH_USER = "wg-user";
const SSH_KEY_COMMENT = "wg-user@gmail.com";


type ServerListRow = ServerRow & {
  country_id_ref?: number;
  country_name?: string;
  country_flag_url?: string | null;
  wireguard_installed?: number;
};

function toServerPayload(row: ServerRow | ServerListRow) {
  const r = row as ServerListRow;
  return {
    id: row.id,
    ip: row.ip,
    country_id: row.country_id ?? r.country_id_ref ?? null,
    region: row.region,
    server_type: row.server_type ?? "free",
    ssh_user: row.ssh_user ?? SSH_USER,
    status: row.status,
    wireguard_installed: (row as ServerRow & { wireguard_installed?: number }).wireguard_installed ?? r.wireguard_installed ?? 0,
    ssh_public_key: row.ssh_public_key,
    created_at: row.created_at,
    verified_at: row.verified_at,
    last_error: row.last_error,
    country: r.country_name
      ? { id: r.country_id_ref ?? row.country_id, name: r.country_name, flag_url: r.country_flag_url ?? null }
      : null,
  };
}

export async function listServers(req: Request, res: Response) {
  try {
    const rows = listServersStmt().all() as ServerListRow[];
    const servers = rows.map((row) => toServerPayload(row));
    return res.status(200).json({ servers });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function createServer(req: Request, res: Response) {
  try {
    const ip = String(req.body?.ip ?? "").trim();
    const countryId = req.body?.country_id != null ? Number(req.body.country_id) : null;
    const region = String(req.body?.region ?? "").trim();
    const serverType = String(req.body?.server_type ?? "free").trim().toLowerCase();
    const finalServerType = serverType === "paid" ? "paid" : "free";

    if (!ip) return res.status(400).json({ message: "IP is required" });
    if (countryId == null || !Number.isFinite(countryId)) {
      return res.status(400).json({ message: "Country is required" });
    }
    if (!region) return res.status(400).json({ message: "Region is required" });

    const existing = getServerByIpStmt().get(ip) as ServerRow | undefined;
    if (existing) {
      return res.status(409).json({ message: "Server with this IP already exists" });
    }

    const { publicKey, privateKey } = generateSshKeyPair(SSH_KEY_COMMENT);

    const createdAt = new Date().toISOString();
    const encPrivate = encryptString(privateKey);

    const result = insertServerStmt().run(
      ip,
      countryId ?? null,
      region,
      finalServerType,
      SSH_USER,
      "inactive",
      publicKey,
      encPrivate,
      createdAt
    ) as unknown as { lastInsertRowid: number | bigint };

    const id =
      typeof result?.lastInsertRowid === "bigint"
        ? Number(result.lastInsertRowid)
        : (result?.lastInsertRowid as number);

    const row = getServerByIdStmt().get(id) as ServerRow;

    return res.status(201).json({
      message: "Server added (inactive). Add SSH key to your VPS and verify.",
      server: toServerPayload(row),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

const CHECKPOINTS = [
  { id: "wg-version", name: "wg --version", command: "wg --version" },
  {
    id: "ip-forwarding",
    name: "Check IP forwarding (CRITICAL)",
    command:
      "cat /proc/sys/net/ipv4/ip_forward 2>/dev/null || sysctl -n net.ipv4.ip_forward 2>/dev/null",
  },
  {
    id: "ipv6-forwarding",
    name: "Check IPv6 forwarding",
    command:
      "cat /proc/sys/net/ipv6/conf/all/forwarding 2>/dev/null || sysctl -n net.ipv6.conf.all.forwarding 2>/dev/null",
  },
  {
    id: "wg-config-files",
    name: "Check WireGuard config files",
    command: "sudo ls -la /etc/wireguard/",
  },
  {
    id: "wg-permissions",
    name: "Check permissions: /etc/wireguard/wg0.conf",
    command: "sudo ls -l /etc/wireguard/wg0.conf",
  },
  {
    id: "wg-service-status",
    name: "Check WireGuard service status",
    command:
      "systemctl status wg-quick@wg0 --no-pager 2>/dev/null || (service wg-quick@wg0 status 2>/dev/null) || echo 'Service not found'",
  },
  {
    id: "wg-runtime-status",
    name: "Check WireGuard runtime status",
    command: "sudo wg show",
  },
] as const;

export async function getServer(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });
    const row = getServerByIdWithCountryStmt().get(id) as ServerListRow | undefined;
    if (!row) return res.status(404).json({ message: "Server not found" });
    return res.status(200).json({ server: toServerPayload(row) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateServer(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });
    const row = getServerByIdStmt().get(id) as ServerRow | undefined;
    if (!row) return res.status(404).json({ message: "Server not found" });

    const ip = String(req.body?.ip ?? "").trim();
    const countryId = req.body?.country_id != null ? Number(req.body.country_id) : null;
    const region = String(req.body?.region ?? "").trim();
    const serverType = String(req.body?.server_type ?? "free").trim().toLowerCase();
    const finalServerType = serverType === "paid" ? "paid" : "free";

    if (!ip) return res.status(400).json({ message: "IP is required" });
    if (countryId != null && !Number.isFinite(countryId)) {
      return res.status(400).json({ message: "Invalid country" });
    }
    if (!region) return res.status(400).json({ message: "Region is required" });

    if (ip !== row.ip) {
      const existing = getServerByIpStmt().get(ip) as ServerRow | undefined;
      if (existing) return res.status(409).json({ message: "Server with this IP already exists" });
    }

    updateServerStmt().run(ip, countryId ?? null, region, finalServerType, id);
    const updated = getServerByIdWithCountryStmt().get(id) as ServerListRow;
    return res.status(200).json({ message: "Server updated", server: toServerPayload(updated) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function runServerCheck(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });
    const row = getServerByIdStmt().get(id) as ServerRow | undefined;
    if (!row) return res.status(404).json({ message: "Server not found" });
    if (row.status !== "active") {
      return res.status(400).json({
        message: "Server must be verified (active) before running checkpoints.",
      });
    }

    const privateKey = decryptString(row.ssh_private_key_enc);
    const results: Array<{
      id: string;
      name: string;
      command: string;
      success: boolean;
      stdout: string;
      stderr: string;
      exitCode?: number;
    }> = [];

    for (const cp of CHECKPOINTS) {
      const run = runSshCommand({
        ip: row.ip,
        sshUser: row.ssh_user || SSH_USER,
        privateKey,
        command: cp.command,
      });
      results.push({
        id: cp.id,
        name: cp.name,
        command: cp.command,
        success: run.ok,
        stdout: run.stdout ?? "",
        stderr: run.stderr ?? "",
        exitCode: run.exitCode,
      });
    }

    const wgRuntime = results.find((r) => r.id === "wg-runtime-status");
    if (wgRuntime) {
      updateServerWireguardInstalledStmt().run(wgRuntime.success ? 1 : 0, id);
    }

    return res.status(200).json({ checkpoints: results });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function generateClientConfig(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });
    const row = getServerByIdStmt().get(id) as ServerRow | undefined;
    if (!row) return res.status(404).json({ message: "Server not found" });
    if (row.status !== "active") {
      return res.status(400).json({ message: "Server must be verified (active) first." });
    }
    const wireguardInstalled = (row as ServerRow & { wireguard_installed?: number }).wireguard_installed ?? 0;
    if (!wireguardInstalled) {
      return res.status(400).json({ message: "WireGuard must be installed on the server (run checkpoints first)." });
    }

    let clientName = String(req.body?.client_name ?? "").trim();
    clientName = clientName.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
    if (!clientName) return res.status(400).json({ message: "client_name is required (alphanumeric, underscore, hyphen only)." });

    const result = doCreatePeerAndGetConfig(row, clientName);
    return res.status(200).json({
      message: "Client config generated.",
      config_content: result.config_content,
      client_name: result.client_name,
      client_ip: result.client_ip,
    });
  } catch (error: any) {
    console.error(error);
    return res.status(400).json({
      message: error?.message ?? "Failed to create peer or read config.",
    });
  }
}

export async function getServerPublicKey(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });
    const row = getServerByIdStmt().get(id) as ServerRow | undefined;
    if (!row) return res.status(404).json({ message: "Server not found" });
    return res.status(200).json({ id: row.id, ssh_public_key: row.ssh_public_key });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function verifyServer(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });

    const row = getServerByIdStmt().get(id) as ServerRow | undefined;
    if (!row) return res.status(404).json({ message: "Server not found" });

    const privateKey = decryptString(row.ssh_private_key_enc);
    const result = verifySsh({
      ip: row.ip,
      sshUser: row.ssh_user || SSH_USER,
      privateKey,
    });

    if (!result.ok) {
      updateServerErrorStmt().run(result.error ?? "Verification failed", id);
      return res.status(400).json({
        message: "Verification failed. Make sure the public key is in authorized_keys.",
        error: result.error,
      });
    }

    const verifiedAt = new Date().toISOString();
    updateServerVerifiedStmt().run("active", verifiedAt, null, id);

    const updated = getServerByIdStmt().get(id) as ServerRow;
    return res.status(200).json({
      message: "Server verified and activated",
      server: toServerPayload(updated),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function deleteServer(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });

    const row = getServerByIdStmt().get(id) as ServerRow | undefined;
    if (!row) return res.status(404).json({ message: "Server not found" });

    deleteServerStmt().run(id);

    return res.status(200).json({
      message: "Server deleted successfully"
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

