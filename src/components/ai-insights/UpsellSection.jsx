import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  IconCheck,
  IconLoader2,
  IconRefresh,
  IconSparkles,
  IconTrendingUp,
  IconX,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { apiErrorMessage } from '@/lib/apiError'
import { aiApi, projectsApi, upsellApi } from '../../services/api'
import { formatServiceType } from './shared'

const FILTERS = [
  { key: 'pending', label: 'Pending' },
  { key: 'shown', label: 'Sent' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Dismissed' },
  { key: 'all', label: 'All' },
]

function statusLabel(s) {
  if (s.client_status === 'shown') return 'sent'
  return s.admin_status || 'pending'
}

function statusClass(s) {
  if (s.client_status === 'shown') return 'is-sent'
  return `is-${s.admin_status || 'pending'}`
}

function projectProgress(project) {
  if (project?.progress_pct != null) return Number(project.progress_pct) / 100
  const total = Number(project?.task_counts?.total ?? project?.tasks_count ?? 0)
  const done = Number(project?.task_counts?.done ?? project?.done_tasks_count ?? 0)
  if (total > 0) return done / total
  if (project?.progress != null) return Number(project.progress) / 100
  return null
}

function isSuitableProject(project, healthById) {
  const health =
    healthById.get(Number(project.id)) ||
    project.health_score ||
    project.latest_health_score
  const score = Number(health?.score ?? 0)
  const flag = health?.flag
  const progress = projectProgress(project)
  const status = String(project.status || '').toLowerCase()
  const active = !['completed', 'cancelled', 'archived'].includes(status)

  if (!active) return false

  const nearComplete = progress == null ? score >= 65 : progress >= 0.7
  const healthy = flag === 'green' || score >= 65
  return nearComplete && healthy
}

function ConfidenceMeter({ value = 0 }) {
  const pct = Math.max(0, Math.min(100, Math.round(Number(value) || 0)))
  const tone = pct >= 75 ? 'high' : pct >= 55 ? 'mid' : 'low'
  return (
    <div className={cn('sd-upsell-studio__meter', `is-${tone}`)} aria-label={`${pct}% confidence`}>
      <div className="sd-upsell-studio__meter-track">
        <div className="sd-upsell-studio__meter-fill" style={{ width: `${pct}%` }} />
      </div>
      <strong>{pct}%</strong>
    </div>
  )
}

function UpsellCard({
  suggestion,
  isAdmin,
  selected,
  onSelect,
  onUpdated,
  onRerun,
  rerunning,
}) {
  const [busy, setBusy] = useState(false)
  const status = statusLabel(suggestion)
  const canSend =
    suggestion.client_status !== 'shown' && suggestion.admin_status !== 'rejected'
  const canUndo =
    suggestion.client_status === 'shown' ||
    suggestion.admin_status === 'approved' ||
    suggestion.admin_status === 'rejected'

  const respond = async (action) => {
    setBusy(true)
    try {
      if (action === 'send') await upsellApi.send(suggestion.id)
      else if (action === 'undo') await upsellApi.undo(suggestion.id)
      else if (action === 'approve') await upsellApi.approve(suggestion.id)
      else if (action === 'reject') await upsellApi.reject(suggestion.id)
      const messages = {
        send: 'Sent to client',
        undo: 'Upsell action undone',
        approve: 'Suggestion approved',
        reject: 'Suggestion dismissed',
      }
      toast.success(messages[action] || 'Updated')
      onUpdated?.()
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not update suggestion'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <article
      className={cn('sd-upsell-studio__card', selected && 'is-selected')}
      onClick={() => onSelect?.(suggestion.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect?.(suggestion.id)
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="sd-upsell-studio__card-top">
        <div className="min-w-0">
          <p className="sd-upsell-studio__card-service">
            {formatServiceType(suggestion.service_type)}
          </p>
          <p className="sd-upsell-studio__card-meta">
            {suggestion.project_name || 'Project'}
            {suggestion.client_name ? ` · ${suggestion.client_name}` : ''}
          </p>
        </div>
        <span className={cn('sd-upsell-studio__status', statusClass(suggestion))}>
          {status}
        </span>
      </div>

      <ConfidenceMeter value={(suggestion.confidence || 0) * 100} />

      {isAdmin ? (
        <div
          className="sd-upsell-studio__card-actions"
          onClick={(e) => e.stopPropagation()}
        >
          {canSend ? (
            <Button
              size="sm"
              className="border-0"
              disabled={busy || rerunning}
              onClick={() => respond('send')}
            >
              <IconCheck size={14} />
              Send
            </Button>
          ) : null}
          {canUndo ? (
            <Button
              size="sm"
              variant="outline"
              disabled={busy || rerunning}
              onClick={() => respond('undo')}
            >
              <IconRefresh size={14} />
              Undo
            </Button>
          ) : null}
          {suggestion.admin_status === 'pending' &&
          suggestion.client_status !== 'shown' ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy || rerunning}
              onClick={() => respond('reject')}
            >
              <IconX size={14} />
              Dismiss
            </Button>
          ) : null}
          {suggestion.project_id ? (
            <Button
              size="sm"
              variant="secondary"
              className="ml-auto border-0"
              disabled={busy || rerunning}
              onClick={() => onRerun?.(suggestion.project_id)}
            >
              {rerunning ? (
                <IconLoader2 size={14} className="animate-spin" />
              ) : (
                <IconSparkles size={14} />
              )}
              {rerunning ? 'Running…' : 'Re-run'}
            </Button>
          ) : null}
        </div>
      ) : suggestion.project_id ? (
        <Link
          to={`/projects/${suggestion.project_id}?tab=ai`}
          className="sd-upsell-studio__card-link"
          onClick={(e) => e.stopPropagation()}
        >
          Open project AI
        </Link>
      ) : null}
    </article>
  )
}

function ProjectPickerDialog({
  open,
  onOpenChange,
  projects,
  healthById,
  loading,
  runningId,
  onRun,
}) {
  const rows = useMemo(() => {
    const mapped = (projects || []).map((p) => {
      const suitable = isSuitableProject(p, healthById)
      const progress = projectProgress(p)
      const health = healthById.get(Number(p.id)) || p.health_score || p.latest_health_score
      return { project: p, suitable, progress, health }
    })
    mapped.sort((a, b) => {
      if (a.suitable !== b.suitable) return a.suitable ? -1 : 1
      return String(a.project.name || '').localeCompare(String(b.project.name || ''))
    })
    return mapped
  }, [projects, healthById])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sd-upsell-picker border-0 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Run upsell on a project</DialogTitle>
          <DialogDescription>
            Suitable projects (near completion + healthy) show a Run button first.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="sd-upsell-picker__list">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No projects found.</p>
        ) : (
          <ul className="sd-upsell-picker__list">
            {rows.map(({ project, suitable, progress, health }) => {
              const running = runningId === project.id
              return (
                <li
                  key={project.id}
                  className={cn('sd-upsell-picker__row', suitable && 'is-suitable')}
                >
                  {suitable ? (
                    <Button
                      size="sm"
                      className="sd-btn-gradient border-0 shrink-0"
                      disabled={Boolean(runningId)}
                      onClick={() => onRun?.(project.id)}
                    >
                      {running ? (
                        <IconLoader2 size={14} className="animate-spin" />
                      ) : (
                        <IconSparkles size={14} />
                      )}
                      {running ? 'Running…' : 'Run'}
                    </Button>
                  ) : (
                    <span className="sd-upsell-picker__spacer" aria-hidden />
                  )}

                  <div className="sd-upsell-picker__copy min-w-0">
                    <p className="sd-upsell-picker__name">{project.name}</p>
                    <p className="sd-upsell-picker__meta">
                      {project.client?.company_name || 'No client'}
                      {progress != null ? ` · ${Math.round(progress * 100)}% done` : ''}
                      {health?.score != null ? ` · health ${Math.round(health.score)}` : ''}
                      {suitable ? ' · suitable' : ''}
                    </p>
                  </div>

                  {!suitable ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0"
                      disabled={Boolean(runningId)}
                      onClick={() => onRun?.(project.id)}
                    >
                      {running ? (
                        <IconLoader2 size={14} className="animate-spin" />
                      ) : (
                        'Run anyway'
                      )}
                    </Button>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default function UpsellSection({
  loading,
  suggestions = [],
  healthList = [],
  isAdmin = false,
  onRefresh,
}) {
  const [filter, setFilter] = useState('pending')
  const [selectedId, setSelectedId] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [projects, setProjects] = useState([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [runningId, setRunningId] = useState(null)

  const healthById = useMemo(() => {
    const map = new Map()
    for (const h of healthList || []) {
      if (h?.project_id != null) map.set(Number(h.project_id), h)
    }
    return map
  }, [healthList])

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true)
    try {
      const res = await projectsApi.index()
      const raw = res.data?.data
      const list = Array.isArray(raw) ? raw : (raw?.projects ?? [])
      setProjects(list)
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not load projects'))
      setProjects([])
    } finally {
      setProjectsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (pickerOpen) loadProjects()
  }, [pickerOpen, loadProjects])

  const runUpsell = async (projectId) => {
    if (!projectId || runningId) return
    setRunningId(projectId)
    try {
      const res = await aiApi.getUpsell(Number(projectId), { force: true })
      const payload = res.data?.data || {}
      const list = Array.isArray(payload.suggestions) ? payload.suggestions : []
      const suggestion = payload.suggestion || list[0]
      const confidence = Math.round(
        Number(payload.raw?.confidence || suggestion?.confidence || 0) * 100,
      )
      if (suggestion || list.length) {
        toast.success(
          `Upsell model · ${list.length || 1} option${(list.length || 1) > 1 ? 's' : ''} · ${confidence}%`,
        )
        setFilter('pending')
        onRefresh?.()
        setPickerOpen(false)
      } else {
        toast.error(
          payload.raw?.reason === 'timing_not_right'
            ? `Model scored ${confidence}% — timing not ready yet`
            : 'No suggestion produced',
        )
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not run upsell model'))
    } finally {
      setRunningId(null)
    }
  }

  const filtered = useMemo(() => {
    if (filter === 'all') return suggestions
    if (filter === 'shown') return suggestions.filter((s) => s.client_status === 'shown')
    if (filter === 'pending') {
      return suggestions.filter(
        (s) => s.admin_status === 'pending' && s.client_status !== 'shown',
      )
    }
    return suggestions.filter((s) => s.admin_status === filter)
  }, [suggestions, filter])

  const counts = useMemo(() => {
    const c = {
      all: suggestions.length,
      pending: 0,
      shown: 0,
      approved: 0,
      rejected: 0,
    }
    for (const s of suggestions) {
      if (s.client_status === 'shown') c.shown += 1
      if (s.admin_status === 'pending' && s.client_status !== 'shown') c.pending += 1
      if (s.admin_status === 'approved') c.approved += 1
      if (s.admin_status === 'rejected') c.rejected += 1
    }
    return c
  }, [suggestions])

  const avgConf = useMemo(() => {
    if (!filtered.length) return null
    const sum = filtered.reduce((acc, s) => acc + Number(s.confidence || 0), 0)
    return Math.round((sum / filtered.length) * 100)
  }, [filtered])

  const groups = useMemo(() => {
    const map = new Map()
    for (const s of filtered) {
      const key = s.project_id || `x-${s.id}`
      if (!map.has(key)) {
        map.set(key, {
          projectId: s.project_id,
          projectName: s.project_name || 'Project',
          clientName: s.client_name,
          items: [],
        })
      }
      map.get(key).items.push(s)
    }
    return Array.from(map.values())
  }, [filtered])

  return (
    <section className="sd-upsell-studio">
      <header className="sd-upsell-studio__hero">
        <div className="sd-upsell-studio__hero-brand">
          <span className="sd-upsell-studio__hero-icon" aria-hidden>
            <IconTrendingUp size={22} stroke={1.75} />
          </span>
          <div>
            <p className="sd-upsell-studio__eyebrow">C2 · Predictive engine</p>
            <h2 className="sd-upsell-studio__title">Upsell Engine</h2>
            <p className="sd-upsell-studio__desc">
              Timing-aware service recommendations. Pick an option, send to client, undo anytime,
              or re-run the model right here.
            </p>
          </div>
        </div>

        <div className="sd-upsell-studio__hero-stats">
          <div>
            <strong>{counts.pending}</strong>
            <span>pending</span>
          </div>
          <div>
            <strong>{counts.shown}</strong>
            <span>sent</span>
          </div>
          <div>
            <strong>{avgConf != null ? `${avgConf}%` : '—'}</strong>
            <span>avg confidence</span>
          </div>
        </div>
      </header>

      <div className="sd-upsell-studio__toolbar">
        <div className="sd-ai-filters">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`sd-ai-chip${filter === f.key ? ' is-active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              {counts[f.key] ? ` (${counts[f.key]})` : ''}
            </button>
          ))}
        </div>
        {isAdmin ? (
          <Button
            size="sm"
            className="sd-btn-gradient border-0 shrink-0"
            onClick={() => setPickerOpen(true)}
          >
            <IconSparkles size={15} />
            Run on a project
          </Button>
        ) : null}
      </div>

      {loading ? (
        <div className="sd-upsell-studio__grid">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="sd-upsell-studio__empty">
          <IconTrendingUp size={28} stroke={1.5} />
          <p className="sd-upsell-studio__empty-title">No suggestions in this view</p>
          <p className="sd-upsell-studio__empty-desc">
            Click <strong>Run on a project</strong> to generate 2–3 ranked options here.
          </p>
          {isAdmin ? (
            <Button
              size="sm"
              className="sd-btn-gradient border-0 mt-2"
              onClick={() => setPickerOpen(true)}
            >
              <IconSparkles size={15} />
              Run on a project
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="sd-upsell-studio__groups">
          {groups.map((g) => (
            <div key={g.projectId || g.projectName} className="sd-upsell-studio__group">
              <div className="sd-upsell-studio__group-head">
                <div>
                  <h3 className="sd-upsell-studio__group-title">{g.projectName}</h3>
                  {g.clientName ? (
                    <p className="sd-upsell-studio__group-sub">{g.clientName}</p>
                  ) : null}
                </div>
                {isAdmin && g.projectId ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    disabled={Boolean(runningId)}
                    onClick={() => runUpsell(g.projectId)}
                  >
                    {runningId === g.projectId ? (
                      <IconLoader2 size={14} className="animate-spin" />
                    ) : (
                      <IconSparkles size={14} />
                    )}
                    {runningId === g.projectId ? 'Running…' : 'Re-run'}
                  </Button>
                ) : null}
              </div>
              <div className="sd-upsell-studio__grid">
                {g.items.map((s) => (
                  <UpsellCard
                    key={s.id}
                    suggestion={s}
                    isAdmin={isAdmin}
                    selected={selectedId === s.id}
                    onSelect={setSelectedId}
                    onUpdated={onRefresh}
                    onRerun={runUpsell}
                    rerunning={runningId === s.project_id}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <ProjectPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        projects={projects}
        healthById={healthById}
        loading={projectsLoading}
        runningId={runningId}
        onRun={runUpsell}
      />
    </section>
  )
}
