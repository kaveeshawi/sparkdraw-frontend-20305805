import { IconPlus, IconDots } from '@tabler/icons-react'
import KanbanCard from './KanbanCard'
import { cn } from '@/lib/utils'

const COUNT_STYLES = {
  todo:        'bg-muted text-muted-foreground',
  in_progress: 'bg-primary/10 text-primary',
  in_review:   'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  done:        'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
}

const DOT_STYLES = {
  todo:        'bg-gray-400',
  in_progress: 'bg-[var(--sd-grad-from)] shadow-[var(--sd-glow-sm)]',
  in_review:   'bg-amber-500',
  done:        'bg-emerald-500',
}

export default function KanbanColumn({ column, tasks = [], onTaskClick, onAddTask, onStatusChange }) {
  return (
    <div className="flex w-[230px] min-w-[230px] max-h-full flex-col">
      {/* Column header */}
      <div className="mb-2.5 flex shrink-0 items-center gap-1.5">
        <div className={cn('size-2 shrink-0 rounded-full', DOT_STYLES[column.id] || 'bg-gray-400')} />
        <span className="flex-1 text-xs font-medium text-foreground">
          {column.label}
        </span>
        <span className={cn(
          'rounded-lg px-1.5 py-px text-[10px] font-medium',
          COUNT_STYLES[column.id] || COUNT_STYLES.todo
        )}>
          {tasks.length}
        </span>
        <button
          className="flex size-5 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
          aria-label="Column options"
        >
          <IconDots size={14} />
        </button>
      </div>

      {/* Cards list */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-0.5">
        {tasks.map((task) => (
          <KanbanCard
            key={task.id}
            task={task}
            onTaskClick={onTaskClick}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>

      {/* Add task button */}
      <button
        onClick={() => onAddTask?.(column.id)}
        className="mt-2 flex shrink-0 items-center gap-1.5 rounded-[10px] border border-dashed border-border px-2.5 py-2 text-[11px] text-muted-foreground transition-all hover:border-primary/50 hover:text-primary hover:bg-[var(--sd-grad-soft)] cursor-pointer"
      >
        <IconPlus size={13} />
        Add task
      </button>
    </div>
  )
}
