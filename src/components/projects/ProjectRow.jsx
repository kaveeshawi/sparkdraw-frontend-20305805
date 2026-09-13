import { Link } from 'react-router-dom'
import {
  IconBriefcase,
  IconBuilding,
  IconCalendar,
  IconLayoutKanban,
  IconPencil,
} from '@tabler/icons-react'
import { useServiceLabel } from '@/hooks/useAgencyServices'
import {
  HEALTH_FLAG_LABELS,
  STATUS_LABELS,
  formatProjectDue,
  getProgressPct,
  getProjectHealth,
  getTaskCounts,
  healthDotClass,
  isPastDue,
  progressFillClass,
  statusPillClass,
} from './project-utils'

export default function ProjectRow({ project, onOpen, onEdit, canEdit = false }) {
  const progress = getProgressPct(project)
  const health = getProjectHealth(project)
  const tasks = getTaskCounts(project)
  const due = formatProjectDue(project.end_date)
  const overdue = project.status === 'active' && isPastDue(project.end_date)
  const reason = Array.isArray(health?.reasons) ? health.reasons[0] : null
  const clientName = project.client?.company_name || '—'
  const status = project.status || 'active'
  const typeLabel = useServiceLabel(project.type)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.(project)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen?.(project)
        }
      }}
      className="sd-team-list-row sd-project-list-row sd-row cursor-pointer"
    >
      <div className="sd-project-list-row__swatch-wrap">
        <span
          className="sd-project-card__swatch sd-project-card__swatch--row"
          style={{ background: project.color || 'var(--primary)' }}
          aria-hidden
        />
      </div>

      <div className="sd-team-list-row__body min-w-0 flex-1">
        <div className="sd-team-list-row__head">
          <p className="sd-team-list-row__name truncate">{project.name}</p>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusPillClass(status)}`}
          >
            {STATUS_LABELS[status] || status}
          </span>
        </div>

        <div className="sd-team-list-row__facts">
          <p className="sd-team-card__fact-line" title={clientName}>
            <IconBuilding size={13} stroke={1.65} className="sd-team-card__fact-icon" aria-hidden />
            <span className="sd-team-card__fact-key">Client</span>
            <span className="sd-team-card__fact-sep">-</span>
            <span className="sd-team-card__fact-val">{clientName}</span>
          </p>
          <p className="sd-team-card__fact-line" title={project.type || '—'}>
            <IconBriefcase size={13} stroke={1.65} className="sd-team-card__fact-icon" aria-hidden />
            <span className="sd-team-card__fact-key">Type</span>
            <span className="sd-team-card__fact-sep">-</span>
            <span className="sd-team-card__fact-val">{typeLabel}</span>
          </p>
          {due ? (
            <p
              className={`sd-team-card__fact-line ${
                overdue ? 'text-[var(--color-text-danger)]' : ''
              }`}
            >
              <IconCalendar size={13} stroke={1.65} className="sd-team-card__fact-icon" aria-hidden />
              <span className="sd-team-card__fact-key">Due</span>
              <span className="sd-team-card__fact-sep">-</span>
              <span className="sd-team-card__fact-val">
                {overdue ? `Overdue ${due}` : due}
              </span>
            </p>
          ) : null}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <div className="min-w-[7rem] max-w-[10rem] flex-1">
            <div className="mb-0.5 flex justify-between text-[10px] text-muted-foreground">
              <span>{progress}%</span>
              <span>
                {tasks.open}/{tasks.total}
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-[var(--color-surface-1)]">
              <div
                className={`h-full rounded-full ${progressFillClass(progress)}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 text-[12px] text-foreground">
            <span className={`size-2 rounded-full ${healthDotClass(health?.flag)}`} aria-hidden />
            <span className="font-medium tabular-nums">{health?.score ?? '—'}</span>
            <span className="text-muted-foreground">
              {HEALTH_FLAG_LABELS[health?.flag] || 'No score'}
            </span>
          </div>

          {reason ? (
            <p className="max-w-[14rem] truncate text-[11px] text-muted-foreground" title={reason}>
              {reason}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {canEdit ? (
          <button
            type="button"
            className="sd-project-card-v2__edit"
            title="Edit project"
            aria-label="Edit project"
            onClick={(e) => {
              e.stopPropagation()
              onEdit?.(project)
            }}
          >
            <IconPencil size={14} stroke={1.75} />
          </button>
        ) : null}
        <Link
          to={`/projects/${project.id}/kanban`}
          className="sd-project-card__board shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <IconLayoutKanban size={15} stroke={1.75} />
          Board
        </Link>
      </div>
    </div>
  )
}
