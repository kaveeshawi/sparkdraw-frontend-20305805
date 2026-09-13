import { Link } from 'react-router-dom'
import { IconCalendar, IconCircleCheck, IconCircleDashed } from '@tabler/icons-react'
import { cn } from '@/lib/utils'

export default function DashboardFocusToday({ items = [] }) {
  return (
    <article className="sd-dash-v2__focus-card">
      <h3 className="sd-dash-v2__focus-title">My Focus Today</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground" style={{ marginBottom: '0.75rem' }}>
          Nothing urgent right now — check the calendar for upcoming work.
        </p>
      ) : (
        <ul className="sd-dash-v2__focus-list">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                to={item.href || '/projects'}
                className={cn('sd-dash-v2__focus-item', item.tone && `is-${item.tone}`)}
              >
                <span className="sd-dash-v2__focus-check" aria-hidden>
                  {item.done ? (
                    <IconCircleCheck size={16} stroke={1.75} />
                  ) : (
                    <IconCircleDashed size={16} stroke={1.75} />
                  )}
                </span>
                <span className="sd-dash-v2__focus-label">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link to="/calendar" className="sd-dash-v2__focus-link">
        <IconCalendar size={16} stroke={1.75} />
        View calendar
      </Link>
    </article>
  )
}
