import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Server } from "@/types/server"
import type { Country } from "@/types/country"
import { createServer, listServers, verifyServer, deleteServer } from "@/utils/servers"
import { listCountries } from "@/utils/countries"
import { X, Trash2 } from "lucide-react"

function Servers() {
  const navigate = useNavigate()
  const [ip, setIp] = useState("")
  const [countryId, setCountryId] = useState<number | "">("")
  const [region, setRegion] = useState("")
  const [serverType, setServerType] = useState<"free" | "paid">("free")
  const [loading, setLoading] = useState(false)
  const [verifyingId, setVerifyingId] = useState<number | null>(null)
  const [servers, setServers] = useState<Server[]>([])
  const [countries, setCountries] = useState<Country[]>([])
  const [createdServer, setCreatedServer] = useState<Server | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const activeCount = useMemo(
    () => servers.filter((s) => s.status === "active").length,
    [servers]
  )

  async function refresh() {
    try {
      const data = await listServers()
      setServers(data.servers)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load servers")
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  useEffect(() => {
    listCountries()
      .then((d) => setCountries(d.countries))
      .catch(() => toast.error("Failed to load countries"))
  }, [])

  async function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (loading) return

    const ipTrim = ip.trim()
    const regionTrim = region.trim()
    const cId = countryId === "" ? null : Number(countryId)
    if (!ipTrim) return toast.error("IP is required")
    if (cId == null || !Number.isFinite(cId)) return toast.error("Country is required")
    if (!regionTrim) return toast.error("Region is required")

    setLoading(true)
    try {
      const res = await createServer(ipTrim, cId, regionTrim, serverType)
      toast.success(res.message)
      setCreatedServer(res.server)
      setIp("")
      setCountryId("")
      setRegion("")
      setServerType("free")
      setAddOpen(false)
      await refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add server")
    } finally {
      setLoading(false)
    }
  }

  async function onVerify(id: number) {
    if (verifyingId) return
    setVerifyingId(id)
    try {
      const res = await verifyServer(id)
      toast.success(res.message)
      if (createdServer?.id === id) setCreatedServer(res.server)
      await refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verification failed")
      await refresh()
    } finally {
      setVerifyingId(null)
    }
  }

  async function copyKey(key: string) {
    try {
      await navigator.clipboard.writeText(key)
      toast.success("SSH public key copied")
    } catch {
      toast.error("Failed to copy")
    }
  }

  async function onDelete(id: number) {
    if (deletingId) return
    if (!window.confirm("Are you sure you want to delete this server?")) return
    setDeletingId(id)
    try {
      const res = await deleteServer(id)
      toast.success(res.message)
      await refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete server")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xl font-semibold">Servers</div>
          <div className="text-sm text-muted-foreground">
            Add a VPS by IP + region, install the generated SSH key, then verify.
            {servers.length ? ` (${activeCount}/${servers.length} active)` : ""}
          </div>
        </div>

        <Button type="button" onClick={() => setAddOpen(true)}>
          Add new server
        </Button>
      </div>

      {addOpen && (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label="Add new server"
          onKeyDown={(e) => {
            if (e.key === "Escape") setAddOpen(false)
          }}
        >
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setAddOpen(false)}
          />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Card className="relative w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
              <CardHeader className="pr-12">
                <CardTitle>Add server</CardTitle>
                <CardDescription>
                  This will generate a dedicated SSH key for the server and store the server as{" "}
                  <span className="font-medium">inactive</span> until verified.
                </CardDescription>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-3 top-3"
                  aria-label="Close"
                  onClick={() => setAddOpen(false)}
                >
                  <X className="size-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={onAdd}>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="ip">Server IP</Label>
                      <Input
                        id="ip"
                        value={ip}
                        onChange={(e) => setIp(e.target.value)}
                        placeholder="e.g. 203.0.113.10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <select
                        id="country"
                        value={countryId}
                        onChange={(e) => setCountryId(e.target.value === "" ? "" : Number(e.target.value))}
                        className="border-input bg-transparent focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 py-1 text-base shadow-xs outline-none focus-visible:ring-[3px] md:text-sm"
                      >
                        <option value="">Select country</option>
                        {countries.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="region">Region</Label>
                      <Input
                        id="region"
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                        placeholder="e.g. ap-south-1 / mumbai"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="server-type">Server type</Label>
                      <select
                        id="server-type"
                        value={serverType}
                        onChange={(e) => setServerType(e.target.value as "free" | "paid")}
                        className="border-input bg-transparent focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 py-1 text-base shadow-xs outline-none focus-visible:ring-[3px] md:text-sm"
                      >
                        <option value="free">Free</option>
                        <option value="paid">Paid</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={loading}>
                      {loading ? "Adding..." : "Add server"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {createdServer && (
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Install SSH key on VPS</CardTitle>
            <CardDescription>
              Add this public key to{" "}
              <span className="font-mono">~/.ssh/authorized_keys</span> on{" "}
              <span className="font-medium">wg-user@{createdServer.ip}</span>
              , then click Verify.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground mb-2">SSH public key</div>
              <pre className="whitespace-pre-wrap break-all text-xs leading-relaxed">
                {createdServer.ssh_public_key}
              </pre>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => copyKey(createdServer.ssh_public_key)}>
                Copy key
              </Button>
              <Button
                type="button"
                onClick={() => onVerify(createdServer.id)}
                disabled={verifyingId === createdServer.id}
              >
                {verifyingId === createdServer.id ? "Verifying..." : "Verify server"}
              </Button>
            </div>
            {createdServer.last_error && (
              <div className="text-sm text-destructive">
                Last error: <span className="font-mono">{createdServer.last_error}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All servers</CardTitle>
          <CardDescription>Manage and verify servers you’ve added.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!servers.length ? (
            <div className="text-sm text-muted-foreground">No servers yet.</div>
          ) : (
            <div className="space-y-2">
              {servers.map((s) => (
                <div
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/dashboard/servers/${s.id}`)}
                  onKeyDown={(e) => e.key === "Enter" && navigate(`/dashboard/servers/${s.id}`)}
                  className="flex flex-col gap-2 rounded-md border p-3 md:flex-row md:items-center md:justify-between cursor-pointer hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {s.ip}
                      {s.country ? (
                        <span className="text-muted-foreground"> — {s.country.name}</span>
                      ) : null}
                      <span className="text-muted-foreground"> ({s.region})</span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {s.server_type} • SSH:{" "}
                      <span className={s.status === "active" ? "text-emerald-600" : "text-amber-600"}>
                        {s.status}
                      </span>
                      {" • WG: "}
                      <span className={(s.wireguard_installed ?? 0) ? "text-emerald-600" : "text-muted-foreground"}>
                        {(s.wireguard_installed ?? 0) ? "active" : "no"}
                      </span>
                      {s.verified_at ? ` • verified: ${new Date(s.verified_at).toLocaleString()}` : ""}
                    </div>
                    {s.last_error ? (
                      <div className="text-xs text-destructive truncate">
                        last error: {s.last_error}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button type="button" variant="outline" onClick={() => copyKey(s.ssh_public_key)}>
                      Copy key
                    </Button>
                    <Button
                      type="button"
                      onClick={() => onVerify(s.id)}
                      disabled={verifyingId === s.id || deletingId === s.id}
                    >
                      {verifyingId === s.id ? "Verifying..." : "Verify"}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => onDelete(s.id)}
                      disabled={deletingId === s.id || verifyingId === s.id}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Servers

