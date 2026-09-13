import { cn } from '@/lib/utils'

export default function DashboardActivityFeed({ items = [], loading = false }) {
  return (
    <section className="sd-dash-v2__panel sd-dash-v2__panel--feed">
      <header className="sd-dash-v2__panel-head">
        <div>
          <h2 className="sd-dash-v2__panel-title">Activity Feed</h2>
          <p className="sd-dash-v2__panel-desc">Latest alerts & project signals</p>
        </div>
      </header>

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading activity…</p>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No recent activity yet.
        </p>
      ) : (
        <ul className="sd-dash-v2__feed">
          {items.map((item) => (
            <li key={item.id} className="sd-dash-v2__feed-item">
              <span
                className={cn(
                  'sd-dash-v2__feed-dot',
                  item.tone === 'warn' || item.tone === 'warning' || item.tone === 'amber'
                    ? 'is-warn'
                    : item.tone === 'danger' || item.tone === 'red'
                      ? 'is-danger'
                      : 'is-info',
                )}
                aria-hidden
              />
              <div className="sd-dash-v2__feed-body">
                <p>{item.text}</p>
                {item.time ? <span>{item.time}</span> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
