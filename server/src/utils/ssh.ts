import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

export function generateSshKeyPair(comment: string) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wg-panel-key-"));
  const keyPath = path.join(dir, "id_ed25519");

  try {
    execFileSync(
      "ssh-keygen",
      ["-t", "ed25519", "-N", "", "-C", comment, "-f", keyPath],
      { stdio: "ignore" }
    );
    const privateKey = fs.readFileSync(keyPath, "utf8");
    const publicKey = fs.readFileSync(`${keyPath}.pub`, "utf8").trim();
    return { publicKey, privateKey };
  } finally {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

export function verifySsh({
  ip,
  sshUser,
  privateKey,
  timeoutMs = 12_000,
}: {
  ip: string;
  sshUser: string;
  privateKey: string;
  timeoutMs?: number;
}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wg-panel-ssh-"));
  const keyPath = path.join(dir, "id_ed25519");

  try {
    fs.writeFileSync(keyPath, privateKey, { encoding: "utf8", mode: 0o600 });

    // BatchMode => fail fast if auth fails, no password prompts.
    // UserKnownHostsFile=/dev/null + StrictHostKeyChecking=no => avoid interactive prompts.
    execFileSync(
      "ssh",
      [
        "-i",
        keyPath,
        "-o",
        "BatchMode=yes",
        "-o",
        "StrictHostKeyChecking=no",
        "-o",
        "UserKnownHostsFile=/dev/null",
        "-o",
        `ConnectTimeout=${Math.ceil(timeoutMs / 1000)}`,
        `${sshUser}@${ip}`,
        "echo ok",
      ],
      {
        stdio: "pipe",
        timeout: timeoutMs,
      }
    );

    return { ok: true as const };
  } catch (err: any) {
    const message =
      (err?.stderr && Buffer.isBuffer(err.stderr)
        ? err.stderr.toString("utf8")
        : err?.message) || "SSH verification failed";
    return { ok: false as const, error: message.slice(0, 2000) };
  } finally {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

export function runSshCommand({
  ip,
  sshUser,
  privateKey,
  command,
  timeoutMs = 15_000,
}: {
  ip: string;
  sshUser: string;
  privateKey: string;
  command: string;
  timeoutMs?: number;
}): { ok: boolean; stdout?: string; stderr?: string; exitCode?: number; error?: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wg-panel-ssh-"));
  const keyPath = path.join(dir, "id_ed25519");

  try {
    fs.writeFileSync(keyPath, privateKey, { encoding: "utf8", mode: 0o600 });

    const result = execFileSync(
      "ssh",
      [
        "-i",
        keyPath,
        "-o",
        "BatchMode=yes",
        "-o",
        "StrictHostKeyChecking=no",
        "-o",
        "UserKnownHostsFile=/dev/null",
        "-o",
        `ConnectTimeout=${Math.ceil(timeoutMs / 1000)}`,
        `${sshUser}@${ip}`,
        command,
      ],
      {
        encoding: "utf8",
        timeout: timeoutMs,
        maxBuffer: 1024 * 1024,
      }
    );
    return { ok: true, stdout: result?.trim() ?? "", stderr: "", exitCode: 0 };
  } catch (err: any) {
    const stdout = err?.stdout && Buffer.isBuffer(err.stdout) ? err.stdout.toString("utf8") : "";
    const stderr = err?.stderr && Buffer.isBuffer(err.stderr) ? err.stderr.toString("utf8") : err?.message ?? "";
    const code = err?.status ?? err?.code ?? null;
    return {
      ok: false,
      stdout: stdout.slice(0, 8000),
      stderr: stderr.slice(0, 8000),
      exitCode: typeof code === "number" ? code : undefined,
      error: (stdout || stderr).slice(0, 2000),
    };
  } finally {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}