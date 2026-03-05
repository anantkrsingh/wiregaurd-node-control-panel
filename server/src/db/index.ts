import { DatabaseSync } from "node:sqlite";
import path from "path";
const dbPath = path.join(process.cwd(), "data", "database.db");
const fileDb = new DatabaseSync(dbPath);
(global as any).db = fileDb;


fileDb.exec(
    `
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
    `
)

fileDb.exec(
    `
    CREATE TABLE IF NOT EXISTS countries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        flag_url TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
    `
);

fileDb.exec(
    `
    CREATE TABLE IF NOT EXISTS servers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip TEXT NOT NULL UNIQUE,
        country_id INTEGER,
        region TEXT NOT NULL,
        server_type TEXT NOT NULL DEFAULT 'free',
        ssh_user TEXT NOT NULL DEFAULT 'wg-user',
        status TEXT NOT NULL DEFAULT 'inactive',
        wireguard_installed INTEGER NOT NULL DEFAULT 0,
        ssh_public_key TEXT NOT NULL,
        ssh_private_key_enc TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        verified_at TEXT,
        last_error TEXT,
        FOREIGN KEY (country_id) REFERENCES countries(id)
    )
    `
);

// Migrate existing servers table: add country_id, server_type, wireguard_installed if missing
try {
  const info = fileDb.prepare("PRAGMA table_info(servers)").all() as Array<{ name: string }>;
  const hasCountryId = info.some((c) => c.name === "country_id");
  const hasServerType = info.some((c) => c.name === "server_type");
  const hasWireguardInstalled = info.some((c) => c.name === "wireguard_installed");
  if (!hasCountryId) fileDb.exec("ALTER TABLE servers ADD COLUMN country_id INTEGER");
  if (!hasServerType) fileDb.exec("ALTER TABLE servers ADD COLUMN server_type TEXT NOT NULL DEFAULT 'free'");
  if (!hasWireguardInstalled) fileDb.exec("ALTER TABLE servers ADD COLUMN wireguard_installed INTEGER NOT NULL DEFAULT 0");
} catch {
  // ignore
}

fileDb.exec(
  `
  CREATE TABLE IF NOT EXISTS server_peer_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    peer_count INTEGER NOT NULL DEFAULT 0,
    total_peer_count INTEGER NOT NULL DEFAULT 0,
    total_rx_bytes INTEGER NOT NULL DEFAULT 0,
    total_tx_bytes INTEGER NOT NULL DEFAULT 0,
    peers_json TEXT,
    FOREIGN KEY (server_id) REFERENCES servers(id)
  )
  `
);

// Migrate server_peer_snapshots: add total_peer_count if missing (history = all peers)
try {
  const snapInfo = fileDb.prepare("PRAGMA table_info(server_peer_snapshots)").all() as Array<{ name: string }>;
  const hasTotalPeerCount = snapInfo.some((c) => c.name === "total_peer_count");
  if (!hasTotalPeerCount) {
    fileDb.exec("ALTER TABLE server_peer_snapshots ADD COLUMN total_peer_count INTEGER NOT NULL DEFAULT 0");
    fileDb.exec("UPDATE server_peer_snapshots SET total_peer_count = peer_count WHERE total_peer_count = 0");
  }
} catch {
  // ignore
}

export { fileDb };