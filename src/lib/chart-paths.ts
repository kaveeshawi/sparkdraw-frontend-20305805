export type ChartPoint = { x: number; y: number }

/** Smooth cubic-bezier path through points (Catmull-Rom style). */
export function buildSmoothPath(points: ChartPoint[]): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`

  let d = `M ${points[0].x},${points[0].y}`

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(i + 2, points.length - 1)]

    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6

    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`
  }

  return d
}

export function buildSmoothAreaPath(points: ChartPoint[], baseline: number): string {
  if (points.length === 0) return ''
  const line = buildSmoothPath(points)
  const last = points[points.length - 1]
  const first = points[0]
  return `${line} L ${last.x},${baseline} L ${first.x},${baseline} Z`
}

export const SPARKLINE_UP: ChartPoint[] = [
  { x: 0, y: 20 },
  { x: 8, y: 15 },
  { x: 16, y: 17 },
  { x: 24, y: 9 },
  { x: 32, y: 12 },
  { x: 40, y: 5 },
  { x: 48, y: 7 },
  { x: 56, y: 2 },
]

export const SPARKLINE_DOWN: ChartPoint[] = [
  { x: 0, y: 3 },
  { x: 8, y: 7 },
  { x: 16, y: 5 },
  { x: 24, y: 13 },
  { x: 32, y: 10 },
  { x: 40, y: 17 },
  { x: 48, y: 15 },
  { x: 56, y: 21 },
]

export const MINI_LINE_POINTS: ChartPoint[] = [
  { x: 0, y: 50 },
  { x: 25, y: 42 },
  { x: 50, y: 46 },
  { x: 75, y: 30 },
  { x: 100, y: 36 },
  { x: 125, y: 18 },
  { x: 150, y: 24 },
  { x: 175, y: 12 },
  { x: 200, y: 8 },
]
