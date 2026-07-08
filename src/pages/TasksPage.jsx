import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconChecklist } from '@tabler/icons-react'
import PageWrapper from '../components/layout/PageWrapper'
import PageHeader from '../components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { tasksApi } from '../services/api'

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'todo', label: 'To do' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'in_review', label: 'In review' },
  { key: 'done', label: 'Done' },
]

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

function TaskRow({ task }) {
  return (
    <Link
      to={`/projects/${task.project_id}/kanban`}
      className="flex items-center gap-3 border-t border-border px-4 py-3 text-sm transition-colors first:border-t-0 hover:bg-accent/50"
    >
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ background: task.project?.color || 'var(--primary)' }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{task.title}</p>
        <p className="truncate text-xs text-muted-foreground">{task.project?.name || 'Unknown project'}</p>
      </div>
      {task.deadline && (
        <span className={`shrink-0 text-xs ${task.is_overdue ? 'font-medium text-red-500' : 'text-muted-foreground'}`}>
          {task.is_overdue ? 'Overdue · ' : 'Due '}
          {new Date(task.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </span>
      )}
      <Badge variant={PRIORITY_BADGE[task.priority] || 'outline'} className="shrink-0 capitalize">
        {task.priority}
      </Badge>
      <Badge variant={STATUS_BADGE[task.status] || 'outline'} className="shrink-0 capitalize">
        {task.status?.replace('_', ' ')}
      </Badge>
    </Link>
  )
}

export default function TasksPage() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    setLoading(true)
    setError(false)
    tasksApi
      .mine({ mine_only: 1 })
      .then((res) => setTasks(res.data.data || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(
    () => (filter === 'all' ? tasks : tasks.filter((t) => t.status === filter)),
    [tasks, filter]
  )

  const counts = useMemo(() => {
    const c = { all: tasks.length }
    for (const t of tasks) c[t.status] = (c[t.status] || 0) + 1
    return c
  }, [tasks])

  return (
    <PageWrapper>
      <div className="sd-page">
        <PageHeader title="My Tasks" subtitle="Everything assigned to you, across every project." />

        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                filter === f.key
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:bg-accent'
              }`}
            >
              {f.label}
              {counts[f.key] ? ` (${counts[f.key]})` : ''}
            </button>
          ))}
        </div>

        <div className="sd-card">
          {loading ? (
            <div className="flex flex-col gap-2 p-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : error ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Failed to load your tasks.</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <IconChecklist size={22} stroke={1.5} />
              </div>
              <p className="text-sm font-medium">Nothing here</p>
              <p className="max-w-xs text-sm text-muted-foreground">
                {filter === 'all'
                  ? "You don't have any tasks assigned yet."
                  : `No tasks with status "${filter.replace('_', ' ')}".`}
              </p>
            </div>
          ) : (
            filtered.map((task) => <TaskRow key={task.id} task={task} />)
          )}
        </div>
      </div>
    </PageWrapper>
  )
}
