import { cn } from '@/lib/utils'

const FLAG_STYLES = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  red: 'bg-red-50 text-red-700 ring-red-100',
  none: 'bg-purple-50 text-purple-700 ring-purple-100',
}

function HealthScoreBadge({ score, flag = 'none' }) {
  const display = score !== null && score !== undefined ? score : '—'

  return (
    <div
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold tabular-nums ring-1 ring-inset',
        FLAG_STYLES[flag] || FLAG_STYLES.none
      )}
    >
      {display}
    </div>
  )
}

export default function HealthScoreRow({ item, isLast = false }) {
  const reason = Array.isArray(item.reasons) ? item.reasons[0] : item.reasons

  return (
    <div className={cn('sd-row', !isLast && 'border-t-0')}>
      <HealthScoreBadge score={item.score} flag={item.flag} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {item.project?.name || item.project_name || '—'}
        </p>
        {reason && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{reason}</p>
        )}
      </div>
    </div>
  )
}
