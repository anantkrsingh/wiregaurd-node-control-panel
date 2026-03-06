import { fileDb } from "../index";

export type ClientConfigRow = {
    id: number;
    server_id: number;
    client_name: string;
    client_ip: string | null;
    config_content: string;
    created_at: string;
};

export const getClientConfigStmt = () => {
    return fileDb.prepare(
        "SELECT * FROM client_configs WHERE server_id = ? AND client_name = ?"
    );
};

export const insertClientConfigStmt = () => {
    return fileDb.prepare(
        `INSERT INTO client_configs (server_id, client_name, client_ip, config_content) 
     VALUES (?, ?, ?, ?)
     ON CONFLICT(server_id, client_name) 
     DO UPDATE SET client_ip = excluded.client_ip, config_content = excluded.config_content`
    );
};
