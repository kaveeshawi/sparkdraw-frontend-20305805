import { Link } from 'react-router-dom'
import { IconCalendar } from '@tabler/icons-react'

export default function DashboardFocusToday() {
  return (
    <article className="sd-dash-v2__focus-card">
      <h3 className="sd-dash-v2__focus-title">My Focus Today</h3>
      <p className="text-sm text-muted-foreground" style={{ marginBottom: '0.75rem' }}>
        Insufficient events — personal focus tasks will show here when wired to live assignments.
      </p>
      <Link to="/calendar" className="sd-dash-v2__focus-link">
        <IconCalendar size={16} stroke={1.75} />
        View calendar
      </Link>
    </article>
  )
}
