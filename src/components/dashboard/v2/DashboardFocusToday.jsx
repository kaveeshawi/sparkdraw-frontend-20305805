import { useState } from 'react'
import { Link } from 'react-router-dom'
import { IconCalendar } from '@tabler/icons-react'
import { FOCUS_TODAY } from '../dashboard-demo-data'

export default function DashboardFocusToday() {
  const [items, setItems] = useState(FOCUS_TODAY)

  const toggle = (id) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item)))
  }

  return (
    <article className="sd-dash-v2__focus-card">
      <h3 className="sd-dash-v2__focus-title">My Focus Today</h3>
      <ul className="sd-dash-v2__focus-list">
        {items.map((item) => (
          <li key={item.id}>
            <label className="sd-dash-v2__focus-item">
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => toggle(item.id)}
                className="sd-dash-v2__focus-check"
              />
              <span className={`sd-dash-v2__focus-text${item.done ? ' is-done' : ''}`}>
                {item.label}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <Link to="/calendar" className="sd-dash-v2__focus-link">
        <IconCalendar size={16} stroke={1.75} />
        View calendar
      </Link>
    </article>
  )
}
