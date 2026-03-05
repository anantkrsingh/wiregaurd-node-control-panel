import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Server } from "@/types/server"
import type { Country } from "@/types/country"
import {
  getServer,
  updateServer,
  runServerCheck,
  verifyServer,
  generateClientConfig,
  deleteServer,
  type CheckpointResult,
} from "@/utils/servers"
import { listCountries } from "@/utils/countries"
import { ArrowLeft, Pencil, Play, CheckCircle2, X, XCircle, Loader2, FileDown, Trash2 } from "lucide-react"

function ServerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [server, setServer] = useState<Server | null>(null)
  const [countries, setCountries] = useState<Country[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [editIp, setEditIp] = useState("")
  const [editCountryId, setEditCountryId] = useState<number | "">("")
  const [editRegion, setEditRegion] = useState("")
  const [editServerType, setEditServerType] = useState<"free" | "paid">("free")
  const [saving, setSaving] = useState(false)
  const [checkResults, setCheckResults] = useState<CheckpointResult[] | null>(null)
  const [runningCheck, setRunningCheck] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const [clientName, setClientName] = useState("")
  const [generating, setGenerating] = useState(false)
  const [configResult, setConfigResult] = useState<{
    config_content: string
    client_name: string
    client_ip: string | null
  } | null>(null)

  const serverId = id != null ? Number(id) : NaN

  useEffect(() => {
    if (!Number.isFinite(serverId)) {
      setLoading(false)
      return
    }
    getServer(serverId)
      .then((d) => {
        setServer(d.server)
        setEditIp(d.server.ip)
        setEditCountryId(d.server.country_id ?? "")
        setEditRegion(d.server.region)
        setEditServerType((d.server.server_type as "free" | "paid") ?? "free")
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Failed to load server")
        setLoading(false)
      })
      .finally(() => setLoading(false))
  }, [serverId])

  useEffect(() => {
    listCountries()
      .then((d) => setCountries(d.countries))
      .catch(() => { })
  }, [])

  async function onSaveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!server || saving || !Number.isFinite(serverId)) return
    const cId = editCountryId === "" ? null : Number(editCountryId)
    if (!editIp.trim()) return toast.error("IP is required")
    if (cId != null && !Number.isFinite(cId)) return toast.error("Select a country")
    if (!editRegion.trim()) return toast.error("Region is required")
    setSaving(true)
    try {
      const res = await updateServer(serverId, {
        ip: editIp.trim(),
        country_id: cId ?? null,
        region: editRegion.trim(),
        server_type: editServerType,
      })
      setServer(res.server)
      setEditOpen(false)
      toast.success(res.message)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed")
    } finally {
      setSaving(false)
    }
  }

  async function onRunCheck() {
    if (!server || runningCheck || !Number.isFinite(serverId)) return
    if (server.status !== "active") {
      toast.error("Server must be verified (active) before running checkpoints.")
      return
    }
    setRunningCheck(true)
    setCheckResults(null)
    try {
      const res = await runServerCheck(serverId)
      setCheckResults(res.checkpoints)
      toast.success("Check completed")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Run check failed")
    } finally {
      setRunningCheck(false)
    }
  }

  async function onVerify() {
    if (!server || verifying || !Number.isFinite(serverId)) return
    setVerifying(true)
    try {
      const res = await verifyServer(serverId)
      setServer(res.server)
      toast.success(res.message)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verification failed")
    } finally {
      setVerifying(false)
    }
  }

  async function onDelete() {
    if (!server || deleting || !Number.isFinite(serverId)) return
    if (!window.confirm("Are you sure you want to delete this server?")) return
    setDeleting(true)
    try {
      const res = await deleteServer(serverId)
      toast.success(res.message)
      navigate("/dashboard/servers")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete server")
      setDeleting(false)
    }
  }

  async function onGenerateConfig(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!server || generating || !Number.isFinite(serverId)) return
    const name = clientName.trim().replace(/[^a-zA-Z0-9_-]/g, "")
    if (!name) {
      toast.error("Enter a client name (letters, numbers, underscore, hyphen)")
      return
    }
    setGenerating(true)
    setConfigResult(null)
    try {
      const res = await generateClientConfig(serverId, name)
      setConfigResult({
        config_content: res.config_content,
        client_name: res.client_name,
        client_ip: res.client_ip,
      })
      toast.success(res.message)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generate config failed")
    } finally {
      setGenerating(false)
    }
  }

  function downloadConfig() {
    if (!configResult) return
    const blob = new Blob([configResult.config_content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${configResult.client_name}.conf`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Config downloaded")
  }

  if (loading || !server) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[200px]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button type="button" variant="ghost" size="icon" onClick={() => navigate("/dashboard/servers")}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold truncate">{server.ip}</h1>
          <p className="text-sm text-muted-foreground">
            {server.country?.name ?? "—"} • {server.region} • {server.server_type}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil className="size-4 mr-2" />
          Edit
        </Button>
        <Button type="button" variant="destructive" onClick={onDelete} disabled={deleting}>
          {deleting ? <Loader2 className="size-4 animate-spin mr-2" /> : <Trash2 className="size-4 mr-2" />}
          Delete
        </Button>
        {server.status === "active" && (server.wireguard_installed ?? 0) ? (
          <Button type="button" onClick={() => { setConfigResult(null); setClientName(""); setConfigOpen(true); }}>
            <FileDown className="size-4 mr-2" />
            Generate client config
          </Button>
        ) : null}
        {server.status !== "active" && (
          <Button type="button" onClick={onVerify} disabled={verifying}>
            {verifying ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            Verify server
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Server details</CardTitle>
          <CardDescription>IP, location, type, and status.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">IP</dt>
              <dd className="font-mono text-sm">{server.ip}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Country</dt>
              <dd className="text-sm">{server.country?.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Region</dt>
              <dd className="text-sm">{server.region}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Server type</dt>
              <dd className="text-sm">{server.server_type}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">SSH status</dt>
              <dd>
                <span
                  className={
                    server.status === "active"
                      ? "text-emerald-600 font-medium"
                      : "text-amber-600 font-medium"
                  }
                >
                  {server.status}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">WireGuard</dt>
              <dd>
                <span
                  className={
                    (server.wireguard_installed ?? 0)
                      ? "text-emerald-600 font-medium"
                      : "text-muted-foreground"
                  }
                >
                  {(server.wireguard_installed ?? 0) ? "active" : "no"}
                </span>
              </dd>
            </div>
            {server.verified_at && (
              <div>
                <dt className="text-xs text-muted-foreground">Verified at</dt>
                <dd className="text-sm">{new Date(server.verified_at).toLocaleString()}</dd>
              </div>
            )}
          </dl>
          {server.last_error && (
            <div className="text-sm text-destructive">
              Last error: <span className="font-mono">{server.last_error}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Checkpoints</CardTitle>
          <CardDescription>
            Run these checks on the server one by one. Server must be verified (active) first.
          </CardDescription>
          <div className="pt-2">
            <Button
              type="button"
              onClick={onRunCheck}
              disabled={runningCheck || server.status !== "active"}
            >
              {runningCheck ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : (
                <Play className="size-4 mr-2" />
              )}
              Run check
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!checkResults ? (
            <p className="text-sm text-muted-foreground">
              Click &quot;Run check&quot; to execute: wg --version, IP forwarding, IPv6 forwarding,
              WireGuard config files, permissions, service status, runtime status.
            </p>
          ) : (
            <ul className="space-y-3">
              {checkResults.map((cp) => (
                <li key={cp.id} className="rounded-lg border p-3">
                  <div className="flex items-start gap-2">
                    {cp.success ? (
                      <CheckCircle2 className="size-5 shrink-0 text-emerald-600 mt-0.5" />
                    ) : (
                      <XCircle className="size-5 shrink-0 text-destructive mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm">{cp.name}</div>
                      <div className="text-xs text-muted-foreground font-mono mt-1 break-all">
                        {cp.command}
                      </div>
                      {(cp.stdout || cp.stderr) && (
                        <pre className="mt-2 text-xs bg-muted/50 rounded p-2 overflow-auto max-h-40 whitespace-pre-wrap break-all">
                          {cp.stdout || cp.stderr}
                        </pre>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {editOpen && (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label="Edit server"
          onKeyDown={(e) => e.key === "Escape" && setEditOpen(false)}
        >
          <div className="fixed inset-0 bg-black/50" onClick={() => setEditOpen(false)} />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Card className="relative w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
              <CardHeader className="pr-12">
                <CardTitle>Edit server</CardTitle>
                <CardDescription>Update IP, country, region, and server type.</CardDescription>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-3 top-3"
                  aria-label="Close"
                  onClick={() => setEditOpen(false)}
                >
                  <X className="size-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={onSaveEdit}>
                  <div className="space-y-2">
                    <Label htmlFor="edit-ip">Server IP</Label>
                    <Input
                      id="edit-ip"
                      value={editIp}
                      onChange={(e) => setEditIp(e.target.value)}
                      placeholder="e.g. 203.0.113.10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-country">Country</Label>
                    <select
                      id="edit-country"
                      value={editCountryId}
                      onChange={(e) =>
                        setEditCountryId(e.target.value === "" ? "" : Number(e.target.value))
                      }
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
                  <div className="space-y-2">
                    <Label htmlFor="edit-region">Region</Label>
                    <Input
                      id="edit-region"
                      value={editRegion}
                      onChange={(e) => setEditRegion(e.target.value)}
                      placeholder="e.g. ap-south-1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-server-type">Server type</Label>
                    <select
                      id="edit-server-type"
                      value={editServerType}
                      onChange={(e) => setEditServerType(e.target.value as "free" | "paid")}
                      className="border-input bg-transparent focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 py-1 text-base shadow-xs outline-none focus-visible:ring-[3px] md:text-sm"
                    >
                      <option value="free">Free</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={saving}>
                      {saving ? "Saving..." : "Save"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {configOpen && (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label="Generate client config"
          onKeyDown={(e) => e.key === "Escape" && setConfigOpen(false)}
        >
          <div className="fixed inset-0 bg-black/50" onClick={() => setConfigOpen(false)} />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Card className="relative w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <CardHeader className="pr-12">
                <CardTitle>Generate client config</CardTitle>
                <CardDescription>
                  Run the add-client script on this server. A WireGuard client config will be created and you can download it. Client name: letters, numbers, underscore, hyphen only.
                </CardDescription>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-3 top-3"
                  aria-label="Close"
                  onClick={() => setConfigOpen(false)}
                >
                  <X className="size-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {!configResult ? (
                  <form className="space-y-4" onSubmit={onGenerateConfig}>
                    <div className="space-y-2">
                      <Label htmlFor="client-name">Client name</Label>
                      <Input
                        id="client-name"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="e.g. laptop or phone_1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={generating}>
                        {generating ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                        Generate config
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setConfigOpen(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Config created: <span className="font-mono">{configResult.client_name}.conf</span>
                      {configResult.client_ip ? (
                        <> • Client IP: <span className="font-mono">{configResult.client_ip}</span></>
                      ) : null}
                    </p>
                    <div className="flex gap-2">
                      <Button type="button" onClick={downloadConfig}>
                        <FileDown className="size-4 mr-2" />
                        Download .conf
                      </Button>
                      <Button type="button" variant="outline" onClick={() => { setConfigResult(null); setClientName(""); }}>
                        New client
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setConfigOpen(false)}>
                        Close
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

export default ServerDetail
