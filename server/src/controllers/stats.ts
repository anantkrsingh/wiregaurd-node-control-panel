import { Request, Response } from "express";
import {
  getLatestSnapshotPerServerStmt,
  getSnapshotHistoryStmt,
} from "../db/query/servers";

export async function getPeerStats(req: Request, res: Response) {
  try {
    const latestRows = getLatestSnapshotPerServerStmt().all() as Array<{
      server_id: number;
      ip: string;
      created_at: string;
      peer_count: number;
      total_rx_bytes: number;
      total_tx_bytes: number;
    }>;

    let connectedPeersNow = 0;
    const byServer = latestRows.map((r) => {
      connectedPeersNow += r.peer_count;
      return {
        server_id: r.server_id,
        ip: r.ip,
        peer_count: r.peer_count,
        total_rx_bytes: r.total_rx_bytes,
        total_tx_bytes: r.total_tx_bytes,
        created_at: r.created_at,
      };
    });

    const historyRows = getSnapshotHistoryStmt().all() as Array<{
      server_id: number;
      created_at: string;
      peer_count: number;
      total_rx_bytes: number;
      total_tx_bytes: number;
    }>;

    const BUCKET_MS = 5 * 60 * 1000;

    const byBucket = new Map<number, { peers: number; rx: number; tx: number; at: string }>();
    for (const r of historyRows) {
      const t = new Date(r.created_at).getTime();
      const bucket = Math.floor(t / BUCKET_MS) * BUCKET_MS;
      const existing = byBucket.get(bucket);
      if (existing) {
        existing.peers += r.peer_count;
        existing.rx += r.total_rx_bytes;
        existing.tx += r.total_tx_bytes;
      } else {
        byBucket.set(bucket, {
          peers: r.peer_count,
          rx: r.total_rx_bytes,
          tx: r.total_tx_bytes,
          at: new Date(bucket).toISOString().slice(0, 19),
        });
      }
    }
    const history = Array.from(byBucket.entries())
      .map(([_, v]) => ({ at: v.at, peers: v.peers, rx: v.rx, tx: v.tx }))
      .sort((a, b) => a.at.localeCompare(b.at));

    const serverIps = new Map(latestRows.map((r) => [r.server_id, r.ip]));
    const byServerBucket = new Map<
      number,
      Map<number, { peers: number; rx: number; tx: number; at: string }>
    >();
    for (const r of historyRows) {
      const t = new Date(r.created_at).getTime();
      const bucket = Math.floor(t / BUCKET_MS) * BUCKET_MS;
      let serverMap = byServerBucket.get(r.server_id);
      if (!serverMap) {
        serverMap = new Map();
        byServerBucket.set(r.server_id, serverMap);
      }
      const existing = serverMap.get(bucket);
      if (existing) {
        existing.peers += r.peer_count;
        existing.rx += r.total_rx_bytes;
        existing.tx += r.total_tx_bytes;
      } else {
        serverMap.set(bucket, {
          peers: r.peer_count,
          rx: r.total_rx_bytes,
          tx: r.total_tx_bytes,
          at: new Date(bucket).toISOString().slice(0, 19),
        });
      }
    }
    const history_per_server = Array.from(byServerBucket.entries())
      .map(([server_id, bucketMap]) => ({
        server_id,
        ip: serverIps.get(server_id) ?? String(server_id),
        points: Array.from(bucketMap.entries())
          .map(([_, v]) => ({ at: v.at, peers: v.peers, rx: v.rx, tx: v.tx }))
          .sort((a, b) => a.at.localeCompare(b.at)),
      }))
      .filter((s) => s.points.length > 0)
      .sort((a, b) => a.server_id - b.server_id);

    const totalRx = byServer.reduce((s, r) => s + r.total_rx_bytes, 0);
    const totalTx = byServer.reduce((s, r) => s + r.total_tx_bytes, 0);

    return res.status(200).json({
      connected_peers_now: connectedPeersNow,
      total_rx_bytes: totalRx,
      total_tx_bytes: totalTx,
      by_server: byServer,
      history,
      history_per_server: history_per_server,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
