import {
  IconAlertTriangle,
  IconCheckbox,
  IconMessageCircle,
  IconReceipt,
} from '@tabler/icons-react'
import { ACTIVITY_FEED } from '../dashboard-demo-data'

const FEED_ICONS = {
  check: IconCheckbox,
  message: IconMessageCircle,
  task: IconCheckbox,
  alert: IconAlertTriangle,
  invoice: IconReceipt,
}

export default function DashboardActivityFeed() {
  return (
    <section className="sd-dash-v2__panel sd-dash-v2__panel--feed">
      <header className="sd-dash-v2__panel-head">
        <div>
          <h2 className="sd-dash-v2__panel-title">Activity Feed</h2>
          <p className="sd-dash-v2__panel-desc">Latest events across projects</p>
        </div>
      </header>

      <ul className="sd-dash-v2__feed">
        {ACTIVITY_FEED.map((item) => {
          const Icon = FEED_ICONS[item.icon] || IconMessageCircle
          return (
            <li key={item.id} className="sd-dash-v2__feed-item">
              <span className="sd-dash-v2__feed-time">{item.time}</span>
              <div className="sd-dash-v2__feed-body">
                <span className="sd-dash-v2__feed-icon" aria-hidden>
                  <Icon size={14} stroke={1.75} />
                </span>
                <div className="sd-dash-v2__feed-content">
                  <p className="sd-dash-v2__feed-text">{item.text}</p>
                  <p className="sd-dash-v2__feed-project">{item.project}</p>
                </div>
                <span className="sd-dash-v2__feed-avatar" title={item.user}>
                  {item.avatar}
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
