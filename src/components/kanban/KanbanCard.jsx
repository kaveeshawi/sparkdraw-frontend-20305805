import { useState } from 'react'
import { IconLink, IconMessage, IconChevronRight } from '@tabler/icons-react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

const TYPE_CLASS = {
  ui:       'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  dev:      'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  design:   'bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300',
  research: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300',
  test:     'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
}

const PRIORITY_CLASS = {
  high:   'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  med:    'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  low:    'bg-gray-100 text-gray-500 dark:bg-gray-500/15 dark:text-gray-400',
}

const STATUS_LABELS = {
  todo:        'To Do',
  in_progress: 'In Progress',
  in_review:   'In Review',
  done:        'Done',
}
const ALL_STATUSES = ['todo', 'in_progress', 'in_review', 'done']

function initials(name) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

export default function KanbanCard({ task, featured = false, onTaskClick, onStatusChange }) {
  const [showMoveMenu, setShowMoveMenu] = useState(false)

  const isDone    = task.status === 'done'
  const subtasks  = task.subtasks || []
  const doneSubs  = subtasks.filter((s) => s.done).length
  const hasSubs   = subtasks.length > 0
  const progress  = hasSubs ? Math.round((doneSubs / subtasks.length) * 100) : 0

  const handleMove = (e, status) => {
    e.stopPropagation()
    setShowMoveMenu(false)
    onStatusChange?.(task.id, status)
  }

  return (
    <div
      onClick={() => onTaskClick?.(task)}
      onMouseLeave={() => setShowMoveMenu(false)}
      className={cn(
        'group sd-card sd-card--interactive relative shrink-0 cursor-pointer p-3',
        featured && 'border-primary/60 shadow-[var(--sd-glow-sm)]',
        isDone && 'opacity-70'
      )}
    >
      {/* Tag row */}
      {(task.type || task.priority) && (
        <div className="mb-1.5 flex flex-wrap gap-1">
          {task.type && (
            <span className={cn('rounded-md px-1.5 py-px text-[9px] font-medium', TYPE_CLASS[task.type] || TYPE_CLASS.ui)}>
              {task.type}
            </span>
          )}
          {task.priority && (
            <span className={cn('rounded-md px-1.5 py-px text-[9px] font-medium', PRIORITY_CLASS[task.priority] || PRIORITY_CLASS.med)}>
              {task.priority}
            </span>
          )}
        </div>
      )}

      {/* Title */}
      <div className="mb-1 text-[12.5px] font-medium leading-snug text-foreground">
        {task.title}
      </div>

      {/* Description (2-line clamp) */}
      {task.description && (
        <div className="mb-1.5 line-clamp-2 text-[10.5px] leading-relaxed text-muted-foreground">
          {task.description}
        </div>
      )}

      {/* Subtask progress bar */}
      {hasSubs && (
        <div className="my-1.5">
          <div className="h-[3px] overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{ width: `${progress}%`, background: 'var(--sd-grad)' }}
            />
          </div>
          <div className="mt-0.5 text-[9px] text-muted-foreground">
            {doneSubs}/{subtasks.length} subtasks
          </div>
        </div>
      )}

      {/* Footer: assignees + counts */}
      <div className="mt-2 flex items-center justify-between">
        {/* Assignee avatar stack */}
        <div className="flex items-center">
          {(task.assignees || []).map((a, i) => (
            <Avatar key={i} className={cn('size-5', i !== 0 && '-ml-1 ring-2 ring-card-solid')}>
              <AvatarFallback className="text-[8px] font-semibold">{initials(a.name)}</AvatarFallback>
            </Avatar>
          ))}
        </div>

        {/* Attachment + comment counts */}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {(task.attachment_count ?? 0) > 0 && (
            <span className="flex items-center gap-0.5">
              <IconLink size={11} />
              {task.attachment_count}
            </span>
          )}
          {(task.comment_count ?? 0) > 0 && (
            <span className="flex items-center gap-0.5">
              <IconMessage size={11} />
              {task.comment_count}
            </span>
          )}
        </div>
      </div>

      {/* Move → hover control */}
      <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={(e) => { e.stopPropagation(); setShowMoveMenu((v) => !v) }}
          className="flex items-center gap-0.5 rounded-md bg-[var(--sd-grad-soft)] px-1.5 py-0.5 text-[9px] font-medium text-primary border border-primary/20 cursor-pointer"
        >
          Move <IconChevronRight size={9} />
        </button>

        {showMoveMenu && (
          <div className="sd-glass absolute right-0 top-5 z-20 min-w-[120px] overflow-hidden rounded-xl">
            {ALL_STATUSES.filter((s) => s !== task.status).map((s) => (
              <button
                key={s}
                onClick={(e) => handleMove(e, s)}
                className="block w-full px-3 py-1.5 text-left text-[11px] text-foreground transition-colors hover:bg-[var(--sd-grad-soft)] hover:text-primary cursor-pointer"
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
