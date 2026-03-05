import api from "@/api/axios";
import { AxiosError } from "axios";
import type { Server } from "@/types/server";

export async function listServers() {
  try {
    const response = await api.get<{ servers: Server[] }>("/servers");
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new Error(error.response?.data?.message || "No Response from server");
    }
    throw new Error("Network Error");
  }
}

export async function createServer(
  ip: string,
  countryId: number,
  region: string,
  serverType: "free" | "paid"
) {
  try {
    const response = await api.post<{
      message: string;
      server: Server;
    }>("/servers", { ip, country_id: countryId, region, server_type: serverType });
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new Error(error.response?.data?.message || "No Response from server");
    }
    throw new Error("Network Error");
  }
}

export async function getServer(id: number) {
  try {
    const response = await api.get<{ server: Server }>(`/servers/${id}`);
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new Error(error.response?.data?.message || "No Response from server");
    }
    throw new Error("Network Error");
  }
}

export type ServerUpdatePayload = {
  ip: string;
  country_id: number | null;
  region: string;
  server_type: "free" | "paid";
};

export async function updateServer(id: number, payload: ServerUpdatePayload) {
  try {
    const response = await api.patch<{ message: string; server: Server }>(
      `/servers/${id}`,
      payload
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new Error(error.response?.data?.message || "No Response from server");
    }
    throw new Error("Network Error");
  }
}

export type CheckpointResult = {
  id: string;
  name: string;
  command: string;
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode?: number;
};

export async function runServerCheck(id: number) {
  try {
    const response = await api.post<{ checkpoints: CheckpointResult[] }>(
      `/servers/${id}/run-check`
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new Error(error.response?.data?.message || "No Response from server");
    }
    throw new Error("Network Error");
  }
}

export async function verifyServer(id: number) {
  try {
    const response = await api.post<{
      message: string;
      server: Server;
      error?: string;
    }>(`/servers/${id}/verify`);
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new Error(
        error.response?.data?.error ||
        error.response?.data?.message ||
        "No Response from server"
      );
    }
    throw new Error("Network Error");
  }
}

export type GenerateClientConfigResponse = {
  message: string;
  config_content: string;
  client_name: string;
  client_ip: string | null;
};

export async function generateClientConfig(
  id: number,
  clientName: string
): Promise<GenerateClientConfigResponse> {
  try {
    const response = await api.post<GenerateClientConfigResponse>(
      `/servers/${id}/generate-client-config`,
      { client_name: clientName }
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new Error(
        error.response?.data?.error ||
          error.response?.data?.message ||
          "No Response from server"
      );
    }
    throw new Error("Network Error");
  }
}

export async function deleteServer(id: number) {
  try {
    const response = await api.delete<{ message: string }>(`/servers/${id}`);
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new Error(error.response?.data?.message || "No Response from server");
    }
    throw new Error("Network Error");
  }
}