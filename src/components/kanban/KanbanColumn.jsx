import { IconDots, IconPlus } from '@tabler/icons-react'
import KanbanCard from './KanbanCard'
import { cn } from '@/lib/utils'

export default function KanbanColumn({ column, tasks = [], onTaskClick, onAddTask, onStatusChange }) {
  return (
    <section className={cn('sd-kanban-col', `sd-kanban-col--${column.tone || 'rose'}`)}>
      <header className="sd-kanban-col__head">
        <div className="sd-kanban-col__title">
          <span className={cn('sd-kanban-col__dot', `sd-kanban-col__dot--${column.tone || 'rose'}`)} />
          <h3>{column.label}</h3>
          <span className="sd-kanban-col__count">{tasks.length}</span>
        </div>
        <button type="button" className="sd-kanban-col__menu" aria-label="Column options">
          <IconDots size={16} stroke={1.75} />
        </button>
      </header>

      <div className="sd-kanban-col__cards">
        {tasks.map((task) => (
          <KanbanCard
            key={task.id}
            task={task}
            onTaskClick={onTaskClick}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => onAddTask?.(column.id)}
        className="sd-kanban-col__add"
      >
        <IconPlus size={14} stroke={1.75} />
        Add task
      </button>
    </section>
  )
}
