import { useEffect, useRef, useState } from 'react'
import { IconDots, IconLayoutKanban, IconPlus } from '@tabler/icons-react'

const ROW_GRID = 'grid grid-cols-[2fr_100px_140px_90px_36px] items-center gap-2'

const STATUS_PILL = {
  active: {
    label: 'Active',
    className:
      'bg-[var(--color-bg-success)] text-[var(--color-text-success)]',
  },
  in_review: {
    label: 'In Review',
    className:
      'bg-[var(--color-bg-accent)] text-[var(--color-text-accent)]',
  },
  delayed: {
    label: 'Delayed',
    className:
      'bg-[var(--color-bg-danger)] text-[var(--color-text-danger)]',
  },
  completed: {
    label: 'Completed',
    className:
      'border-[0.5px] border-[var(--color-border)] bg-[var(--color-surface-1)] text-[var(--color-text-muted)]',
  },
}

const HEALTH_META = {
  good: { label: 'Good', dotClass: 'bg-[#22c55e]' },
  fair: { label: 'Fair', dotClass: 'bg-[#f59e0b]' },
  at_risk: { label: 'At risk', dotClass: 'bg-[#ef4444]' },
}

function formatDueDate(dueDate) {
  if (!dueDate) return '—'
  const date = new Date(dueDate)
  if (Number.isNaN(date.getTime())) return String(dueDate)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function isPastDue(dueDate) {
  if (!dueDate) return false
  const date = new Date(dueDate)
  if (Number.isNaN(date.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)
  return date < today
}

function progressFillColor(progress) {
  if (progress >= 70) return '#E85D26'
  if (progress >= 40) return '#f59e0b'
  return '#ef4444'
}

function StatusPill({ status }) {
  const meta = STATUS_PILL[status] || STATUS_PILL.active
  return (
    <span
      className={`inline-flex items-center rounded-[20px] px-[10px] py-[3px] text-[11px] font-medium ${meta.className}`}
    >
      {meta.label}
    </span>
  )
}

function ProgressCell({ progress = 0 }) {
  const value = Math.min(100, Math.max(0, Number(progress) || 0))
  const fill = progressFillColor(value)

  return (
    <div className="min-w-0">
      <div className="h-[5px] w-full overflow-hidden rounded-[4px] bg-[var(--color-surface-1)]">
        <svg
          className="block h-[5px] w-full"
          viewBox="0 0 100 5"
          preserveAspectRatio="none"
          aria-hidden
        >
          <rect
            x="0"
            y="0"
            width={value}
            height="5"
            rx="4"
            fill={fill}
          />
        </svg>
      </div>
      <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">{value}%</p>
    </div>
  )
}

function HealthCell({ health, healthLabel }) {
  const meta = HEALTH_META[health] || {
    label: healthLabel || '—',
    dotClass: 'bg-[var(--color-text-muted)]',
  }

  return (
    <div className="inline-flex items-center gap-[6px]">
      <span
        className={`size-[9px] shrink-0 rounded-full ${meta.dotClass}`}
        aria-hidden
      />
      <span className="text-[12px] text-[var(--color-text-primary)]">
        {meta.label}
      </span>
    </div>
  )
}

function ProjectMeta({ project }) {
  const dueLabel = formatDueDate(project.due_date)
  const overdue =
    project.status === 'delayed' && isPastDue(project.due_date)

  return (
    <div className="min-w-0">
      <p className="truncate text-[13px] font-medium text-[var(--color-text-primary)]">
        {project.name}
      </p>
      <p className="mt-0.5 truncate text-[11px] text-[var(--color-text-muted)]">
        Due {dueLabel}
        {overdue ? (
          <span className="text-[var(--color-text-danger)]"> · Overdue!</span>
        ) : (
          <span>
            {' '}
            · {project.tasks_open ?? 0} tasks open
          </span>
        )}
      </p>
    </div>
  )
}

function RowMenu({ projectId, open, onToggle, onClose, onViewKanban }) {
  const menuRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    const onPointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose()
      }
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  return (
    <div className="relative flex justify-end" ref={menuRef}>
      <button
        type="button"
        aria-label="Project actions"
        aria-expanded={open}
        className="flex size-[26px] items-center justify-center rounded-[6px] border-[0.5px] border-[var(--color-border)] bg-[var(--color-surface-1)] text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
      >
        <IconDots size={14} stroke={1.75} aria-hidden />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute top-full right-0 z-20 mt-1 min-w-[130px] overflow-hidden rounded-[8px] border-[0.5px] border-[var(--color-border)] bg-[var(--color-surface-2)] shadow-[var(--color-shadow-sm)]"
        >
          <button
            type="button"
            role="menuitem"
            className="block w-full px-[14px] py-3 text-left text-[13px] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-1)]"
            onClick={(e) => {
              e.stopPropagation()
              onClose()
              onViewKanban?.(projectId)
            }}
          >
            View kanban
          </button>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-[14px] py-3 text-left text-[13px] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-1)]"
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
          >
            Edit
          </button>
        </div>
      ) : null}
    </div>
  )
}

