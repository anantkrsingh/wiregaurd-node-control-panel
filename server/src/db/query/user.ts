import { fileDb } from "../index";


export const userCount = () => {
    return fileDb.prepare("SELECT COUNT(*) as count FROM users");
}
export const userExists = () => {
    return fileDb.prepare("SELECT id, username, name, created_at FROM users WHERE username = ? ");
}

export const createUserQuery = () => {
    return fileDb.prepare("INSERT INTO users (username, password,name,created_at) VALUES (?, ?,?,?)");
}

export const getUserAuthByUsername = () => {
    return fileDb.prepare("SELECT id, username, name, password, created_at FROM users WHERE username = ? ");
}