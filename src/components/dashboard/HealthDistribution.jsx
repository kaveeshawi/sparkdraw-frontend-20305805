export default function HealthDistribution({ scores = [] }) {
  const green = scores.filter((s) => s.flag === 'green').length
  const amber = scores.filter((s) => s.flag === 'amber').length
  const red = scores.filter((s) => s.flag === 'red').length
  const total = green + amber + red

  if (total === 0) {
    return (
      <div className="ref-health-donut">
        <div className="ref-health-donut__wrap">
          <div className="ref-health-donut__chart" style={{ background: 'var(--border)' }}>
            <div className="ref-health-donut__hole">
              <span className="text-2xl font-semibold">0</span>
              <span className="text-xs text-muted-foreground">Projects</span>
            </div>
          </div>
        </div>
        <div className="ref-health-donut__legend">
          <p className="text-sm text-muted-foreground">
            Insufficient events — no scored projects for this agency yet.
          </p>
        </div>
      </div>
    )
  }

  const segments = [
    { label: 'On Track', count: green, color: '#10b981', pct: (green / total) * 100 },
    { label: 'At Risk', count: amber, color: '#f59e0b', pct: (amber / total) * 100 },
    { label: 'Critical', count: red, color: '#ef4444', pct: (red / total) * 100 },
  ].filter((s) => s.count > 0)

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
            <span className="text-2xl font-semibold">{total}</span>
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
