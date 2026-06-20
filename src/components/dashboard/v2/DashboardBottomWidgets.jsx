import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  HEALTH_DISTRIBUTION,
  RISK_ALERTS,
  TEAM_WORKLOAD,
  UPCOMING_MILESTONES,
} from '../dashboard-demo-data'

export function DashboardHealthWidget() {
  let offset = 0
  const gradient = HEALTH_DISTRIBUTION.segments
    .filter((s) => s.count > 0)
    .map((s) => {
      const start = offset
      offset += s.pct
      return `${s.color} ${start}% ${offset}%`
    })
    .join(', ')

  return (
    <section className="sd-dash-v2__widget">
      <h3 className="sd-dash-v2__widget-title">Project Health Distribution</h3>
      <div className="sd-dash-v2__donut-wrap">
        <div
          className="sd-dash-v2__donut"
          style={{ background: gradient ? `conic-gradient(${gradient})` : 'var(--border)' }}
        >
          <div className="sd-dash-v2__donut-hole">
            <strong>{HEALTH_DISTRIBUTION.total}</strong>
            <span>Projects</span>
          </div>
        </div>
        <ul className="sd-dash-v2__donut-legend">
          {HEALTH_DISTRIBUTION.segments.map((s) => (
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
      <ul className="sd-dash-v2__workload">
        {TEAM_WORKLOAD.map((member) => (
          <li key={member.id} className="sd-dash-v2__workload-row">
            <span className="sd-dash-v2__workload-avatar">{member.avatar}</span>
            <div className="sd-dash-v2__workload-info">
              <strong>{member.name}</strong>
              <span>{member.role}</span>
            </div>
            <div className="sd-dash-v2__workload-bar-wrap">
              <div className="sd-dash-v2__workload-bar">
                <div
                  className={cn('sd-dash-v2__workload-fill', member.pct >= 95 && 'is-full')}
                  style={{ width: `${member.pct}%` }}
                />
              </div>
              <span className="sd-dash-v2__workload-pct">{member.pct}%</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function DashboardMilestonesWidget() {
  return (
    <section className="sd-dash-v2__widget">
      <div className="sd-dash-v2__widget-head">
        <h3 className="sd-dash-v2__widget-title">Upcoming Milestones</h3>
        <Link to="/calendar" className="sd-dash-v2__widget-link">
          View calendar →
        </Link>
      </div>
      <ul className="sd-dash-v2__milestones">
        {UPCOMING_MILESTONES.map((m) => (
          <li key={m.id} className="sd-dash-v2__milestone-row">
            <div className="sd-dash-v2__milestone-date">
              <span>{m.month}</span>
              <strong>{m.day}</strong>
            </div>
            <div className="sd-dash-v2__milestone-info">
              <strong>{m.title}</strong>
              <span>{m.project}</span>
            </div>
            <span className="sd-dash-v2__milestone-days">{m.daysLeft} days</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function DashboardRiskAlerts() {
  return (
    <section className="sd-dash-v2__widget">
      <div className="sd-dash-v2__widget-head">
        <h3 className="sd-dash-v2__widget-title">AI Risk Alerts</h3>
        <Link to="/health-scores" className="sd-dash-v2__widget-link">
          View all →
        </Link>
      </div>
      <ul className="sd-dash-v2__alerts">
        {RISK_ALERTS.map((alert) => (
          <li key={alert.id} className="sd-dash-v2__alert">
            <span className={cn('sd-dash-v2__alert-badge', `is-${alert.severity}`)}>
              {alert.severity}
            </span>
            <div className="sd-dash-v2__alert-body">
              <strong>{alert.title}</strong>
              <span>{alert.detail}</span>
              <em>{alert.project}</em>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
