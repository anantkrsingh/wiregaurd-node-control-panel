import * as React from "react"
import { Home, PanelLeftClose, PanelLeftOpen, Server, Globe } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { User } from "@/types/user"
import { useLocation, useNavigate } from "react-router-dom"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function getInitials(name?: string) {
  const cleaned = (name ?? "").trim()
  if (!cleaned) return "U"
  const parts = cleaned.split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? "U"
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : ""
  return (first + last).toUpperCase()
}

export function DashboardLayout({
  user,
  children,
}: {
  user?: User | null
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    try {
      const raw = localStorage.getItem("dashboard.sidebarCollapsed")
      return raw === "true"
    } catch {
      return false
    }
  })
  const location = useLocation()
  const navigate = useNavigate()
  const isHomeActive = location.pathname.startsWith("/dashboard/home")
  const isServersActive = location.pathname.startsWith("/dashboard/servers")
  const isCountriesActive = location.pathname.startsWith("/dashboard/countries")
  React.useEffect(() => {
    try {
      localStorage.setItem("dashboard.sidebarCollapsed", String(collapsed))
    } catch {
      // ignore
    }
  }, [collapsed])

  return (
    <div className="min-h-[calc(100vh)] bg-background text-foreground">
      <div className="flex min-h-screen w-full">
        <aside
          className={cn(
            "border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-in-out",
            collapsed ? "w-16" : "w-64"
          )}
        >
          <div className="flex h-14 items-center justify-between px-3">
            <div className="flex min-w-0 items-center gap-2">
              <img src="/wiregaurd.avif" alt="logo" className="w-10 h-10" />
              <div className={cn("min-w-0", collapsed && "hidden")}>
                <div className="truncate text-sm font-semibold leading-tight">
                  WireGuard
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  Control Panel
                </div>
              </div>
            </div>
          </div>

          <nav className="px-2 py-2">
            <button
              type="button"
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isHomeActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
              )}
              onClick={() => navigate("/dashboard/home")}
              disabled={isHomeActive}
            >
              <Home className="size-4" />
              <span className={cn("truncate", collapsed && "hidden")}>
                Home
              </span>
            </button>

            <button
              type="button"
              className={cn(
                "mt-2 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isServersActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
              )}
              onClick={() => navigate("/dashboard/servers")}
              disabled={isServersActive}
            >
              <Server className="size-4" />
              <span className={cn("truncate", collapsed && "hidden")}>
                Servers
              </span>
            </button>
            <button
              type="button"
              className={cn(
                "mt-2 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isCountriesActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
              )}
              onClick={() => navigate("/dashboard/countries")}
              disabled={isCountriesActive}
            >
              <Globe className="size-4" />
              <span className={cn("truncate", collapsed && "hidden")}>
                Countries
              </span>
            </button>
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 items-center justify-between border-b bg-background px-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                onClick={() => setCollapsed((v) => !v)}
              >
                {collapsed ? (
                  <PanelLeftOpen className="size-4" />
                ) : (
                  <PanelLeftClose className="size-4" />
                )}
              </Button>
              <div className="text-sm font-medium text-foreground">
                Dashboard
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <div className="max-w-56 truncate text-sm font-medium leading-tight">
                  {user?.name ?? "User"}
                </div>
                <div className="max-w-56 truncate text-xs text-muted-foreground">
                  {user?.username ? `@${user.username}` : ""}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div
                    className="grid size-9 select-none place-items-center rounded-full bg-primary text-primary-foreground"
                    aria-label="User avatar"
                    title={user?.name ?? "User"}
                  >
                    <span className="text-xs font-semibold">
                      {getInitials(user?.name)}
                    </span>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuItem>Profile</DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      onClick={() => {
                        localStorage.removeItem("token")
                        navigate("/login")
                      }}
                    >
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>


              </DropdownMenu>

            </div>
          </header>

          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  )
}

