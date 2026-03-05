/**
 * Python script template for add_wg_client.py.
 * Uses DNS 8.8.8.8, subnet 10.10.0.0/24 (server 10.10.0.1).
 * Adds peer to running wg and appends [Peer] to /etc/wireguard/wg0.conf.
 */
export function getAddWgClientScript(opts: {
    serverPublicIp: string;
    serverPort?: number;
    serverSubnet?: string;
    serverIp?: string;
    dns?: string;

}): string {
    const {
        serverPublicIp,
        serverPort = 51820,
        serverSubnet = "10.0.0.0/24",
        serverIp = "10.0.0.1",
        dns = "1.1.1.1",

    } = opts;

    return `#!/usr/bin/env python3

import subprocess
import sys
import ipaddress
from pathlib import Path

WG_INTERFACE = "wg0"
WG_DIR = Path("/etc/wireguard")
SERVER_PUBLIC_IP = "${serverPublicIp.replace(/"/g, '\\"')}"
SERVER_PORT = ${serverPort}
SERVER_SUBNET = ipaddress.ip_network("${serverSubnet.replace(/"/g, '\\"')}")
SERVER_IP = "${serverIp.replace(/"/g, '\\"')}"
DNS = "${dns.replace(/"/g, '\\"')}"


def run(cmd, input=None):
    return subprocess.check_output(
        cmd,
        input=input,
        text=True
    ).strip()

def gen_keypair():
    private = run(["wg", "genkey"])
    public = run(["wg", "pubkey"], input=private)
    return private, public

def used_ips():
    output = run(["wg", "show", WG_INTERFACE, "allowed-ips"])
    used = set()
    for line in output.splitlines():
        parts = line.split()
        if len(parts) > 1:
            ip = parts[1].split("/")[0]
            used.add(ip)
    return used

def next_available_ip():
    used = used_ips()
    for ip in SERVER_SUBNET.hosts():
        if str(ip) == SERVER_IP:
            continue
        if str(ip) not in used:
            return str(ip)
    raise RuntimeError("No free IPs left")

def server_public_key():
    return run(["wg", "show", WG_INTERFACE, "public-key"])

def add_peer(pubkey, ip):
    run([
        "wg", "set", WG_INTERFACE,
        "peer", pubkey,
        "allowed-ips", f"{ip}/32"
    ])

def append_peer_to_conf(pubkey, ip):
    """Append [Peer] block to /etc/wireguard/wg0.conf so config persists across reboots."""
    block = f"""
[Peer]
PublicKey = {pubkey}
AllowedIPs = {ip}/32
"""
    conf_path = WG_DIR / f"{WG_INTERFACE}.conf"
    with open(conf_path, "a") as f:
        f.write(block)

def save_client_config(name, privkey, client_ip, server_pubkey):
    config = f"""[Interface]
PrivateKey = {privkey}
Address = {client_ip}/32

[Peer]
PublicKey = {server_pubkey}
Endpoint = {SERVER_PUBLIC_IP}:{SERVER_PORT}
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 30
"""
    path = WG_DIR / f"{name}.conf"
    path.write_text(config)
    path.chmod(0o600)
    return path

def main():
    if len(sys.argv) != 2:
        print("Usage: sudo python3 add_wg_client.py <client_name>")
        sys.exit(1)

    name = sys.argv[1]

    priv, pub = gen_keypair()
    ip = next_available_ip()
    server_pub = server_public_key()

    add_peer(pub, ip)
    append_peer_to_conf(pub, ip)
    cfg = save_client_config(name, priv, ip, server_pub)

    print("Client created successfully\\n")
    print(f"Name: {name}")
    print(f"IP: {ip}")
    print(f"Config: {cfg}")

if __name__ == "__main__":
    main()
`;
}
