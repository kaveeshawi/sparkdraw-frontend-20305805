import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  IconChecklist, IconInbox, IconPlayerPlay, IconAlertTriangle, IconFolder,
} from '@tabler/icons-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { tasksApi } from '@/services/api'
import { cn } from '@/lib/utils'

const STATUS_BADGE = {
  todo: 'outline',
  in_progress: 'info',
  in_review: 'warning',
  done: 'success',
}

const PRIORITY_BADGE = {
  low: 'success',
  medium: 'warning',
  high: 'destructive',
}

function formatDue(task) {
  if (!task.deadline) return 'No deadline'
  const label = new Date(task.deadline).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
  if (task.is_overdue && task.status !== 'done') return `Overdue · ${label}`
  return `Due ${label}`
}

export default function MemberWorkPanel({
  memberId,
  isSelf = false,
  canManage = false,
}) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!memberId) return undefined
    let cancelled = false
    setLoading(true)
    setError(false)

    const params = canManage
      ? { assignee_id: memberId, mine_only: 0 }
      : { mine_only: 1 }

    tasksApi
      .mine(params)
      .then((res) => {
        if (cancelled) return
        const raw = res.data.data
        setTasks(Array.isArray(raw) ? raw : (raw?.data ?? []))
      })
      .catch(() => {
        if (cancelled) return
        setError(true)
        setTasks([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [memberId, canManage])

  const openTasks = useMemo(
    () => tasks.filter((t) => t.status !== 'done'),
    [tasks],
  )
  const overdueCount = useMemo(
    () => openTasks.filter((t) => t.is_overdue).length,
    [openTasks],
  )
  const inProgressCount = useMemo(
    () => openTasks.filter((t) => t.status === 'in_progress').length,
    [openTasks],
  )

  return (
    <div className="sd-team-portal__work">
      <div className="sd-team-portal__work-actions">
        <Button asChild className="sd-header-new-project sd-btn-gradient rounded-full border-0 shadow-none">
          <Link to="/tasks">
            <IconChecklist size={16} stroke={1.75} />
            {isSelf ? 'Open my tasks' : 'Open tasks'}
          </Link>
        </Button>
        <Button asChild variant="secondary" className="rounded-full border-0">
          <Link to="/inbox?channel=team">
            <IconInbox size={16} stroke={1.75} />
            Team chat
          </Link>
        </Button>
        <Button asChild variant="secondary" className="rounded-full border-0">
          <Link to="/projects">
            <IconFolder size={16} stroke={1.75} />
            Projects
          </Link>
        </Button>
      </div>

      <div className="sd-team-kpi sd-team-portal__work-kpi">
        <div className="sd-stat-tile sd-team-kpi__card">
          <p className="sd-stat-tile__label">Open tasks</p>
          <p className="sd-stat-tile__value">{loading ? '—' : openTasks.length}</p>
          <p className="sd-team-kpi__hint">{isSelf ? 'Assigned to you' : 'Assigned to this member'}</p>
        </div>
        <div className="sd-stat-tile sd-team-kpi__card">
          <p className="sd-stat-tile__label">In progress</p>
          <p className="sd-stat-tile__value">{loading ? '—' : inProgressCount}</p>
          <p className="sd-team-kpi__hint">Currently active</p>
        </div>
        <div className="sd-stat-tile sd-team-kpi__card">
          <p className="sd-stat-tile__label">Overdue</p>
          <p className="sd-stat-tile__value">{loading ? '—' : overdueCount}</p>
          <p className="sd-team-kpi__hint">Needs attention</p>
        </div>
      </div>

      <section className="sd-card sd-team-portal__work-list">
        <header className="sd-team-portal__work-list-head">
          <div>
            <h2 className="sd-card-title">{isSelf ? 'Your tasks' : 'Assigned tasks'}</h2>
            <p className="sd-card-desc">Open a task to work on it in the project board.</p>
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col gap-2 p-4">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : error ? (
          <p className="sd-team-portal__work-empty">Could not load tasks. Try again from Tasks.</p>
        ) : openTasks.length === 0 ? (
          <p className="sd-team-portal__work-empty">
            {isSelf
              ? 'No open tasks yet. When your PM assigns work, it will show up here.'
              : 'No open tasks assigned to this member yet.'}
          </p>
        ) : (
          <ul className="sd-team-portal__task-list">
            {openTasks.map((task) => (
              <li key={task.id}>
                <Link
                  to={`/projects/${task.project_id}/kanban`}
                  className={cn(
                    'sd-team-portal__task-row sd-team-portal__task-row--link',
                    task.is_overdue && 'is-overdue',
                  )}
                >
                  <div className="sd-team-portal__task-main">
                    <p className="sd-team-portal__task-title">{task.title}</p>
                    <p className="sd-team-portal__task-meta">
                      <span>{task.project?.name || 'Project'}</span>
                      <span aria-hidden>·</span>
                      <span className={task.is_overdue ? 'text-destructive' : undefined}>
                        {task.is_overdue ? (
                          <span className="inline-flex items-center gap-1">
                            <IconAlertTriangle size={12} stroke={1.75} />
                            {formatDue(task)}
                          </span>
                        ) : (
                          formatDue(task)
                        )}
                      </span>
                    </p>
                  </div>
                  <div className="sd-team-portal__task-side">
                    <Badge variant={PRIORITY_BADGE[task.priority] || 'outline'} className="capitalize">
                      {task.priority || '—'}
                    </Badge>
                    <Badge variant={STATUS_BADGE[task.status] || 'outline'} className="capitalize">
                      {String(task.status || '').replace('_', ' ')}
                    </Badge>
                    <span className="sd-team-portal__task-go" aria-hidden>
                      <IconPlayerPlay size={14} stroke={1.75} />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
