import { useState } from "react"

const SERVER_COLORS = [
  "hsl(142, 76%, 36%)",
  "hsl(221, 83%, 53%)",
  "hsl(262, 83%, 58%)",
  "hsl(346, 77%, 50%)",
  "hsl(25, 95%, 53%)",
  "hsl(47, 96%, 53%)",
  "hsl(173, 80%, 40%)",
  "hsl(330, 81%, 60%)",
]

export function getServerColor(serverIndex: number): string {
  return SERVER_COLORS[serverIndex % SERVER_COLORS.length]
}

type Point = { x: number; y: number }

const LEFT = 56
const RIGHT = 16
const TOP = 24
const BOTTOM = 40

function scalePoints(
  points: Point[],
  chartWidth: number,
  chartHeight: number,
  chartLeft: number,
  chartTop: number,
  bounds: { minX: number; maxX: number; maxY: number }
): Point[] {
  if (points.length === 0) return []
  const { minX, maxX, maxY } = bounds
  const rangeX = maxX - minX || 1
  const rangeY = maxY || 1
  return points.map((p) => ({
    x: chartLeft + ((p.x - minX) / rangeX) * chartWidth,
    y: chartTop + chartHeight - (p.y / rangeY) * chartHeight,
  }))
}

function pointsToPath(points: Point[]): string {
  if (points.length === 0) return ""
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
}

const INDIAN_TZ = "Asia/Kolkata"

function formatTime(at: string): string {
  const d = new Date(at)
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: INDIAN_TZ })
}

function formatTimeShort(at: string): string {
  const d = new Date(at)
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: INDIAN_TZ })
}

type Series = {
  label: string
  color: string
  points: { at: string; value: number }[]
}

type LineChartProps = {
  width: number
  height: number
  series: Series[]
  title: string
  /** Label for the vertical (value) axis, e.g. "Peers" or "Bandwidth" */
  yAxisLabel?: string
  /** Label for the horizontal (time) axis */
  xAxisLabel?: string
  /** Format value for axis ticks and tooltip, e.g. (n) => n.toString() or formatBytes */
  formatValue?: (n: number) => string
}

