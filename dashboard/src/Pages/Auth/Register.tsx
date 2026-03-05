import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createNewUser } from "@/utils/auth"
import { useState } from "react"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"
function Register() {
    const [loading, setLoading] = useState(false);  
    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (loading) return;
        const formData = new FormData(e.target as HTMLFormElement);
        const username = formData.get("username") as string;
        const name = formData.get("name") as string;
        const password = formData.get("password") as string;
        const confirmPassword = formData.get("confirmPassword") as string;
        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }
        setLoading(true);
        try {
            const response = await createNewUser(username, password, name);
            toast.success(response.message);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "An unknown error occurred");
        }finally{
            setLoading(false)
        }
    }
    return (
        <div className="min-h-screen w-full bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle>Create account</CardTitle>
                    <CardDescription>Create a new account to access the dashboard.</CardDescription>
                </CardHeader>

                <CardContent>
                    <form className="space-y-4" onSubmit={handleFormSubmit}>
                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input id="username" name="username" autoComplete="username" placeholder="Choose a username" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" name="name" autoComplete="name" placeholder="Your full name" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="new-password"
                                placeholder="Create a password"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm password</Label>
                            <Input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                autoComplete="new-password"
                                placeholder="Re-enter your password"
                            />
                        </div>

                        <Button type="submit" className="w-full">
                            {loading ? <Spinner /> : "Register"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}

export default Register