export default function ProjectsTab({
  projects = [],
  onViewKanban,
  onNewProject,
}) {
  const [openMenuId, setOpenMenuId] = useState(null)
  const list = Array.isArray(projects) ? projects : []
  const isEmpty = list.length === 0

  return (
    <div className="w-full">
      <div className="overflow-hidden rounded-[12px] border-[0.5px] border-[var(--color-border)] bg-[var(--color-surface-2)]">
        {isEmpty ? (
          <div className="flex min-h-[160px] flex-col items-center justify-center px-4 py-8 text-center">
            <IconLayoutKanban
              size={28}
              stroke={1.5}
              className="text-[var(--color-text-muted)]"
              aria-hidden
            />
            <p className="mt-[10px] text-[14px] font-medium text-[var(--color-text-primary)]">
              No projects yet
            </p>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
              Add a project to get started
            </p>
          </div>
        ) : (
          <>
            <div
              className={`${ROW_GRID} bg-[var(--color-surface-1)] px-4 py-2`}
              role="row"
            >
              {['PROJECT', 'STATUS', 'PROGRESS', 'HEALTH', ''].map((label) => (
                <div
                  key={label || 'actions'}
                  className="text-[11px] font-medium tracking-[0.05em] text-[var(--color-text-muted)] uppercase"
                >
                  {label}
                </div>
              ))}
            </div>

            <div role="rowgroup">
              {list.map((project, index) => {
                const isLast = index === list.length - 1
                return (
                  <div
                    key={project.id}
                    role="row"
                    className={`${ROW_GRID} cursor-default px-4 py-3 transition-colors hover:bg-[var(--color-surface-1)] ${
                      isLast ? '' : 'border-b-[0.5px] border-[var(--color-border)]'
                    }`}
                  >
                    <ProjectMeta project={project} />
                    <div>
                      <StatusPill status={project.status} />
                    </div>
                    <ProgressCell progress={project.progress} />
                    <HealthCell
                      health={project.health}
                      healthLabel={project.health_label}
                    />
                    <RowMenu
                      projectId={project.id}
                      open={openMenuId === project.id}
                      onToggle={() =>
                        setOpenMenuId((prev) =>
                          prev === project.id ? null : project.id,
                        )
                      }
                      onClose={() => setOpenMenuId(null)}
                      onViewKanban={onViewKanban}
                    />
                  </div>
                )
              })}
            </div>
          </>
        )}

        <button
          type="button"
          className="flex w-full cursor-pointer items-center gap-2 border-t-[0.5px] border-dashed border-[var(--color-border)] bg-[var(--color-surface-1)] px-4 py-2.5 text-[13px] text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
          onClick={() => onNewProject?.()}
        >
          <IconPlus size={14} stroke={1.75} aria-hidden />
          New project
        </button>
      </div>
    </div>
  )
}
