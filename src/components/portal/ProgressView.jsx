import { useEffect, useState } from 'react'
import Badge from '../legacy-ui/Badge'
import { portalApi } from '../../services/api'

// TODO Session 5.x — replace with real API
const MOCK_PROGRESS = {
  project: {
    name:             'NovaTech Brand Refresh',
    progress_percent: 62,
    status:           'active',
    start_date:       '2026-05-01',
    end_date:         '2026-07-15',
  },
  milestones: [
    { id: 1, title: 'Discovery & Research',        status: 'completed', progress: 100, due_date: '2026-05-15' },
    { id: 2, title: 'Wireframes & Prototyping',    status: 'completed', progress: 100, due_date: '2026-05-30' },
    { id: 3, title: 'Visual Design',               status: 'active',    progress: 70,  due_date: '2026-06-20' },
    { id: 4, title: 'Development',                 status: 'pending',   progress: 0,   due_date: '2026-07-05' },
    { id: 5, title: 'QA & Launch',                 status: 'pending',   progress: 0,   due_date: '2026-07-15' },
  ],
}

const STATUS_VARIANTS = {
  completed: 'success',
  active:    'active',
  pending:   'muted',
  on_hold:   'warning',
}

function MilestoneRow({ milestone }) {
  return (
    <div className="flex flex-col gap-1.5 border-b border-border py-3 last:border-0">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">
          {milestone.title}
        </span>
        <div className="flex items-center gap-2">
          {milestone.due_date && (
            <span className="text-[10px] text-muted-foreground">
              Due {milestone.due_date}
            </span>
          )}
          <Badge variant={STATUS_VARIANTS[milestone.status] || 'muted'}>
            {milestone.status}
          </Badge>
        </div>
      </div>

      {/* Mini progress bar */}
      <div
        className="overflow-hidden rounded-full"
        style={{ height: '4px', background: 'color-mix(in srgb, var(--portal-primary, #802aee) 12%, transparent)' }}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${milestone.progress}%`, background: 'var(--portal-primary)' }}
        />
      </div>
    </div>
  )
}

export default function ProgressView({ slug, projectId }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)

  const fetchProgress = () => {
    if (!slug || !projectId) {
      setData(MOCK_PROGRESS)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(false)
    portalApi
      .getProgress(slug, projectId)
      .then((res) => setData(res.data.data || res.data))
      .catch((err) => {
        if (err.response?.status === 404) setData(MOCK_PROGRESS)
        else setError(true)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchProgress() }, [slug, projectId])

  if (loading) {
    return <div className="py-4 text-xs text-muted-foreground">Loading…</div>
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
        Failed to load progress.
        <button
          onClick={fetchProgress}
          className="cursor-pointer border-none bg-none text-xs"
          style={{ color: 'var(--portal-primary)' }}
        >
          Retry
        </button>
      </div>
    )
  }

  const project    = data?.project    || {}
  const milestones = data?.milestones || []
  const pct        = project.progress_percent ?? 0

  return (
    <div className="flex flex-col gap-6 sd-animate-in">
      {/* Project header */}
      <div>
        <div className="mb-1 text-lg font-medium text-foreground">
          {project.name}
        </div>
        <div className="flex items-center gap-3">
          {project.status && (
            <Badge variant={STATUS_VARIANTS[project.status] || 'muted'}>
              {project.status}
            </Badge>
          )}
          {project.start_date && project.end_date && (
            <span className="text-[11px] text-muted-foreground">
              {project.start_date} → {project.end_date}
            </span>
          )}
        </div>
      </div>

      {/* Large progress bar */}
      <div className="sd-glass p-5 px-6">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-[13px] font-medium text-foreground">Overall progress</span>
          <span
            className="text-[22px] font-medium"
            style={{ color: 'var(--portal-primary)' }}
          >
            {pct}%
          </span>
        </div>
        <div
          className="overflow-hidden rounded-full"
          style={{
            height: '10px',
            background: 'color-mix(in srgb, var(--portal-primary, #802aee) 12%, transparent)',
          }}
        >
          <div
            className="h-full rounded-full transition-[width] duration-500 ease-out"
            style={{
              width: `${pct}%`,
              background: 'var(--portal-primary)',
              boxShadow: `0 0 12px color-mix(in srgb, var(--portal-primary, #802aee) 50%, transparent)`,
            }}
          />
        </div>
        <div className="mt-1.5">
          <span className="text-[10px] text-muted-foreground">
            {milestones.filter((m) => m.status === 'completed').length} of {milestones.length} milestones complete
          </span>
        </div>
      </div>

      {/* Milestones list */}
      <div className="sd-glass p-5 px-6">
        <div className="mb-1 text-[13px] font-medium text-foreground">
          Milestones
        </div>
        {milestones.length === 0 ? (
          <div className="py-3 text-xs text-muted-foreground">
            No milestones added yet.
          </div>
        ) : (
          milestones.map((m) => <MilestoneRow key={m.id} milestone={m} />)
        )}
      </div>
    </div>
  )
}
