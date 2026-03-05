export type ServerStatus = "inactive" | "active";
export type ServerType = "free" | "paid";

export type Server = {
  id: number;
  ip: string;
  country_id: number | null;
  region: string;
  server_type: ServerType;
  ssh_user: string;
  status: ServerStatus;
  wireguard_installed: number;
  ssh_public_key: string;
  created_at: string;
  verified_at: string | null;
  last_error: string | null;
  country?: { id: number; name: string; flag_url: string | null } | null;
};

