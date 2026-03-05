import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from '../Pages/Auth/Login'
import Register from '../Pages/Auth/Register'
import { useAuth } from '../hooks/useAuth'
import { Spinner } from "@/components/ui/spinner"
import { Toaster } from "@/components/ui/sonner"
import Dashboard from '../Pages/Dashboard/Dashboard'
import Home from '../Pages/Dashboard/Home'
import Servers from '../Pages/Dashboard/Servers'
import ServerDetail from '../Pages/Dashboard/ServerDetail'
import Countries from '../Pages/Dashboard/Countries'
function AppRouter() {
    const { loading, usersAvailable, user } = useAuth();
    const token = localStorage.getItem("token");
    return (
        <BrowserRouter>
            <Toaster />

            {!loading ? <Routes>
                <Route path="/" element={<Navigate to="/dashboard/home" replace />} />
                <Route path="/login" element={!usersAvailable && !token ? <Navigate to="/register" /> : user ? <Navigate to="/dashboard" /> : <Login />} />
                <Route path="/register" element={!usersAvailable && !token ? <Register /> : <Navigate to="/login" />} />
                <Route path="/dashboard/*" element={!token ? <Navigate to="/login" /> : <Dashboard />}>
                    <Route index element={<Navigate to="home" replace />} />
                    <Route path="home" element={<Home />} />
                    <Route path="servers" element={<Servers />} />
                    <Route path="servers/:id" element={<ServerDetail />} />
                    <Route path="countries" element={<Countries />} />
                </Route>
            </Routes> : <div className='flex items-center justify-center h-screen'>
                <Spinner />
            </div>}
        </BrowserRouter>
    )
}

export default AppRouter
