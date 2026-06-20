import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

function getInitials(name = '?') {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

function getSentimentMeta(score) {
  if (score > 0.3) return { label: 'positive', color: 'text-emerald-600', progress: 'bg-emerald-500' }
  if (score > -0.3) return { label: 'neutral', color: 'text-amber-600', progress: 'bg-amber-500' }
  return { label: 'declining', color: 'text-red-600', progress: 'bg-red-500' }
}

export default function SentimentRow({ item, isLast = false }) {
  const clientName = item.client?.company_name || item.client_name || '—'

  if (item.no_messages || item.latest_score === null) {
    return (
      <div className={cn('sd-row', !isLast && 'border-t-0')}>
        <Avatar size="sm">
          <AvatarFallback className="bg-primary/8 text-[10px] font-medium text-primary">
            {getInitials(clientName)}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm text-muted-foreground">{clientName} — No messages yet</span>
      </div>
    )
  }

  const score = item.score ?? item.latest_score ?? 0
  const meta = getSentimentMeta(score)
  const label = item.label || meta.label
  const barValue = Math.min(Math.abs(score) * 100, 100)

  const dateStr = (item.last_message_date || item.last_message_at)
    ? new Date(item.last_message_date || item.last_message_at).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
      })
    : null

  return (
    <div className={cn('sd-row', !isLast && 'border-t-0')}>
      <Avatar size="sm">
        <AvatarFallback className="bg-primary/8 text-[10px] font-medium text-primary">
          {getInitials(clientName)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium">{clientName}</p>
          <span className={cn('shrink-0 text-xs font-medium tabular-nums', meta.color)}>
            {score >= 0 ? '+' : ''}{Number(score).toFixed(2)}
          </span>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <Progress value={barValue} className="h-1 flex-1" indicatorColor={meta.progress} />
          <span className="shrink-0 text-[10px] capitalize text-muted-foreground">{label}</span>
        </div>
        {dateStr && <p className="mt-0.5 text-[10px] text-muted-foreground">{dateStr}</p>}
      </div>

      {item.at_risk && (
        <Badge variant="destructive" className="shrink-0 text-[10px]">At risk</Badge>
      )}
    </div>
  )
}
