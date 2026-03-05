import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { useAuth } from "@/hooks/useAuth"
import { Outlet } from "react-router-dom"

function Dashboard() {
  const { user } = useAuth()

  return (
    <DashboardLayout user={user}>
      <Outlet />
    </DashboardLayout>
  )
}

export default Dashboard
