import { IconChevronDown, IconChevronLeft, IconChevronRight, IconChevronUp, IconClock, IconX } from '@tabler/icons-react'
import { cn, getInitials } from '@/lib/utils'
import { FILTER_OPTIONS } from './calendar-demo-events'
import { buildMonthGrid, formatTimeRange, MINI_WEEKDAYS, toDateKey } from './calendar-utils'

function MiniAvatar({ label, className }) {
  return (
    <span className={cn('sd-cal-v2__avatar', className)}>{getInitials(label)}</span>
  )
}

export default function CalendarSidebar({
  monthCursor,
  focusDate,
  onMonthChange,
  onSelectDate,
  filters,
  onToggleFilter,
  reminderEvent,
  filtersOpen,
  onToggleFilters,
  otherOpen,
  onToggleOther,
}) {
  const grid = buildMonthGrid(monthCursor.getFullYear(), monthCursor.getMonth())
  const todayKey = toDateKey(new Date())
  const focusKey = toDateKey(focusDate)
  const monthLabel = monthCursor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  return (
    <aside className="sd-cal-v2__sidebar">
      <div className="sd-cal-v2__mini">
        <div className="sd-cal-v2__mini-head">
          <button
            type="button"
            className="sd-cal-v2__icon-btn"
            aria-label="Previous month"
            onClick={() => onMonthChange(-1)}
          >
            <IconChevronLeft size={16} stroke={2} />
          </button>
          <span className="sd-cal-v2__mini-title">{monthLabel}</span>
          <button
            type="button"
            className="sd-cal-v2__icon-btn"
            aria-label="Next month"
            onClick={() => onMonthChange(1)}
          >
            <IconChevronRight size={16} stroke={2} />
          </button>
        </div>
        <div className="sd-cal-v2__mini-weekdays">
          {MINI_WEEKDAYS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="sd-cal-v2__mini-grid">
          {grid.map((d) => {
            const key = toDateKey(d)
            const inMonth = d.getMonth() === monthCursor.getMonth()
            const isToday = key === todayKey
            const isFocus = key === focusKey
            return (
              <button
                key={key}
                type="button"
                className={cn(
                  'sd-cal-v2__mini-day',
                  !inMonth && 'is-muted',
                  isToday && 'is-today',
                  isFocus && 'is-selected',
                )}
                onClick={() => onSelectDate(d)}
              >
                {d.getDate()}
              </button>
            )
          })}
        </div>
      </div>

      {reminderEvent ? (
        <div className="sd-cal-v2__reminder">
          <p className="sd-cal-v2__reminder-label">Meeting reminder</p>
          <h3 className="sd-cal-v2__reminder-title">{reminderEvent.title}</h3>
          <p className="sd-cal-v2__reminder-time">
            <IconClock size={14} stroke={1.75} />
            {formatTimeRange(
              reminderEvent.startH,
              reminderEvent.startM,
              reminderEvent.endH,
              reminderEvent.endM,
            )}
          </p>
          <div className="sd-cal-v2__reminder-foot">
            <div className="sd-cal-v2__avatar-row">
              {(reminderEvent.avatars || []).slice(0, 3).map((a) => (
                <MiniAvatar key={a} label={a} />
              ))}
              {(reminderEvent.avatars || []).length > 3 ? (
                <span className="sd-cal-v2__avatar-more">
                  +{(reminderEvent.avatars || []).length - 3}
                </span>
              ) : null}
            </div>
            <div className="sd-cal-v2__reminder-actions">
              <button type="button" className="sd-cal-v2__reminder-btn sd-cal-v2__reminder-btn--dismiss" aria-label="Dismiss">
                <IconX size={14} stroke={2} />
              </button>
              <button type="button" className="sd-cal-v2__reminder-btn sd-cal-v2__reminder-btn--accept" aria-label="Accept">
                ✓
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="sd-cal-v2__filters">
        <button type="button" className="sd-cal-v2__filters-head" onClick={onToggleFilters}>
          <span>Filters</span>
          {filtersOpen ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
        </button>
        {filtersOpen ? (
          <ul className="sd-cal-v2__filters-list">
            {FILTER_OPTIONS.map((opt) => (
              <li key={opt.id}>
                <label className="sd-cal-v2__filter-item">
                  <input
                    type="checkbox"
                    checked={Boolean(filters[opt.id])}
                    onChange={() => onToggleFilter(opt.id)}
                  />
                  <span className="sd-cal-v2__checkbox" aria-hidden />
                  <span>{opt.label}</span>
                </label>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <button type="button" className="sd-cal-v2__other" onClick={onToggleOther}>
        <span>Other Calendars</span>
        {otherOpen ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
      </button>
    </aside>
  )
}
