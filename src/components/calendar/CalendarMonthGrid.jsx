import { cn } from '@/lib/utils'
import { buildMonthGrid, toDateKey, WEEKDAY_LABELS } from './calendar-utils'

const TONE_DOT = {
  pink: '#ec4899',
  blue: '#3b82f6',
  purple: '#8b5cf6',
  peach: '#f97316',
}

export default function CalendarMonthGrid({
  focusDate,
  events,
  onSelectDate,
  onSelectEvent,
}) {
  const grid = buildMonthGrid(focusDate.getFullYear(), focusDate.getMonth())
  const focusKey = toDateKey(focusDate)
  const todayKey = toDateKey(new Date())
  const month = focusDate.getMonth()

  const byDay = events.reduce((acc, event) => {
    const key = event.dateKey
    if (!acc[key]) acc[key] = []
    acc[key].push(event)
    return acc
  }, {})

  return (
    <div className="sd-cal-v2__month">
      <div className="sd-cal-v2__month-weekdays">
        {WEEKDAY_LABELS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="sd-cal-v2__month-grid">
        {grid.map((day) => {
          const key = toDateKey(day)
          const dayEvents = byDay[key] || []
          const inMonth = day.getMonth() === month
          return (
            <button
              key={key}
              type="button"
              className={cn(
                'sd-cal-v2__month-cell',
                !inMonth && 'is-muted',
                key === todayKey && 'is-today',
                key === focusKey && 'is-selected',
              )}
              onClick={() => onSelectDate?.(day)}
            >
              <span className="sd-cal-v2__month-daynum">{day.getDate()}</span>
              <ul className="sd-cal-v2__month-events">
                {dayEvents.slice(0, 3).map((event) => (
                  <li key={event.id}>
                    <span
                      className="sd-cal-v2__month-event"
                      style={{ '--dot': TONE_DOT[event.tone] || TONE_DOT.blue }}
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectEvent?.(event)
                      }}
                    >
                      {event.title}
                    </span>
                  </li>
                ))}
                {dayEvents.length > 3 ? (
                  <li className="sd-cal-v2__month-more">+{dayEvents.length - 3} more</li>
                ) : null}
              </ul>
            </button>
          )
        })}
      </div>
    </div>
  )
}
