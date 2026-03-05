import {
  getServersWithWireguardActiveStmt,
  insertPeerSnapshotStmt,
} from "../db/query/servers";
import { decryptString } from "../utils/crypto";
import { runSshCommand } from "../utils/ssh";
import { parseWgShowOutput } from "../utils/wg-show-parser";

const SSH_USER = "wg-user";

export async function runPeerSnapshotJob(): Promise<void> {
  const rows = getServersWithWireguardActiveStmt().all() as Array<{
    id: number;
    ip: string;
    ssh_user: string;
    ssh_private_key_enc: string;
  }>;

  const now = new Date().toISOString();

  for (const row of rows) {
    try {
      const privateKey = decryptString(row.ssh_private_key_enc);
      const run = runSshCommand({
        ip: row.ip,
        sshUser: row.ssh_user || SSH_USER,
        privateKey,
        command: "sudo wg show",
        timeoutMs: 15_000,
      });

      if (!run.ok || !run.stdout) {
        continue;
      }

      const parsed = parseWgShowOutput(run.stdout);
      const peersJson =
        parsed.peers.length > 0 ? JSON.stringify(parsed.peers) : null;

      insertPeerSnapshotStmt().run(
        row.id,
        now,
        parsed.connected_peers_count,
        parsed.peers.length,
        parsed.total_rx_bytes,
        parsed.total_tx_bytes,
        peersJson
      );
    } catch {
      // skip this server and continue
    }
  }
}

export function startPeerSnapshotInterval(intervalMs: number = 30_000): NodeJS.Timeout {
  return setInterval(() => {
    runPeerSnapshotJob().catch((err) => console.error("Peer snapshot job:", err));
  }, intervalMs);
}
