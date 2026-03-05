import { useState, useEffect } from "react";
import { checkUsers, getUser } from "@/utils/auth";
import type { User } from "@/types/user";
import { toast } from "sonner"

export const useAuth = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const token = localStorage.getItem("token");
    const [usersAvailable, setUsersAvailable] = useState(false);
    useEffect(() => {
        const fetchData = async () => {
            try {
                if (!token) {
                    const users = await checkUsers();
                    if (users?.usersAvailable) {
                        setUsersAvailable(true);
                    }
                }
                if (token) {
                    console.log("token", token);
                    const userData = await getUser();
                    setUser(userData.user);
                }
            } catch (error) {
                toast.error(error instanceof Error ? error.message : "An unknown error occurred");
                setError(error instanceof Error ? error.message : "An unknown error occurred");
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [token]);



    return {
        user, loading, error, usersAvailable
    }
}