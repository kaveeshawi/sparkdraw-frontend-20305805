import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export function DashboardHealthWidget({ health = null, loading = false }) {
  const green = Number(health?.green_count || 0)
  const amber = Number(health?.amber_count || 0)
  const red = Number(health?.red_count || 0)
  const total = green + amber + red

  const segments = [
    { label: 'On Track', count: green, color: '#10b981' },
    { label: 'At Risk', count: amber, color: '#f59e0b' },
    { label: 'Critical', count: red, color: '#ef4444' },
  ]
    .map((s) => ({ ...s, pct: total ? Math.round((s.count / total) * 100) : 0 }))
    .filter((s) => s.count > 0)

  let offset = 0
  const gradient = segments
    .map((s) => {
      const start = offset
      offset += s.pct
      return `${s.color} ${start}% ${offset}%`
    })
    .join(', ')

  return (
    <section className="sd-dash-v2__widget">
      <h3 className="sd-dash-v2__widget-title">Project Health Distribution</h3>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading health…</p>
      ) : total === 0 ? (
        <p className="text-sm text-muted-foreground">
          Insufficient events — no C3 scores for this agency yet. Open Health to recompute.
        </p>
      ) : (
        <div className="sd-dash-v2__donut-wrap">
          <div
            className="sd-dash-v2__donut"
            style={{ background: gradient ? `conic-gradient(${gradient})` : 'var(--border)' }}
          >
            <div className="sd-dash-v2__donut-hole">
              <strong>{total}</strong>
              <span>Projects</span>
            </div>
          </div>
          <ul className="sd-dash-v2__donut-legend">
            {segments.map((s) => (
              <li key={s.label}>
                <span className="sd-dash-v2__donut-dot" style={{ background: s.color }} />
                <span>{s.label}</span>
                <em>
                  {s.count}
                  {s.pct > 0 ? `, ${s.pct}%` : ''}
                </em>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

export function DashboardTeamWorkload() {
  return (
    <section className="sd-dash-v2__widget">
      <div className="sd-dash-v2__widget-head">
        <h3 className="sd-dash-v2__widget-title">Team Workload</h3>
        <Link to="/team" className="sd-dash-v2__widget-link">
          View team →
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">
        Insufficient events — workload will appear when capacity data is connected.
      </p>
    </section>
  )
}

export function DashboardMilestonesWidget({ projects = [] }) {
  const upcoming = projects
    .filter((p) => p.milestone && p.dueDate && p.dueDate !== '—')
    .slice(0, 4)

  return (
    <section className="sd-dash-v2__widget">
      <div className="sd-dash-v2__widget-head">
        <h3 className="sd-dash-v2__widget-title">Upcoming Milestones</h3>
        <Link to="/calendar" className="sd-dash-v2__widget-link">
          View calendar →
        </Link>
      </div>
      {upcoming.length === 0 ? (
        <p className="text-sm text-muted-foreground">No upcoming milestones.</p>
      ) : (
        <ul className="sd-dash-v2__milestones">
          {upcoming.map((m) => (
            <li key={m.id} className="sd-dash-v2__milestone-row">
              <div className="sd-dash-v2__milestone-date">
                <span>{String(m.dueDate).split(' ')[0]}</span>
                <strong>{String(m.dueDate).split(' ')[1] || ''}</strong>
              </div>
              <div className="sd-dash-v2__milestone-info">
                <strong>{m.milestone}</strong>
                <span>{m.name}</span>
              </div>
              <span className="sd-dash-v2__milestone-days">{m.daysLabel}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function DashboardRiskAlerts({ health = null }) {
  const alerts = health?.at_risk_projects || []

  return (
    <section className="sd-dash-v2__widget">
      <div className="sd-dash-v2__widget-head">
        <h3 className="sd-dash-v2__widget-title">AI Risk Alerts</h3>
        <Link to="/health-scores" className="sd-dash-v2__widget-link">
          View all →
        </Link>
      </div>
      {alerts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No at-risk projects right now.</p>
      ) : (
        <ul className="sd-dash-v2__alerts">
          {alerts.map((alert) => (
            <li key={alert.id} className="sd-dash-v2__alert">
              <span className={cn('sd-dash-v2__alert-badge', `is-${alert.flag}`)}>
                {alert.flag}
              </span>
              <div className="sd-dash-v2__alert-body">
                <strong>{alert.name}</strong>
                <span>Health score {alert.score}</span>
                <em>C3 agency health</em>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
