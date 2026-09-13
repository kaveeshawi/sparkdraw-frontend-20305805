import { useState } from 'react'
import { Link } from 'react-router-dom'
import { IconChevronDown, IconChevronRight, IconHeartbeat, IconRefresh } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { FLAG_META } from './shared'

function HealthRow({ item, isAdmin, onRecompute, recomputing }) {
  const [expanded, setExpanded] = useState(false)
  const reasons = Array.isArray(item.reasons) ? item.reasons : []
  const flag = FLAG_META[item.flag] || FLAG_META.amber
  const computedStr = item.computed_at
    ? new Date(item.computed_at).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Not computed yet'

  return (
    <div className={cn('sd-ai-row', item.flag === 'red' && 'sd-ai-row--danger')}>
      <div className="sd-ai-row__main">
        <div className={flag.className}>{item.score ?? '—'}</div>
        <div className="sd-ai-row__copy">
          <p className="sd-ai-row__title">{item.project_name || 'Untitled project'}</p>
          <p className="sd-ai-row__meta">
            {item.client_name || 'No client'} · {computedStr}
            {reasons[0] ? ` · ${reasons[0]}` : ''}
          </p>
        </div>
        {reasons.length > 1 ? (
          <button
            type="button"
            className="sd-ai-icon-btn"
            aria-label={expanded ? 'Hide reasons' : 'Show reasons'}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
          </button>
        ) : null}
        {isAdmin ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 px-2 text-xs"
            disabled={recomputing}
            onClick={() => onRecompute?.(item.project_id)}
          >
            <IconRefresh size={13} className={cn(recomputing && 'animate-spin')} />
            Recompute
          </Button>
        ) : null}
        <Link to={`/projects/${item.project_id}/kanban`} className="sd-ai-row__link">
          Open
        </Link>
      </div>
      {expanded && reasons.length > 0 ? (
        <ul className="sd-ai-reasons">
          {reasons.map((reason, i) => (
            <li key={`${item.project_id}-${i}`}>{reason}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export default function HealthSection({
  loading,
  healthList = [],
  isAdmin = false,
  recomputingAll = false,
  recomputingId = null,
  onRecomputeAll,
  onRecomputeOne,
}) {
  return (
    <section className="sd-ai-panel">
      <div className="sd-ai-panel__head">
        <div>
          <h2 className="sd-ai-panel__title">Project health scores</h2>
          <p className="sd-ai-panel__desc">
            Rule-based 0–100 scores with green / amber / red flags — Sparkdraw’s scope-creep early warning.
          </p>
        </div>
        {isAdmin ? (
          <Button
            variant="secondary"
            size="sm"
            className="border-0"
            disabled={recomputingAll}
            onClick={onRecomputeAll}
          >
            <IconRefresh size={14} className={cn(recomputingAll && 'animate-spin')} />
            {recomputingAll ? 'Recomputing…' : 'Recompute all'}
          </Button>
        ) : null}
      </div>

      <div className="sd-ai-panel__body">
        {loading ? (
          <div className="sd-ai-skeleton-stack">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : healthList.length === 0 ? (
          <div className="sd-ai-empty">
            <IconHeartbeat size={22} stroke={1.5} />
            <p className="sd-ai-empty__title">No health scores yet</p>
            <p className="sd-ai-empty__desc">
              Health scores appear once projects have activity. Admins can trigger a recompute anytime.
            </p>
          </div>
        ) : (
          healthList.map((item) => (
            <HealthRow
              key={item.project_id}
              item={item}
              isAdmin={isAdmin}
              recomputing={recomputingId === item.project_id}
              onRecompute={onRecomputeOne}
            />
          ))
        )}
      </div>
    </section>
  )
}
