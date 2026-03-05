import api from "@/api/axios";
import { AxiosError } from "axios";
import type { User } from "@/types/user";

export const getUser = async () => {
    try {
        const response = await api.get<{ user: User, message: string }>("/auth/get-user");
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError) {
            throw new Error(error.response?.data?.message || "No Response from server");
        }
        console.error(error);
        throw new Error("Network Error");
    }
}

export const checkUsers = async () => {
    try {
        const response = await api.get<{ message: string, usersAvailable: boolean }>("/auth/users-available");
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError) {
            throw new Error(error.response?.data?.message || "No Response from server");
        }
        console.error(error);
        throw new Error("Network Error");
    }
}


export const createNewUser = async (username: string, password: string, name: string) => {
    try {
        const response = await api.post<{ message: string,token:string }>("/auth/create-new-user", { username, password, name });
        localStorage.setItem("token", response.data.token);
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError) {
            throw new Error(error.response?.data?.message || "No Response from server");
        }
        console.error(error);
        throw new Error("Network Error");
    }
}

export const login = async (username: string, password: string) => {
    try {
        const response = await api.post<{ message: string, token: string }>("/auth/login", { username, password });
        localStorage.setItem("token", response.data.token);
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError) {
            throw new Error(error.response?.data?.message || "No Response from server");
        }
        console.error(error);
        throw new Error("Network Error");
    }
}