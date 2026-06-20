import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconDotsVertical } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { DEMO_PROJECTS, PROJECT_FILTERS } from '../dashboard-demo-data'

const STATUS = {
  on_track: { label: 'On Track', className: 'is-track' },
  at_risk: { label: 'At Risk', className: 'is-risk' },
  on_hold: { label: 'On Hold', className: 'is-hold' },
  completed: { label: 'Completed', className: 'is-done' },
}

function HealthRing({ score }) {
  const pct = Math.min(100, Math.max(0, score)) / 100
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444'
  return (
    <div
      className="sd-dash-v2__health-ring"
      style={{
        background: `conic-gradient(${color} ${pct * 360}deg, #e5e7eb ${pct * 360}deg)`,
      }}
    >
      <span className="sd-dash-v2__health-ring-val">{score}</span>
    </div>
  )
}

function TeamAvatars({ team, extra = 0 }) {
  return (
    <div className="sd-dash-v2__team">
      {team.slice(0, 3).map((initials, i) => (
        <span key={initials + i} className="sd-dash-v2__team-avatar">
          {initials}
        </span>
      ))}
      {extra > 0 && <span className="sd-dash-v2__team-more">+{extra}</span>}
    </div>
  )
}

export default function DashboardProjectsOverview() {
  const [filter, setFilter] = useState('all')

  const rows = useMemo(() => {
    if (filter === 'all') return DEMO_PROJECTS
    if (filter === 'on_hold') return DEMO_PROJECTS.filter((p) => p.status === 'on_hold')
    if (filter === 'completed') return DEMO_PROJECTS.filter((p) => p.status === 'completed')
    return DEMO_PROJECTS.filter((p) => p.status === filter)
  }, [filter])

  return (
    <section className="sd-dash-v2__panel sd-dash-v2__panel--projects">
      <header className="sd-dash-v2__panel-head">
        <div>
          <h2 className="sd-dash-v2__panel-title">Projects Overview</h2>
          <p className="sd-dash-v2__panel-desc">Progress, health & milestones</p>
        </div>
        <Link to="/projects" className="sd-dash-v2__panel-link">
          View all projects →
        </Link>
      </header>

      <div className="sd-dash-v2__filters">
        {PROJECT_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={cn('sd-dash-v2__filter', filter === f.id && 'is-active')}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="sd-dash-v2__table-wrap">
        <table className="sd-dash-v2__table">
          <thead>
            <tr>
              <th>Project</th>
              <th>Client</th>
              <th>Health</th>
              <th>Progress</th>
              <th>Next Milestone</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Team</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.map((project) => {
              const status = STATUS[project.status] || STATUS.on_track
              return (
                <tr key={project.id}>
                  <td>
                    <Link to={`/projects/${project.id}/`} className="sd-dash-v2__project-link">
                      <span
                        className="sd-dash-v2__project-dot"
                        style={{ background: project.color }}
                      />
                      <span>
                        <strong>{project.name}</strong>
                        <em>{project.category}</em>
                      </span>
                    </Link>
                  </td>
                  <td>{project.client}</td>
                  <td>
                    <HealthRing score={project.health} />
                  </td>
                  <td>
                    <div className="sd-dash-v2__progress">
                      <div className="sd-dash-v2__progress-track">
                        <div
                          className="sd-dash-v2__progress-fill"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                      <span>{project.progress}%</span>
                    </div>
                  </td>
                  <td>
                    <span className="sd-dash-v2__milestone-name">{project.milestone}</span>
                    <span className="sd-dash-v2__milestone-meta">
                      {project.tasksLeft} task{project.tasksLeft !== 1 ? 's' : ''} left
                    </span>
                  </td>
                  <td>
                    <span className="sd-dash-v2__due">{project.dueDate}</span>
                    <span
                      className={cn(
                        'sd-dash-v2__due-meta',
                        project.daysTone === 'danger' && 'is-danger',
                        project.daysTone === 'warn' && 'is-warn',
                      )}
                    >
                      {project.daysLabel}
                    </span>
                  </td>
                  <td>
                    <span className={cn('sd-dash-v2__status', status.className)}>
                      {status.label}
                    </span>
                  </td>
                  <td>
                    <TeamAvatars team={project.team} extra={project.extraTeam} />
                  </td>
                  <td>
                    <button type="button" className="sd-dash-v2__row-menu" aria-label="Actions">
                      <IconDotsVertical size={16} stroke={1.75} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
