import { fileDb } from "../index";

export type ServerRow = {
  id: number;
  ip: string;
  country_id: number | null;
  region: string;
  server_type: string;
  ssh_user: string;
  status: "inactive" | "active";
  wireguard_installed: number;
  ssh_public_key: string;
  ssh_private_key_enc: string;
  created_at: string;
  verified_at: string | null;
  last_error: string | null;
};

export type ServerPeerSnapshotRow = {
  id: number;
  server_id: number;
  created_at: string;
  peer_count: number;
  total_peer_count: number;
  total_rx_bytes: number;
  total_tx_bytes: number;
  peers_json: string | null;
};

export const insertServerStmt = () => {
  return fileDb.prepare(
    "INSERT INTO servers (ip, country_id, region, server_type, ssh_user, status, ssh_public_key, ssh_private_key_enc, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
};

export const listServersStmt = () => {
  return fileDb.prepare(
    `SELECT s.id, s.ip, s.country_id, s.region, s.server_type, s.ssh_user, s.status, s.wireguard_installed, s.ssh_public_key, s.created_at, s.verified_at, s.last_error,
      c.id AS country_id_ref, c.name AS country_name, c.flag_url AS country_flag_url
     FROM servers s
     LEFT JOIN countries c ON s.country_id = c.id
     ORDER BY s.id DESC`
  );
};

export const getServerByIdStmt = () => {
  return fileDb.prepare("SELECT * FROM servers WHERE id = ?");
};

export const getServerByIdWithCountryStmt = () => {
  return fileDb.prepare(
    `SELECT s.id, s.ip, s.country_id, s.region, s.server_type, s.ssh_user, s.status, s.wireguard_installed, s.ssh_public_key, s.created_at, s.verified_at, s.last_error,
      c.id AS country_id_ref, c.name AS country_name, c.flag_url AS country_flag_url
     FROM servers s
     LEFT JOIN countries c ON s.country_id = c.id
     WHERE s.id = ?`
  );
};

export const getServerByIpStmt = () => {
  return fileDb.prepare("SELECT * FROM servers WHERE ip = ?");
};

export const getServersWithWireguardActiveStmt = () => {
  return fileDb.prepare(
    "SELECT id, ip, ssh_user, ssh_private_key_enc FROM servers WHERE wireguard_installed = 1 AND status = 'active'"
  );
};

/** Public list: active SSH + WireGuard, no secrets */
export const listActivePublicServersStmt = () => {
  return fileDb.prepare(
    `SELECT s.id, s.ip, s.region, s.server_type, c.name AS country_name, c.flag_url AS country_flag_url
     FROM servers s
     LEFT JOIN countries c ON s.country_id = c.id
     WHERE s.status = 'active' AND s.wireguard_installed = 1
     ORDER BY s.id ASC`
  );
};

export const updateServerStmt = () => {
  return fileDb.prepare(
    "UPDATE servers SET ip = ?, country_id = ?, region = ?, server_type = ? WHERE id = ?"
  );
};

export const updateServerVerifiedStmt = () => {
  return fileDb.prepare(
    "UPDATE servers SET status = ?, verified_at = ?, last_error = ? WHERE id = ?"
  );
};

export const updateServerErrorStmt = () => {
  return fileDb.prepare("UPDATE servers SET last_error = ? WHERE id = ?");
};

export const updateServerWireguardInstalledStmt = () => {
  return fileDb.prepare("UPDATE servers SET wireguard_installed = ? WHERE id = ?");
};

export const insertPeerSnapshotStmt = () => {
  return fileDb.prepare(
    "INSERT INTO server_peer_snapshots (server_id, created_at, peer_count, total_peer_count, total_rx_bytes, total_tx_bytes, peers_json) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
};

export const getLatestSnapshotPerServerStmt = () => {
  return fileDb.prepare(
    `SELECT s.id AS server_id, s.ip, p.created_at, p.peer_count, p.total_rx_bytes, p.total_tx_bytes
     FROM servers s
     INNER JOIN server_peer_snapshots p ON p.id = (
       SELECT id FROM server_peer_snapshots WHERE server_id = s.id ORDER BY created_at DESC LIMIT 1
     )
     WHERE s.wireguard_installed = 1 AND s.status = 'active'
     ORDER BY s.id`
  );
};

export const getSnapshotHistoryStmt = () => {
  return fileDb.prepare(
    `SELECT server_id, created_at, total_peer_count AS peer_count, total_rx_bytes, total_tx_bytes
     FROM server_peer_snapshots
     WHERE created_at >= datetime('now', '-24 hours')
     ORDER BY created_at ASC`
  );
};

export const deleteServerStmt = () => {
  return fileDb.prepare("DELETE FROM servers WHERE id = ?");
};