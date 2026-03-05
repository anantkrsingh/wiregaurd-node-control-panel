import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getPeerStats, type PeerStatsResponse } from "@/utils/stats"
import { LineChart, getServerColor } from "@/components/charts/LineChart"
import { Users, TrendingUp } from "lucide-react"

const CHART_WIDTH = 800
const CHART_HEIGHT = 220

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KiB`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MiB`
  return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GiB`
}

function Home() {
  const [stats, setStats] = useState<PeerStatsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getPeerStats()
      .then((d) => {
        if (!cancelled) setStats(d)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const t = setInterval(() => {
      getPeerStats()
        .then((d) => setStats(d))
        .catch(() => {})
    }, 10_000)
    return () => clearInterval(t)
  }, [])

  const historyPerServer = stats?.history_per_server ?? []

  const peerSeries = useMemo(
    () =>
      historyPerServer.map((s, i) => ({
        label: s.ip,
        color: getServerColor(i),
        points: s.points.map((p) => ({ at: p.at, value: p.peers })),
      })),
    [historyPerServer]
  )

  const bandwidthRxSeries = useMemo(
    () =>
      historyPerServer.map((s, i) => ({
        label: `${s.ip} (↓)`,
        color: getServerColor(i),
        points: s.points.map((p) => ({ at: p.at, value: p.rx })),
      })),
    [historyPerServer]
  )

  const bandwidthTxSeries = useMemo(
    () =>
      historyPerServer.map((s, i) => ({
        label: `${s.ip} (↑)`,
        color: getServerColor(i),
        points: s.points.map((p) => ({ at: p.at, value: p.tx })),
      })),
    [historyPerServer]
  )

  const hasChartData = historyPerServer.some((s) => s.points.length > 0)

  if (loading && !stats) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[200px]">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Home</h1>
        <p className="text-sm text-muted-foreground">
          Connected peers and bandwidth across servers with WireGuard installed.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connected peers</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.connected_peers_now ?? 0}</div>
            <p className="text-xs text-muted-foreground">&lt; 10 min (WG servers)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total received</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats ? formatBytes(stats.total_rx_bytes) : "—"}</div>
            <p className="text-xs text-muted-foreground">All peers, WG servers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats ? formatBytes(stats.total_tx_bytes) : "—"}</div>
            <p className="text-xs text-muted-foreground">All peers, WG servers</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="size-5" />
            Peers over time (last 24h)
          </CardTitle>
          <CardDescription>
            Total peers per server at each time. One line per server. Data every 30s, bucketed by 5 min.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasChartData ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No peer data yet. Add servers, run checkpoints, and mark WireGuard as installed to see the graph.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <LineChart
                width={CHART_WIDTH}
                height={CHART_HEIGHT}
                series={peerSeries}
                title="Peers"
                yAxisLabel="Peers"
                xAxisLabel="Time (IST)"
                formatValue={(n) => Math.round(n).toString()}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bandwidth over time (last 24h)</CardTitle>
          <CardDescription>
            Received (↓) and sent (↑) per server. One line per server. Data every 30s, bucketed by 5 min.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasChartData ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No bandwidth data yet.
            </div>
          ) : (
            <div className="space-y-6 overflow-x-auto">
              <LineChart
                width={CHART_WIDTH}
                height={CHART_HEIGHT}
                series={bandwidthRxSeries}
                title="Received (bytes)"
                yAxisLabel="Bandwidth"
                xAxisLabel="Time (IST)"
                formatValue={formatBytes}
              />
              <LineChart
                width={CHART_WIDTH}
                height={CHART_HEIGHT}
                series={bandwidthTxSeries}
                title="Sent (bytes)"
                yAxisLabel="Bandwidth"
                xAxisLabel="Time (IST)"
                formatValue={formatBytes}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {stats && stats.by_server.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>By server</CardTitle>
            <CardDescription>Latest peer count and bandwidth per WireGuard server.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {stats.by_server.map((s) => (
                <li
                  key={s.server_id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
                >
                  <span className="font-mono text-sm">{s.ip}</span>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>{s.peer_count} peers</span>
                    <span>↓ {formatBytes(s.total_rx_bytes)}</span>
                    <span>↑ {formatBytes(s.total_tx_bytes)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default Home
