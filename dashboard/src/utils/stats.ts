import api from "@/api/axios";
import { AxiosError } from "axios";

export type PeerStatsByServer = {
  server_id: number;
  ip: string;
  peer_count: number;
  total_rx_bytes: number;
  total_tx_bytes: number;
  created_at: string;
};

export type PeerStatsHistoryPoint = {
  at: string;
  peers: number;
  rx: number;
  tx: number;
};

export type ServerHistorySeries = {
  server_id: number;
  ip: string;
  points: PeerStatsHistoryPoint[];
};

export type PeerStatsResponse = {
  connected_peers_now: number;
  total_rx_bytes: number;
  total_tx_bytes: number;
  by_server: PeerStatsByServer[];
  history: PeerStatsHistoryPoint[];
  history_per_server: ServerHistorySeries[];
};

export async function getPeerStats(): Promise<PeerStatsResponse> {
  try {
    const response = await api.get<PeerStatsResponse>("/stats/peers");
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new Error(error.response?.data?.message || "No Response from server");
    }
    throw new Error("Network Error");
  }
}
