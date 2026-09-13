import { useEffect, useMemo, useState } from 'react'
import { IconSearch, IconSparkles } from '@tabler/icons-react'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { tasksApi } from '../../services/api'
import { initials } from './shared'

const STATUS_LABEL = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
}

const PRIORITY_CLASS = {
  high: 'sd-kanban-priority sd-kanban-priority--high',
  medium: 'sd-kanban-priority sd-kanban-priority--med',
  med: 'sd-kanban-priority sd-kanban-priority--med',
  low: 'sd-kanban-priority sd-kanban-priority--low',
}

export default function TaskListTab({ projectId, onTaskClick }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    tasksApi.index(projectId)
      .then((res) => {
        const data = res.data.data
        const list = Array.isArray(data?.tasks) ? data.tasks : (Array.isArray(data) ? data : [])
        if (!cancelled) setTasks(list)
      })
      .catch(() => !cancelled && setTasks([]))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [projectId])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return tasks
    return tasks.filter((t) => String(t.title || '').toLowerCase().includes(q))
  }, [tasks, search])

  if (loading) {
    return (
      <div className="sd-proj-list">
        <Skeleton className="h-10 w-64 rounded-full" />
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="sd-proj-list">
      <div className="sd-kanban-toolbar">
        <div className="sd-kanban-search">
          <IconSearch size={15} stroke={1.75} />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search task"
            className="sd-kanban-search__input"
          />
        </div>
        <span className="sd-proj-list__count">{filtered.length} tasks</span>
      </div>

      <div className="sd-proj-list__rows">
        {filtered.length === 0 ? (
          <div className="sd-proj-empty">
            <IconSparkles size={18} />
            <p>No tasks match this view.</p>
          </div>
        ) : filtered.map((task) => {
          const subs = task.subtasks || []
          const done = subs.filter((s) => s.done).length
          const progress = subs.length ? Math.round((done / subs.length) * 100) : (task.status === 'done' ? 100 : 0)
          return (
            <button
              key={task.id}
              type="button"
              className="sd-proj-list__row"
              onClick={() => onTaskClick?.(task)}
            >
              <div className="sd-proj-list__main">
                {task.priority ? (
                  <span className={PRIORITY_CLASS[task.priority] || PRIORITY_CLASS.med}>
                    {task.priority === 'med' ? 'Medium' : task.priority}
                  </span>
                ) : null}
                <strong>{task.title}</strong>
                <span className="sd-proj-list__status">{STATUS_LABEL[task.status] || task.status}</span>
              </div>
              <div className="sd-proj-list__side">
                <div className="sd-proj-list__progress">
                  <span>{progress}%</span>
                  <div className="sd-proj-progress">
                    <div className="sd-proj-progress__bar" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <div className="sd-proj-list__avatars">
                  {(task.assignees || []).slice(0, 3).map((a, i) => (
                    <Avatar key={i} className={cn('size-6', i && '-ml-1.5')}>
                      <AvatarFallback className="text-[8px] font-semibold">{initials(a.name)}</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
