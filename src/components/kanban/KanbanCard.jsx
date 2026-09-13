import { useState } from 'react'
import { IconChevronRight, IconLink, IconMessage } from '@tabler/icons-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

const PRIORITY_CLASS = {
  high: 'sd-kanban-priority sd-kanban-priority--high',
  medium: 'sd-kanban-priority sd-kanban-priority--med',
  med: 'sd-kanban-priority sd-kanban-priority--med',
  low: 'sd-kanban-priority sd-kanban-priority--low',
}

const STATUS_LABELS = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
}
const ALL_STATUSES = ['todo', 'in_progress', 'in_review', 'done']

function initials(name = '') {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

function priorityLabel(priority) {
  if (!priority) return null
  if (priority === 'med') return 'Medium'
  return String(priority).charAt(0).toUpperCase() + String(priority).slice(1)
}

export default function KanbanCard({ task, featured = false, onTaskClick, onStatusChange }) {
  const [showMoveMenu, setShowMoveMenu] = useState(false)

  const isDone = task.status === 'done'
  const subtasks = task.subtasks || []
  const doneSubs = subtasks.filter((s) => s.done).length
  const hasSubs = subtasks.length > 0
  const progress = hasSubs
    ? Math.round((doneSubs / subtasks.length) * 100)
    : (isDone ? 100 : task.progress_percent != null ? Number(task.progress_percent) : 0)

  const handleMove = (e, status) => {
    e.stopPropagation()
    setShowMoveMenu(false)
    onStatusChange?.(task.id, status)
  }

  const note = task.description || task.note || null

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onTaskClick?.(task)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onTaskClick?.(task)
        }
      }}
      onMouseLeave={() => setShowMoveMenu(false)}
      className={cn(
        'sd-kanban-card group',
        featured && 'sd-kanban-card--ai',
        isDone && 'sd-kanban-card--done',
      )}
    >
      <div className="sd-kanban-card__top">
        {task.priority ? (
          <span className={PRIORITY_CLASS[task.priority] || PRIORITY_CLASS.med}>
            {priorityLabel(task.priority)}
          </span>
        ) : <span />}

        <div className="sd-kanban-card__move">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowMoveMenu((v) => !v) }}
            className="sd-kanban-card__move-btn"
          >
            Move <IconChevronRight size={10} />
          </button>
          {showMoveMenu ? (
            <div className="sd-kanban-card__move-menu">
              {ALL_STATUSES.filter((s) => s !== task.status).map((s) => (
                <button key={s} type="button" onClick={(e) => handleMove(e, s)}>
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <h4 className="sd-kanban-card__title">{task.title}</h4>

      {note ? (
        <p className="sd-kanban-card__note">
          <span>Note:</span> {note}
        </p>
      ) : null}

      {(hasSubs || progress > 0) ? (
        <div className="sd-kanban-card__progress">
          <div className="sd-kanban-card__progress-row">
            <span>Progress</span>
            <strong>{progress}%</strong>
          </div>
          <div className="sd-proj-progress">
            <div className="sd-proj-progress__bar" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : null}

      <footer className="sd-kanban-card__foot">
        <div className="sd-kanban-card__avatars">
          {(task.assignees || []).slice(0, 3).map((a, i) => (
            <Avatar key={i} className={cn('size-6', i !== 0 && '-ml-1.5 ring-2 ring-white')}>
              <AvatarFallback className="text-[8px] font-semibold">{initials(a.name)}</AvatarFallback>
            </Avatar>
          ))}
        </div>

        <div className="sd-kanban-card__stats">
          {(task.attachment_count ?? 0) > 0 ? (
            <span><IconLink size={12} />{task.attachment_count}</span>
          ) : null}
          {(task.comment_count ?? 0) > 0 ? (
            <span><IconMessage size={12} />{task.comment_count}</span>
          ) : null}
        </div>
      </footer>
    </article>
  )
}
