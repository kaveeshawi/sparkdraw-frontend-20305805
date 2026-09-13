import { Link } from 'react-router-dom'
import {
  IconArrowRight,
  IconPencil,
  IconRefresh,
} from '@tabler/icons-react'
import { getInitials } from '@/lib/utils'
import { memberPhotoSrc } from '@/lib/media'
import { useServiceLabel } from '@/hooks/useAgencyServices'
import {
  formatProjectDue,
  getProgressPct,
  getProjectHealth,
  isPastDue,
} from './project-utils'

const TRACK_LABELS = { green: 'On Track', amber: 'At Risk', red: 'Critical' }

function HealthRing({ score, flag }) {
  const value = score == null ? 0 : Math.min(100, Math.max(0, Number(score) || 0))
  const size = 72
  const stroke = 5
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (value / 100) * c

  const ringClass =
    flag === 'green'
      ? 'stroke-emerald-400'
      : flag === 'amber'
        ? 'stroke-amber-400'
        : flag === 'red'
          ? 'stroke-red-400'
          : 'stroke-orange-300'

  const labelClass =
    flag === 'green'
      ? 'text-emerald-600'
      : flag === 'amber'
        ? 'text-amber-600'
        : flag === 'red'
          ? 'text-red-600'
          : 'text-muted-foreground'

  return (
    <div className="relative size-[72px] shrink-0">
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-orange-50"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={ringClass}
          strokeDasharray={c}
          strokeDashoffset={score == null ? c : offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[17px] font-semibold leading-none tabular-nums text-[var(--color-text-primary)]">
          {score ?? '—'}
        </span>
        <span className={`mt-0.5 text-[11px] font-medium leading-none ${labelClass}`}>
          {TRACK_LABELS[flag] || '—'}
        </span>
      </div>
    </div>
  )
}

function TeamStack({ members = [] }) {
  const list = Array.isArray(members) ? members : []
  const shown = list.slice(0, 3)
  const extra = Math.max(0, list.length - shown.length)

  if (!shown.length) {
    return (
      <div className="flex items-center">
        <span className="flex size-8 items-center justify-center rounded-full border border-dashed border-[var(--color-border)] bg-[var(--color-surface-1)] text-[10px] text-muted-foreground">
          —
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center">
      {shown.map((m, i) => {
        const src = memberPhotoSrc(m)
        return (
          <span
            key={m.id || i}
            className="relative inline-flex size-8 overflow-hidden rounded-full border-2 border-white bg-orange-50 text-[10px] font-semibold text-orange-700"
            style={{ marginLeft: i === 0 ? 0 : -8, zIndex: shown.length - i }}
            title={m.name}
          >
            {src ? (
              <img src={src} alt="" className="size-full object-cover" />
            ) : (
              <span className="flex size-full items-center justify-center">
                {getInitials(m.name || '?')}
              </span>
            )}
          </span>
        )
      })}
      {extra > 0 ? (
        <span
          className="relative inline-flex size-8 items-center justify-center rounded-full border-2 border-white bg-orange-50 text-[11px] font-semibold text-orange-700"
          style={{ marginLeft: -8 }}
        >
          +{extra}
        </span>
      ) : null}
    </div>
  )
}

const STATUS_STYLES = {
  not_started: { label: 'Not Started', bg: '#F0F0F0', color: '#888' },
  started:     { label: 'Started',     bg: '#F3E8FF', color: '#802AEE' },
  active:      { label: 'Ongoing',     bg: '#EBF5FF', color: '#2E74B5' },
  on_hold:     { label: 'On Hold',     bg: '#FFF8E8', color: '#D4A017' },
  cancelled:   { label: 'Cancelled',   bg: '#FEF0F0', color: '#C0392B' },
  completed:   { label: 'Completed',   bg: '#EAFAF1', color: '#1A8A4A' },
}

/** Header status pill — lifecycle status only (health track shown on the ring below). */
function resolveStatusDisplay(project) {
  const status = project.status || 'active'
  return STATUS_STYLES[status] || STATUS_STYLES.not_started
}

export default function ProjectCard({ project, onOpen, onEdit, canEdit = false }) {
  const progress = getProgressPct(project)
  const taskTotal = Number(project?.task_counts?.total ?? project?.tasks_count ?? 0)
  const hasTasks = taskTotal > 0
  const health = getProjectHealth(project)
  const flag = health?.flag
  const typeLabel = useServiceLabel(project.type)
  const clientName = project.client?.company_name || '—'
  const milestone = project.next_milestone
  const milestoneDue = formatProjectDue(milestone?.due_date || project.end_date)
  const overdue =
    project.status === 'active' && isPastDue(milestone?.due_date || project.end_date)
  const accent = project.color || '#ea580c'
  const statusDisplay = resolveStatusDisplay(project)

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
      className="sd-project-card-v2 text-left"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="inline-flex min-w-0 max-w-[55%] items-center gap-1.5">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ background: accent }}
            aria-hidden
          />
          <span className="truncate text-[12px] text-muted-foreground">{typeLabel}</span>
        </div>
        <span
          className="inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium"
          style={{ background: statusDisplay.bg, color: statusDisplay.color }}
        >
          {statusDisplay.label}
        </span>
      </div>

      <h3 className="mt-2.5 truncate text-[17px] font-semibold leading-snug text-[var(--color-text-primary)]">
        {project.name}
      </h3>
      <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{clientName}</p>

      <div className="mt-4 flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="shrink-0 text-[22px] font-semibold leading-none tabular-nums text-[var(--color-text-primary)]">
              {hasTasks ? `${progress}%` : '—'}
            </p>
            <span
              className="inline-flex size-5 shrink-0 items-center justify-center rounded-full"
              style={{ background: `${accent}22`, color: accent }}
            >
              <IconRefresh size={12} stroke={2} aria-hidden />
            </span>
            <p
              className="min-w-0 flex-1 truncate text-[13px] font-medium"
              style={{ color: accent }}
              title={milestone?.title || 'No active milestone'}
            >
              {milestone?.title || 'No active milestone'}
            </p>
          </div>

          {hasTasks ? (
            <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-orange-50">
              <div
                className="h-full rounded-full transition-[width] duration-300"
                style={{
                  width: `${progress}%`,
                  background: accent,
                }}
              />
            </div>
          ) : (
            <p className="mt-2.5 text-[12px] text-muted-foreground">No tasks yet</p>
          )}

          {milestoneDue ? (
            <p className="mt-3 text-[13px] text-muted-foreground">
              Deadline -{' '}
              <span
                className={
                  overdue
                    ? 'font-medium text-[var(--color-text-danger)]'
                    : 'font-medium text-[var(--color-text-primary)]'
                }
              >
                {milestoneDue}
              </span>
            </p>
          ) : (
            <p className="mt-3 text-[13px] text-muted-foreground">No specific deadline</p>
          )}
        </div>

        <HealthRing score={health?.score} flag={flag} />
      </div>

      <div className="mt-4 flex items-end justify-between gap-3 border-t border-[var(--color-border)] pt-4">
        <div className="min-w-0">
          <p className="mb-2 text-[11px] text-muted-foreground">Assigned team</p>
          <TeamStack members={project.team_members} />
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
            className="sd-project-card-v2__cta sd-project-card-v2__cta--inline"
            onClick={(e) => e.stopPropagation()}
          >
            View project
            <IconArrowRight size={14} stroke={2} aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  )
}
