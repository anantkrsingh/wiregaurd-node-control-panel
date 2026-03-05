/**
 * Parse "wg show" output into structured peer data and totals.
 * Example:
 *   interface: wg0
 *     public key: ...
 *   peer: AKW/cptX...
 *     endpoint: 152.59.147.132:60542
 *     allowed ips: 10.10.0.2/32
 *     latest handshake: 11 hours, 38 minutes, 50 seconds ago
 *     transfer: 8.90 MiB received, 41.85 MiB sent
 */

export type ParsedPeer = {
  public_key: string;
  endpoint: string | null;
  allowed_ips: string | null;
  latest_handshake: string | null;
  handshake_seconds_ago: number | null;
  transfer_rx_bytes: number;
  transfer_tx_bytes: number;
};

export type ParsedWgShow = {
  interface: string | null;
  peers: ParsedPeer[];
  total_rx_bytes: number;
  total_tx_bytes: number;
  /** Peers with latest handshake < 10 minutes (current/connected at runtime) */
  connected_peers_count: number;
};

const CONNECTED_HANDSHAKE_MAX_SECONDS = 10 * 60; // 10 minutes

/**
 * Parse "latest handshake: X hours, Y minutes, Z seconds ago" (or variants) to seconds ago.
 * Returns null if no handshake or unparseable.
 */
function parseHandshakeToSecondsAgo(s: string | null | undefined): number | null {
  if (!s || !s.trim()) return null;
  const t = s.trim().toLowerCase();
  if (t === "never" || t === "n/a") return null;
  let totalSeconds = 0;
  const hourMatch = t.match(/(\d+)\s*hours?/);
  if (hourMatch) totalSeconds += parseInt(hourMatch[1], 10) * 3600;
  const minMatch = t.match(/(\d+)\s*minutes?/);
  if (minMatch) totalSeconds += parseInt(minMatch[1], 10) * 60;
  const secMatch = t.match(/(\d+)\s*seconds?/);
  if (secMatch) totalSeconds += parseInt(secMatch[1], 10);
  if (totalSeconds === 0 && !hourMatch && !minMatch && !secMatch) return null;
  return totalSeconds;
}

export function isPeerConnectedAtRuntime(handshakeSecondsAgo: number | null): boolean {
  if (handshakeSecondsAgo == null) return false;
  return handshakeSecondsAgo < CONNECTED_HANDSHAKE_MAX_SECONDS;
}

function parseTransferToBytes(s: string): number {
  const m = s.trim().match(/^([\d.]+)\s*(B|KiB|MiB|GiB|KB|MB|GB)?/i);
  if (!m) return 0;
  let n = parseFloat(m[1]);
  const unit = (m[2] || "B").toLowerCase();
  if (unit === "kib" || unit === "kb") n *= 1024;
  else if (unit === "mib" || unit === "mb") n *= 1024 * 1024;
  else if (unit === "gib" || unit === "gb") n *= 1024 * 1024 * 1024;
  return Math.round(n);
}

export function parseWgShowOutput(stdout: string): ParsedWgShow {
  const result: ParsedWgShow = {
    interface: null,
    peers: [],
    total_rx_bytes: 0,
    total_tx_bytes: 0,
    connected_peers_count: 0,
  };

  const lines = stdout.split("\n");
  let currentPeer: Partial<ParsedPeer> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const peerMatch = line.match(/^peer:\s*(.+)$/);
    if (peerMatch) {
      if (currentPeer && currentPeer.public_key) {
        const p = currentPeer as ParsedPeer;
        const handshakeSec = parseHandshakeToSecondsAgo(p.latest_handshake ?? null);
        const peer: ParsedPeer = {
          public_key: p.public_key,
          endpoint: p.endpoint ?? null,
          allowed_ips: p.allowed_ips ?? null,
          latest_handshake: p.latest_handshake ?? null,
          handshake_seconds_ago: handshakeSec,
          transfer_rx_bytes: p.transfer_rx_bytes ?? 0,
          transfer_tx_bytes: p.transfer_tx_bytes ?? 0,
        };
        result.peers.push(peer);
        result.total_rx_bytes += peer.transfer_rx_bytes;
        result.total_tx_bytes += peer.transfer_tx_bytes;
        if (isPeerConnectedAtRuntime(handshakeSec)) result.connected_peers_count += 1;
      }
      currentPeer = { public_key: peerMatch[1].trim(), transfer_rx_bytes: 0, transfer_tx_bytes: 0 };
      continue;
    }

    if (line.match(/^interface:\s*(.+)$/) && !currentPeer) {
      result.interface = line.replace(/^interface:\s*/, "").trim();
      continue;
    }

    if (currentPeer) {
      const ep = line.match(/^\s*endpoint:\s*(.+)$/);
      if (ep) {
        currentPeer.endpoint = ep[1].trim();
        continue;
      }
      const aip = line.match(/^\s*allowed ips:\s*(.+)$/);
      if (aip) {
        currentPeer.allowed_ips = aip[1].trim();
        continue;
      }
      const hand = line.match(/^\s*latest handshake:\s*(.+)$/);
      if (hand) {
        currentPeer.latest_handshake = hand[1].trim();
        continue;
      }
      const trans = line.match(/^\s*transfer:\s*(.+)$/);
      if (trans) {
        const t = trans[1];
        const rxMatch = t.match(/([\d.]+\s*(?:B|KiB|MiB|GiB|KB|MB|GB)?)\s*received/);
        const txMatch = t.match(/([\d.]+\s*(?:B|KiB|MiB|GiB|KB|MB|GB)?)\s*sent/);
        if (rxMatch) currentPeer.transfer_rx_bytes = parseTransferToBytes(rxMatch[1]);
        if (txMatch) currentPeer.transfer_tx_bytes = parseTransferToBytes(txMatch[1]);
        continue;
      }
    }
  }

  if (currentPeer && currentPeer.public_key) {
    const p = currentPeer as ParsedPeer;
    const handshakeSec = parseHandshakeToSecondsAgo(p.latest_handshake ?? null);
    const peer: ParsedPeer = {
      public_key: p.public_key,
      endpoint: p.endpoint ?? null,
      allowed_ips: p.allowed_ips ?? null,
      latest_handshake: p.latest_handshake ?? null,
      handshake_seconds_ago: handshakeSec,
      transfer_rx_bytes: p.transfer_rx_bytes ?? 0,
      transfer_tx_bytes: p.transfer_tx_bytes ?? 0,
    };
    result.peers.push(peer);
    result.total_rx_bytes += peer.transfer_rx_bytes;
    result.total_tx_bytes += peer.transfer_tx_bytes;
    if (isPeerConnectedAtRuntime(handshakeSec)) result.connected_peers_count += 1;
  }

  return result;
}
