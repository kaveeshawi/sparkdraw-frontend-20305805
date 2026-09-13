import { useEffect, useMemo, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { tasksApi } from '../../services/api'

const FALLBACK_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#a855f7', '#f97316']

function weekRange() {
  const now = new Date()
  const day = now.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const from = new Date(now)
  from.setDate(now.getDate() + mondayOffset)
  const to = new Date(from)
  to.setDate(from.getDate() + 6)

  const key = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  return { from: key(from), to: key(to) }
}

function formatHours(hours) {
  const n = Number(hours) || 0
  if (Number.isInteger(n)) return `${n}h`
  return `${n.toFixed(1)}h`
}

function dayLabel(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`)
  return d.toLocaleDateString('en-GB', { weekday: 'short' })
}

function ProjectDonut({ segments, totalHours }) {
  if (!totalHours) {
    return (
      <div className="sd-team-donut sd-team-donut--empty sd-tasks-prod__donut" aria-hidden>
        <span>0h</span>
      </div>
    )
  }

  let cursor = 0
  const stops = segments
    .map((s) => {
      const start = cursor
      const end = cursor + (s.hours / totalHours) * 100
      cursor = end
      return `${s.color} ${start}% ${end}%`
    })
    .join(', ')

  return (
    <div
      className="sd-team-donut sd-tasks-prod__donut"
      style={{ background: `conic-gradient(${stops})` }}
      aria-hidden
    >
      <div className="sd-team-donut__hole">
        <strong>{formatHours(totalHours)}</strong>
        <span>Logged</span>
      </div>
    </div>
  )
}

export default function TasksProductivityPanel({ refreshKey = 0 }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const { from, to } = weekRange()
    setLoading(true)
    setError(false)
    tasksApi
      .productivity({ from, to })
      .then((res) => setData(res.data.data || null))
      .catch(() => {
        setError(true)
        setData(null)
      })
      .finally(() => setLoading(false))
  }, [refreshKey])

  const byDay = data?.by_day || []
  const byProject = useMemo(() => {
    const rows = data?.by_project || []
    return rows.map((row, i) => ({
      ...row,
      color: row.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
    }))
  }, [data])

  const maxDayHours = Math.max(1, ...byDay.map((d) => Number(d.hours) || 0))
  const totalHours = Number(data?.totals?.hours) || 0
  const totalActive = Number(data?.totals?.active_tasks) || 0

  const periodLabel = useMemo(() => {
    if (!data?.from || !data?.to) return 'This week'
    const opts = { month: 'short', day: 'numeric' }
    const from = new Date(`${data.from}T00:00:00`)
    const to = new Date(`${data.to}T00:00:00`)
    return `${from.toLocaleDateString('en-GB', opts)} – ${to.toLocaleDateString('en-GB', opts)}`
  }, [data])

  return (
    <section className="sd-tasks-prod">
      <header className="sd-tasks-prod__head">
        <div>
          <h2 className="sd-tasks-prod__title">Productivity</h2>
          <p className="sd-tasks-prod__sub">Hours logged by project · {periodLabel}</p>
        </div>
        <div className="sd-tasks-prod__totals">
          <span>
            <strong>{formatHours(totalHours)}</strong> logged
          </span>
          <span>
            <strong>{totalActive}</strong> active tasks
          </span>
        </div>
      </header>

      {loading ? (
        <div className="sd-tasks-prod__body">
          <Skeleton className="h-36 w-full rounded-xl" />
          <Skeleton className="h-36 w-full rounded-xl" />
        </div>
      ) : error ? (
        <div className="sd-card px-6 py-10 text-center text-sm text-muted-foreground">
          Could not load productivity summary.
        </div>
      ) : (
        <div className="sd-tasks-prod__body">
          <div className="sd-card sd-tasks-prod__chart-card">
            <p className="sd-tasks-prod__card-label">Daily hours</p>
            <div className="sd-tasks-prod__bars" role="img" aria-label="Hours logged per day this week">
              {byDay.map((day) => {
                const h = Number(day.hours) || 0
                const pct = Math.max(h > 0 ? 8 : 0, Math.round((h / maxDayHours) * 100))
                return (
                  <div key={day.date} className="sd-tasks-prod__bar-col">
                    <span className="sd-tasks-prod__bar-value">{h > 0 ? formatHours(h) : ''}</span>
                    <div className="sd-tasks-prod__bar-track">
                      <div className="sd-tasks-prod__bar-fill" style={{ height: `${pct}%` }} />
                    </div>
                    <span className="sd-tasks-prod__bar-label">{dayLabel(day.date)}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="sd-card sd-tasks-prod__breakdown">
            <p className="sd-tasks-prod__card-label">By project</p>
            <div className="sd-tasks-prod__breakdown-inner">
              <div className="sd-tasks-prod__table">
                {byProject.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    No hours logged this week yet.
                  </p>
                ) : (
                  byProject.map((row) => (
                    <div key={row.project_id} className="sd-tasks-prod__row">
                      <span
                        className="sd-tasks-row__dot"
                        style={{ background: row.color }}
                      />
                      <div className="sd-tasks-prod__row-body">
                        <strong>{row.name}</strong>
                        <span>{row.active_tasks} active</span>
                      </div>
                      <span className="sd-tasks-prod__row-hours">{formatHours(row.hours)}</span>
                    </div>
                  ))
                )}
              </div>
              <ProjectDonut segments={byProject} totalHours={totalHours} />
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
