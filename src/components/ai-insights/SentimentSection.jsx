import { Link } from 'react-router-dom'
import { IconMoodSad } from '@tabler/icons-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { getInitials } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { sentimentBarWidth, timeAgo } from './shared'

export default function SentimentSection({ loading, clients = [] }) {
  const atRisk = clients.filter((c) => c.at_risk)
  const list = atRisk.length ? atRisk : clients.slice(0, 12)

  return (
    <section className="sd-ai-panel">
      <div className="sd-ai-panel__head">
        <div>
          <h2 className="sd-ai-panel__title">Client sentiment</h2>
          <p className="sd-ai-panel__desc">
            Message-level sentiment rollups — three negatives in a row flag a relationship at risk.
          </p>
        </div>
      </div>

      <div className="sd-ai-panel__body">
        {loading ? (
          <div className="sd-ai-skeleton-stack">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : list.length === 0 ? (
          <div className="sd-ai-empty">
            <IconMoodSad size={22} stroke={1.5} />
            <p className="sd-ai-empty__title">No sentiment signals yet</p>
            <p className="sd-ai-empty__desc">
              Client messages and portal feedback feed this timeline once scored by AI.
            </p>
          </div>
        ) : (
          <>
            {atRisk.length === 0 ? (
              <p className="sd-ai-panel__banner">All monitored clients look stable right now.</p>
            ) : (
              <p className="sd-ai-panel__banner sd-ai-panel__banner--warn">
                {atRisk.length} client{atRisk.length === 1 ? '' : 's'} flagged as relationship at risk.
              </p>
            )}
            <div className="sd-ai-sentiment-grid">
              {list.map((c) => (
                <div
                  key={c.client_id}
                  className={cn('sd-ai-sentiment-card', c.at_risk && 'is-risk')}
                >
                  <Avatar className="size-10 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                      {getInitials(c.client_name || 'Client')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="sd-ai-row__title truncate">{c.client_name || 'Client'}</p>
                    <p className="sd-ai-row__meta truncate">
                      {c.sentiment_label || 'neutral'} · last {timeAgo(c.last_message_at)}
                    </p>
                    <div className="sd-ai-sentiment-bar" aria-hidden>
                      <span
                        className={cn('sd-ai-sentiment-bar__fill', c.at_risk ? 'is-risk' : 'is-ok')}
                        style={{ width: sentimentBarWidth(c.latest_score) }}
                      />
                    </div>
                  </div>
                  {c.client_id ? (
                    <Link to={`/clients`} className="sd-ai-row__link">
                      Clients
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
