import { useRef, useState } from 'react'
import { buildSmoothAreaPath, buildSmoothPath, type ChartPoint } from '@/lib/chart-paths'
import { cn } from '@/lib/utils'

const TREND_WIDTH = 200
const TREND_HEIGHT = 60
const GRID_LINES = 5

export type TrendDatum = { label: string; value: number }

/**
 * Interactive line/area trend chart — crosshair + tooltip on hover (per dataviz
 * interaction rules), recessive grid, and a fade at both edges so the line reads
 * as a continuous trend rather than hard-clipped data. Single-hue by design —
 * each usage is one series, never a rainbow.
 */
export function TrendChart({
  data,
  color = 'var(--primary)',
  gradientId,
  formatValue,
  className,
}: {
  data: TrendDatum[]
  color?: string
  gradientId: string
  formatValue?: (value: number) => string
  className?: string
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const values = data.map((d) => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = (max - min) * 0.25 || Math.max(max * 0.1, 1)
  const yMin = min - pad
  const yMax = max + pad

  const points: ChartPoint[] = data.map((d, i) => ({
    x: (i / (data.length - 1)) * TREND_WIDTH,
    y: TREND_HEIGHT - ((d.value - yMin) / (yMax - yMin)) * TREND_HEIGHT,
  }))

  const linePath = buildSmoothPath(points)
  const areaPath = buildSmoothAreaPath(points, TREND_HEIGHT)

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const relX = ((e.clientX - rect.left) / rect.width) * TREND_WIDTH
    let nearest = 0
    let nearestDist = Infinity
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - relX)
      if (dist < nearestDist) {
        nearestDist = dist
        nearest = i
      }
    })
    setHoverIndex(nearest)
  }

  const hovered = hoverIndex !== null ? points[hoverIndex] : null
  const hoveredDatum = hoverIndex !== null ? data[hoverIndex] : null
  const tooltipLeftPct = hovered
    ? Math.min(85, Math.max(15, (hovered.x / TREND_WIDTH) * 100))
    : 0

  return (
    <div className={cn('ref-trend-chart', className)}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${TREND_WIDTH} ${TREND_HEIGHT}`}
        className="ref-trend-chart__svg"
        preserveAspectRatio="none"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${gradientId}-fade`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="10%" stopColor="white" stopOpacity="1" />
            <stop offset="90%" stopColor="white" stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <mask id={`${gradientId}-mask`}>
            <rect x="0" y="0" width={TREND_WIDTH} height={TREND_HEIGHT} fill={`url(#${gradientId}-fade)`} />
          </mask>
        </defs>

        <g mask={`url(#${gradientId}-mask)`}>
          {Array.from({ length: GRID_LINES }).map((_, i) => {
            const x = (i / (GRID_LINES - 1)) * TREND_WIDTH
            return (
              <line
                key={i}
                x1={x}
                y1={0}
                x2={x}
                y2={TREND_HEIGHT}
                stroke="var(--border)"
                strokeWidth="1"
                opacity="0.6"
              />
            )
          })}
          <path d={areaPath} fill={`url(#${gradientId})`} />
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {hovered && (
          <>
            <line
              x1={hovered.x}
              y1={0}
              x2={hovered.x}
              y2={TREND_HEIGHT}
              stroke={color}
              strokeWidth="1"
              strokeDasharray="2,2"
              opacity="0.55"
            />
            <circle cx={hovered.x} cy={hovered.y} r="3.5" fill={color} stroke="var(--card)" strokeWidth="1.5" />
          </>
        )}
      </svg>

      {hovered && hoveredDatum && (
        <div className="ref-trend-chart__tooltip" style={{ left: `${tooltipLeftPct}%` }}>
          <p className="ref-trend-chart__tooltip-label">{hoveredDatum.label}</p>
          <p className="ref-trend-chart__tooltip-value">
            {formatValue ? formatValue(hoveredDatum.value) : hoveredDatum.value}
          </p>
        </div>
      )}
    </div>
  )
}
