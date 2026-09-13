import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

function initials(name = '') {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('') || '?'
}

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

export function DashboardTeamWorkload({ presence = null }) {
  const members = [...(presence?.members || [])]
    .sort((a, b) => (b.active_tasks || 0) - (a.active_tasks || 0) || (b.hours_this_week || 0) - (a.hours_this_week || 0))
    .slice(0, 5)

  const maxHours = Math.max(...members.map((m) => Number(m.hours_this_week) || 0), 1)

  return (
    <section className="sd-dash-v2__widget">
      <div className="sd-dash-v2__widget-head">
        <h3 className="sd-dash-v2__widget-title">Team Workload</h3>
        <Link to="/workload" className="sd-dash-v2__widget-link">
          View Time →
        </Link>
      </div>
      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Team presence will show capacity once members are on the floor.
        </p>
      ) : (
        <ul className="sd-dash-v2__workload">
          {members.map((m) => {
            const hours = Number(m.hours_this_week) || 0
            const pct = Math.min(100, Math.round((hours / 40) * 100))
            return (
              <li key={m.user_id} className="sd-dash-v2__workload-row">
                <span className="sd-dash-v2__workload-avatar">{initials(m.name)}</span>
                <div className="sd-dash-v2__workload-meta">
                  <strong>{m.name}</strong>
                  <span>
                    {m.active_tasks || 0} tasks · {hours}h this week
                    {m.is_clocked_in ? ' · on duty' : ''}
                  </span>
                  <div className="sd-dash-v2__workload-track">
                    <div
                      className="sd-dash-v2__workload-fill"
                      style={{
                        width: `${Math.max(4, Math.round((hours / maxHours) * 100))}%`,
                        background: pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#22c55e',
                      }}
                    />
                  </div>
                </div>
                <em className="tabular-nums">{pct}%</em>
              </li>
            )
          })}
        </ul>
      )}
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
        <Link to="/ai-studio?section=health" className="sd-dash-v2__widget-link">
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
