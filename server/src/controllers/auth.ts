import { fileDb } from "../db";
import { Request, Response } from "express";
import { getUserAuthByUsername, userExists, userCount, createUserQuery } from "../db/query/user";
import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET || "secret";

export async function usersPresent(req: Request, res: Response) {
    const usersCount = userCount().get() as { count: number };
    if (usersCount.count > 0) {
        return res.status(200).json({ message: "Users present", usersAvailable: true });
    } else {
        return res.status(200).json({ message: "No users present", usersAvailable: false });
    }
}

export async function createNewUser(req: Request, res: Response) {
    try {
        const { username, password, name } = req.body;
        const exists = userExists().get(username) as { username: string } | undefined;
        if (exists) {
            return res.status(400).json({ message: "User already exists" });
        } else {
            insertUser(username, password, name);
            const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "10h" });
            return res.status(201).json({ message: "User created successfully", token });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export async function login(req: Request, res: Response) {
    try {
        const username = String(req.body?.username ?? "").trim();
        const password = String(req.body?.password ?? "");

        if (!username || !password) {
            return res.status(400).json({ message: "Username and password are required" });
        }

        const user = getUserAuthByUsername().get(username) as
            | { id: number; username: string; name: string; password: string; created_at: string }
            | undefined;

        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // NOTE: passwords are currently stored as plaintext in DB (existing behavior).
        // If you want, we can upgrade this to hashing (bcrypt/scrypt) with migration support.
        if (user.password !== password) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "10h" });
        return res.status(200).json({
            message: "Login successful",
            token,
            user: { id: user.id, username: user.username, name: user.name, created_at: user.created_at },
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export async function createUser(req: Request, res: Response) {
    try {
        const { username, password, name } = req.body;
        const exists = userExists().get(username) as { username: string };
        if (exists) {
            return res.status(400).json({ message: "User already exists" });
        } else {

        }

        return res.status(201).json({ message: "User created successfully" });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });

    }
}

export async function getUser(req: Request, res: Response) {
    try {
        const userName = req.userName;
        const user = userExists().get(userName) as
            | { id: number; username: string; name: string; created_at: string }
            | undefined;
        if (!user) return res.status(404).json({ message: "User not found" });
        return res.status(200).json({ message: "User fetched successfully", user });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

function insertUser(username: string, password: string, name: string) {
    try {
        createUserQuery().run(username, password, name, new Date().toISOString());
        return true;
    } catch (error) {
        console.error(error);
        throw new Error(error instanceof Error ? error.message : "Internal server error");
    }
}