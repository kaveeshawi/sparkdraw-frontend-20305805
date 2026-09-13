import { Link } from 'react-router-dom'
import { IconSparkles } from '@tabler/icons-react'
import { Skeleton } from '@/components/ui/skeleton'
import { ALERT_CONFIG, timeAgo } from './shared'

export default function AlertsSection({ loading, alerts = [] }) {
  return (
    <section className="sd-ai-panel">
      <div className="sd-ai-panel__head">
        <div>
          <h2 className="sd-ai-panel__title">AI alerts</h2>
          <p className="sd-ai-panel__desc">
            Live signals from health, revisions, deadlines, sentiment, and NLP tickets.
          </p>
        </div>
      </div>

      <div className="sd-ai-panel__body">
        {loading ? (
          <div className="sd-ai-skeleton-stack">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="sd-ai-empty">
            <IconSparkles size={22} stroke={1.5} />
            <p className="sd-ai-empty__title">No recent AI alerts</p>
            <p className="sd-ai-empty__desc">
              When delivery risk or sentiment dips, alerts land here automatically.
            </p>
          </div>
        ) : (
          alerts.map((a) => {
            const cfg = ALERT_CONFIG[a.event_type] || ALERT_CONFIG.ai_ticket_generated
            const AlertIcon = cfg.Icon
            return (
              <div key={a.id} className="sd-ai-row">
                <div className="sd-ai-row__main">
                  <div className={cfg.className}>
                    <AlertIcon size={15} stroke={1.75} />
                  </div>
                  <div className="sd-ai-row__copy">
                    <p className="sd-ai-row__title">{cfg.label}</p>
                    <p className="sd-ai-row__meta">
                      {a.project_name || 'Agency'} · {timeAgo(a.created_at)}
                    </p>
                  </div>
                  {a.project_id ? (
                    <Link to={`/projects/${a.project_id}/kanban`} className="sd-ai-row__link">
                      Open
                    </Link>
                  ) : null}
                </div>
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}
