import { Request, Response } from "express";
import { getServerByIdStmt, listActivePublicServersStmt } from "../db/query/servers";
import type { ServerRow } from "../db/query/servers";
import { decryptString } from "../utils/crypto";
import { runSshCommand } from "../utils/ssh";
import { getAddWgClientScript } from "../utils/add-wg-client-script";
import { randomBytes } from "node:crypto";

const SSH_USER = "wg-user";

/** Shared: create peer on server and return config. Used by auth and public endpoints. */
export function doCreatePeerAndGetConfig(
  row: ServerRow,
  clientName: string
): { config_content: string; client_name: string; client_ip: string | null } {
  const script = getAddWgClientScript({ serverPublicIp: row.ip });
  const scriptBase64 = Buffer.from(script, "utf8").toString("base64");
  const tmpId = randomBytes(4).toString("hex");
  const tmpPath = `/tmp/add_wg_${tmpId}.py`;
  const privateKey = decryptString(row.ssh_private_key_enc);

  const runScript = runSshCommand({
    ip: row.ip,
    sshUser: row.ssh_user || SSH_USER,
    privateKey,
    command: `echo '${scriptBase64}' | base64 -d > ${tmpPath} && sudo python3 ${tmpPath} ${clientName}; rm -f ${tmpPath}`,
    timeoutMs: 30_000,
  });

  if (!runScript.ok) {
    throw new Error(runScript.error ?? runScript.stderr ?? "Failed to run add-client script on server.");
  }

  let clientIp: string | null = null;
  const ipMatch = (runScript.stdout ?? "").match(/IP:\s*(\S+)/);
  if (ipMatch) clientIp = ipMatch[1].trim();

  const catRun = runSshCommand({
    ip: row.ip,
    sshUser: row.ssh_user || SSH_USER,
    privateKey,
    command: `sudo cat /etc/wireguard/${clientName}.conf`,
    timeoutMs: 10_000,
  });

  if (!catRun.ok || !catRun.stdout) {
    throw new Error("Config was created but could not read it.");
  }

  return {
    config_content: catRun.stdout.trim(),
    client_name: clientName,
    client_ip: clientIp,
  };
}

/** GET /api/public/servers – list all active servers (SSH + WireGuard), no auth */
export async function listActiveServers(req: Request, res: Response) {
  try {
    const rows = listActivePublicServersStmt().all() as Array<{
      id: number;
      ip: string;
      region: string;
      server_type: string;
      country_name: string | null;
      country_flag_url: string | null;
    }>;
    const servers = rows.map((r) => ({
      id: r.id,
      ip: r.ip,
      region: r.region,
      server_type: r.server_type,
      country: r.country_name
        ? { name: r.country_name, flag_url: r.country_flag_url }
        : null,
    }));
    return res.status(200).json({ servers });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/** POST /api/public/conf-request – create new peer and return config, no auth */
export async function confRequest(req: Request, res: Response) {
  try {
    const serverId = req.body?.server_id != null ? Number(req.body.server_id) : NaN;
    let clientName = String(req.body?.client_name ?? "").trim();
    clientName = clientName.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);

    if (!Number.isFinite(serverId)) {
      return res.status(400).json({ message: "server_id is required and must be a number." });
    }
    if (!clientName) {
      return res.status(400).json({ message: "client_name is required (alphanumeric, underscore, hyphen only)." });
    }

    const row = getServerByIdStmt().get(serverId) as ServerRow | undefined;
    if (!row) return res.status(404).json({ message: "Server not found." });
    if (row.status !== "active") {
      return res.status(400).json({ message: "Server is not active." });
    }
    const wireguardInstalled = (row as ServerRow & { wireguard_installed?: number }).wireguard_installed ?? 0;
    if (!wireguardInstalled) {
      return res.status(400).json({ message: "WireGuard is not installed on this server." });
    }

    const result = doCreatePeerAndGetConfig(row, clientName);
    return res.status(200).json({
      message: "Client config created.",
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