export function LineChart({
  width,
  height,
  series,
  title,
  yAxisLabel,
  xAxisLabel = "Time",
  formatValue = (n) => n.toString(),
}: LineChartProps) {
  const [hovered, setHovered] = useState<{
    seriesIndex: number
    pointIndex: number
    value: number
    at: string
    x: number
    y: number
  } | null>(null)

  const allPoints = series.flatMap((s) => s.points)
  const times = allPoints.map((p) => new Date(p.at).getTime())
  const minT = times.length ? Math.min(...times) : 0
  const maxT = times.length ? Math.max(...times) : 1
  const maxVal = Math.max(1, ...allPoints.map((p) => p.value))
  const bounds = { minX: minT, maxX: maxT, maxY: maxVal }

  const chartWidth = width - LEFT - RIGHT
  const chartHeight = height - TOP - BOTTOM
  const chartLeft = LEFT
  const chartTop = TOP

  const scaled = series.map((s) => ({
    ...s,
    points: scalePoints(
      s.points.map((p) => ({ x: new Date(p.at).getTime(), y: p.value })),
      chartWidth,
      chartHeight,
      chartLeft,
      chartTop,
      bounds
    ),
  }))

  const yLabel = yAxisLabel ?? title

  // Y-axis ticks (value)
  const yTickCount = 5
  const yTicks = Array.from({ length: yTickCount + 1 }, (_, i) => {
    const v = (maxVal * i) / yTickCount
    return { value: v, y: chartTop + chartHeight - (v / maxVal) * chartHeight }
  })

  // X-axis ticks (time)
  const xTickCount = 5
  const xTicks = Array.from({ length: xTickCount + 1 }, (_, i) => {
    const t = minT + ((maxT - minT) * i) / xTickCount
    const at = new Date(t).toISOString()
    return {
      at,
      x: chartLeft + (i / xTickCount) * chartWidth,
    }
  })

  const chartBottom = chartTop + chartHeight

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{title}</div>
      <div className="relative inline-block">
      <svg
        width={width}
        height={height}
        className="overflow-visible"
        aria-label={title}
      >
        <defs>
          <clipPath id={`chart-clip-${title}`}>
            <rect x={chartLeft} y={chartTop} width={chartWidth} height={chartHeight} />
          </clipPath>
          {scaled.map((s, i) => (
            <linearGradient
              key={i}
              id={`line-grad-${title}-${i}`}
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop offset="0%" stopColor={s.color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>

        {/* Left axis: line */}
        <line
          x1={chartLeft}
          y1={chartTop}
          x2={chartLeft}
          y2={chartBottom}
          stroke="currentColor"
          strokeOpacity={0.3}
          strokeWidth={1}
        />
        {/* Left axis: ticks and labels */}
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={chartLeft}
              y1={tick.y}
              x2={chartLeft - 6}
              y2={tick.y}
              stroke="currentColor"
              strokeOpacity={0.4}
              strokeWidth={1}
            />
            <text
              x={chartLeft - 10}
              y={tick.y}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-muted-foreground text-[10px]"
            >
              {formatValue(tick.value)}
            </text>
          </g>
        ))}
        {/* Left axis label (y) */}
        <text
          x={12}
          y={chartTop + chartHeight / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-muted-foreground text-[10px]"
          transform={`rotate(-90, 12, ${chartTop + chartHeight / 2})`}
        >
          {yLabel}
        </text>

        {/* Bottom axis: line */}
        <line
          x1={chartLeft}
          y1={chartBottom}
          x2={chartLeft + chartWidth}
          y2={chartBottom}
          stroke="currentColor"
          strokeOpacity={0.3}
          strokeWidth={1}
        />
        {/* Bottom axis: ticks and labels */}
        {xTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={tick.x}
              y1={chartBottom}
              x2={tick.x}
              y2={chartBottom + 6}
              stroke="currentColor"
              strokeOpacity={0.4}
              strokeWidth={1}
            />
            <text
              x={tick.x}
              y={chartBottom + 20}
              textAnchor="middle"
              className="fill-muted-foreground text-[10px]"
            >
              {formatTimeShort(tick.at)}
            </text>
          </g>
        ))}
        {/* Bottom axis label (x) */}
        <text
          x={chartLeft + chartWidth / 2}
          y={height - 8}
          textAnchor="middle"
          className="fill-muted-foreground text-[10px]"
        >
          {xAxisLabel}
        </text>

        {/* Chart area clip */}
        <g clipPath={`url(#chart-clip-${title})`}>
          {scaled.map((s, i) => {
            if (s.points.length < 2) return null
            const path = pointsToPath(s.points)
            const areaPath =
              path +
              ` L ${s.points[s.points.length - 1].x} ${chartBottom} L ${s.points[0].x} ${chartBottom} Z`
            return (
              <g key={i}>
                <path
                  d={areaPath}
                  fill={`url(#line-grad-${title}-${i})`}
                  stroke="none"
                />
                <path
                  d={path}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            )
          })}
        </g>

        {/* Interactive points */}
        {scaled.map((s, i) =>
          s.points.map((p, j) => {
            const raw = series[i].points[j]
            const isHovered = hovered?.seriesIndex === i && hovered?.pointIndex === j
            return (
              <circle
                key={`${i}-${j}`}
                cx={p.x}
                cy={p.y}
                r={isHovered ? 6 : 4}
                fill={s.color}
                stroke="var(--background)"
                strokeWidth={isHovered ? 2 : 0}
                className="cursor-pointer transition-all"
                style={{ opacity: isHovered ? 1 : 0.85 }}
                onMouseEnter={() =>
                  setHovered({
                    seriesIndex: i,
                    pointIndex: j,
                    value: raw.value,
                    at: raw.at,
                    x: p.x,
                    y: p.y,
                  })
                }
                onMouseLeave={() => setHovered(null)}
              />
            )
          })
        )}
      </svg>
        {/* Hover tooltip */}
        {hovered && (
          <div
            className="absolute z-10 rounded-md border bg-popover px-2 py-1.5 text-xs shadow-md pointer-events-none"
            style={{
              left: Math.min(hovered.x + 12, width - 140),
              top: Math.max(hovered.y - 8, 8),
            }}
          >
            <div className="font-medium text-foreground">
              {formatValue(hovered.value)}
            </div>
            <div className="text-muted-foreground">
              {formatTime(hovered.at)}
            </div>
            <div className="text-muted-foreground mt-0.5">
              {series[hovered.seriesIndex].label}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        {series.map((s, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-muted-foreground">{s.label}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
