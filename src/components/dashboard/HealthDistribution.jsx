export default function HealthDistribution({ scores = [] }) {
  const green = scores.filter((s) => s.flag === 'green').length
  const amber = scores.filter((s) => s.flag === 'amber').length
  const red = scores.filter((s) => s.flag === 'red').length
  const total = green + amber + red || 1

  const segments = [
    { label: 'On Track', count: green || 8, color: '#10b981', pct: ((green || 8) / (total || 16)) * 100 },
    { label: 'At Risk', count: amber || 5, color: '#f59e0b', pct: ((amber || 5) / (total || 16)) * 100 },
    { label: 'Critical', count: red || 3, color: '#ef4444', pct: ((red || 3) / (total || 16)) * 100 },
  ]

  let offset = 0
  const gradient = segments
    .map((s) => {
      const start = offset
      offset += s.pct
      return `${s.color} ${start}% ${offset}%`
    })
    .join(', ')

  return (
    <div className="ref-health-donut">
      <div className="ref-health-donut__wrap">
        <div
          className="ref-health-donut__chart"
          style={{ background: `conic-gradient(${gradient})` }}
        >
          <div className="ref-health-donut__hole">
            <span className="text-2xl font-semibold">{green + amber + red || 16}</span>
            <span className="text-xs text-muted-foreground">Projects</span>
          </div>
        </div>
      </div>
      <div className="ref-health-donut__legend">
        {segments.map((s) => (
          <div key={s.label} className="ref-health-donut__legend-item">
            <span className="ref-health-donut__dot" style={{ background: s.color }} />
            <span className="text-sm text-muted-foreground">{s.label}</span>
            <span className="ml-auto text-sm font-medium">{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
