import { useEffect, useMemo, useState } from 'react'
import { IconFlag, IconRefresh } from '@tabler/icons-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendChart } from '@/components/dashboard/TrendChart'
import { cn } from '@/lib/utils'
import { portalApi } from '../../services/api'

const STATUS_VARIANT = {
  completed: 'success',
  active: 'default',
  pending: 'outline',
  on_hold: 'warning',
  started: 'default',
  not_started: 'outline',
}

function formatDate(value) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function DonutChart({ value, size = 132, stroke = 12 }) {
  const pct = Math.min(100, Math.max(0, value || 0))
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c

  return (
    <div className="sd-portal-donut" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="sd-portal-donut__label">
        <span className="sd-portal-donut__value">{pct}%</span>
        <span className="sd-portal-donut__hint">complete</span>
      </div>
    </div>
  )
}

function StatusMix({ items }) {
  const total = items.reduce((sum, i) => sum + i.value, 0) || 1
  return (
    <div className="space-y-3">
      <div className="sd-portal-mix">
        {items.map((item) =>
          item.value > 0 ? (
            <div
              key={item.key}
              className="sd-portal-mix__seg"
              style={{
                width: `${(item.value / total) * 100}%`,
                background: item.color,
              }}
              title={`${item.label}: ${item.value}`}
            />
          ) : null
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {items.map((item) => (
          <div key={item.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2 rounded-full" style={{ background: item.color }} />
            {item.label}
            <span className="font-medium text-foreground">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function MilestoneBars({ milestones }) {
  if (!milestones.length) {
    return <p className="text-sm text-muted-foreground">No milestones published yet.</p>
  }

  const max = Math.max(...milestones.map((m) => m.progress || 0), 1)

  return (
    <div className="sd-portal-bars">
      {milestones.map((m) => {
        const pct = Math.min(100, Math.max(0, m.progress || 0))
        return (
          <div key={m.id} className="sd-portal-bars__row">
            <div className="sd-portal-bars__meta">
              <p className="truncate text-xs font-medium">{m.title}</p>
              <span className="text-[11px] text-muted-foreground">{pct}%</span>
            </div>
            <div className="sd-portal-bars__track">
              <div
                className={cn(
                  'sd-portal-bars__fill',
                  m.status === 'completed' && 'is-done',
                  m.status === 'active' && 'is-active'
                )}
                style={{ width: `${(pct / max) * 100}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MilestoneRow({ milestone }) {
  const pct = Math.min(100, Math.max(0, milestone.progress || 0))
  return (
    <div className="border-b border-border py-3 last:border-0">
      <div className="mb-2 flex items-start justify-between gap-3">
        <p className="text-sm font-medium">{milestone.title}</p>
        <div className="flex shrink-0 items-center gap-2">
          {milestone.due_date ? (
            <span className="text-xs text-muted-foreground">Due {formatDate(milestone.due_date)}</span>
          ) : null}
          <Badge variant={STATUS_VARIANT[milestone.status] || 'outline'} className="capitalize">
            {milestone.status}
          </Badge>
        </div>
      </div>
      <div className="sd-portal-progress">
        <div className="sd-portal-progress__fill" style={{ width: `${pct}%` }} />
      </div>
      {typeof milestone.task_total === 'number' ? (
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          {milestone.task_done || 0}/{milestone.task_total} tasks done
        </p>
      ) : null}
    </div>
  )
}

export default function ProgressView({ slug, projectId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchProgress = () => {
    if (!slug || !projectId) {
      setData(null)
      setLoading(false)
      setError(false)
      return
    }
    setLoading(true)
    setError(false)
    portalApi
      .getProgress(slug, projectId)
      .then((res) => setData(res.data.data || res.data))
      .catch(() => {
        setData(null)
        setError(true)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchProgress() }, [slug, projectId])

  const project = data?.project || {}
  const milestones = data?.milestones || []
  const stats = data?.stats || {}
  const pct = project.progress_percent ?? 0

  const milestoneMix = useMemo(() => {
    const m = stats.milestones || {}
    return [
      { key: 'completed', label: 'Completed', value: m.completed || 0, color: '#10b981' },
      { key: 'active', label: 'In progress', value: m.active || 0, color: 'var(--primary)' },
      { key: 'pending', label: 'Upcoming', value: m.pending || 0, color: '#cbd5e1' },
    ]
  }, [stats])

  const taskMix = useMemo(() => {
    const t = stats.tasks || {}
    return [
      { key: 'done', label: 'Done', value: t.done || 0, color: '#10b981' },
      { key: 'in_progress', label: 'In progress', value: t.in_progress || 0, color: 'var(--primary)' },
      { key: 'todo', label: 'To do', value: t.todo || 0, color: '#94a3b8' },
      { key: 'blocked', label: 'Blocked', value: t.blocked || 0, color: '#ef4444' },
      { key: 'other', label: 'Other', value: t.other || 0, color: '#e2e8f0' },
    ]
  }, [stats])

  const trendData = useMemo(() => {
    if (!milestones.length) return []
    return milestones.map((m, i) => {
      const avg =
        milestones.slice(0, i + 1).reduce((s, x) => s + (x.progress || 0), 0) / (i + 1)
      return {
        label: m.title,
        value: Math.round(avg),
      }
    })
  }, [milestones])

  if (!projectId) {
    return (
      <div className="sd-page sd-page--team">
        <div className="sd-card p-8 text-center">
          <IconFlag size={22} stroke={1.5} className="mx-auto text-muted-foreground" />
          <p className="mt-2 text-sm font-medium">No project linked yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            When your agency assigns a project to your account, progress will show here.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="sd-page sd-page--team space-y-3">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="sd-page sd-page--team">
        <div className="sd-card flex flex-col items-center gap-3 p-8 text-center">
          <p className="text-sm font-medium">Couldn’t load progress</p>
          <Button type="button" variant="secondary" onClick={fetchProgress}>
            <IconRefresh size={14} />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  const taskTotal = stats.tasks?.total || 0
  const doneCount = stats.milestones?.completed || milestones.filter((m) => m.status === 'completed').length

  return (
    <div className="sd-page sd-page--team space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold tracking-tight">
          {project.name || 'Project overview'}
        </h2>
        {project.status ? (
          <Badge variant={STATUS_VARIANT[project.status] || 'outline'} className="capitalize">
            {String(project.status).replace(/_/g, ' ')}
          </Badge>
        ) : null}
        {project.start_date && project.end_date ? (
          <span className="text-xs text-muted-foreground">
            {formatDate(project.start_date)} – {formatDate(project.end_date)}
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="sd-card p-4">
          <p className="text-xs text-muted-foreground">Overall progress</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{pct}%</p>
        </div>
        <div className="sd-card p-4">
          <p className="text-xs text-muted-foreground">Milestones done</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">
            {doneCount}
            <span className="text-sm font-medium text-muted-foreground">
              /{milestones.length}
            </span>
          </p>
        </div>
        <div className="sd-card p-4">
          <p className="text-xs text-muted-foreground">Tasks complete</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">
            {stats.tasks?.done || 0}
            <span className="text-sm font-medium text-muted-foreground">/{taskTotal}</span>
          </p>
        </div>
        <div className="sd-card p-4">
          <p className="text-xs text-muted-foreground">Status</p>
          <p className="mt-1 text-lg font-semibold capitalize tracking-tight">
            {String(project.status || '—').replace(/_/g, ' ')}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="sd-card p-5">
          <h3 className="sd-card-title mb-1">Completion</h3>
          <p className="sd-card-desc mb-4">How far this project has progressed overall.</p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <DonutChart value={pct} />
            <div className="min-w-[10rem] flex-1 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Milestone mix</p>
              <StatusMix items={milestoneMix} />
            </div>
          </div>
        </section>

        <section className="sd-card p-5">
          <h3 className="sd-card-title mb-1">Task breakdown</h3>
          <p className="sd-card-desc mb-4">Current work state across the project board.</p>
          {taskTotal === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks published yet.</p>
          ) : (
            <StatusMix items={taskMix} />
          )}
          {trendData.length > 1 ? (
            <div className="mt-5">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Progress trend by milestone</p>
              <TrendChart
                data={trendData}
                gradientId={`portal-progress-${projectId}`}
                formatValue={(v) => `${v}%`}
                className="h-20"
              />
            </div>
          ) : null}
        </section>
      </div>

      <section className="sd-card p-5">
        <h3 className="sd-card-title mb-1">Milestone progress</h3>
        <p className="sd-card-desc mb-4">Visual comparison of each milestone.</p>
        <MilestoneBars milestones={milestones} />
      </section>

      <section className="sd-card p-5">
        <h3 className="sd-card-title mb-1">Milestone details</h3>
        {milestones.length === 0 ? (
          <p className="text-sm text-muted-foreground">No milestones published yet.</p>
        ) : (
          milestones.map((m) => <MilestoneRow key={m.id} milestone={m} />)
        )}
      </section>
    </div>
  )
}
