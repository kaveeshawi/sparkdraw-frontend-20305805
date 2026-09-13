import { IconClock } from '@tabler/icons-react'
import { cn, getInitials } from '@/lib/utils'
import {
  addDays,
  formatTimeRange,
  minutesFromMidnight,
  startOfWeekMonday,
  toDateKey,
  WEEKDAY_LABELS,
} from './calendar-utils'

const HOUR_START = 8
const HOUR_END = 19
const SLOT_COUNT = HOUR_END - HOUR_START
const TOTAL_MINUTES = SLOT_COUNT * 60

const TONE_STYLES = {
  pink: { bg: '#fce7f3', border: '#f9a8d4', text: '#831843' },
  blue: { bg: '#dbeafe', border: '#93c5fd', text: '#1e3a8a' },
  purple: { bg: '#ede9fe', border: '#c4b5fd', text: '#4c1d95' },
  peach: { bg: '#ffedd5', border: '#fdba74', text: '#9a3412' },
}

function layoutOverlaps(events) {
  const sorted = [...events].sort(
    (a, b) => minutesFromMidnight(a.startH, a.startM) - minutesFromMidnight(b.startH, b.startM),
  )
  const placed = sorted.map((event) => {
    const start = minutesFromMidnight(event.startH, event.startM)
    const end = Math.max(minutesFromMidnight(event.endH, event.endM), start + 30)
    return { ...event, start, end, col: 0, cols: 1 }
  })

  for (let i = 0; i < placed.length; i += 1) {
    const used = new Set()
    for (let j = 0; j < i; j += 1) {
      if (placed[i].start < placed[j].end && placed[i].end > placed[j].start) {
        used.add(placed[j].col)
      }
    }
    let col = 0
    while (used.has(col)) col += 1
    placed[i].col = col
  }

  for (let i = 0; i < placed.length; i += 1) {
    let maxCol = placed[i].col
    for (let j = 0; j < placed.length; j += 1) {
      if (i === j) continue
      if (placed[i].start < placed[j].end && placed[i].end > placed[j].start) {
        maxCol = Math.max(maxCol, placed[j].col)
      }
    }
    placed[i].cols = maxCol + 1
  }

  return placed
}

function eventTopPct(event) {
  const start = Math.max(minutesFromMidnight(event.startH, event.startM), HOUR_START * 60)
  return ((start - HOUR_START * 60) / TOTAL_MINUTES) * 100
}

function eventHeightPct(event) {
  const start = minutesFromMidnight(event.startH, event.startM)
  const end = Math.max(minutesFromMidnight(event.endH, event.endM), start + 30)
  const clampedStart = Math.max(start, HOUR_START * 60)
  const clampedEnd = Math.min(end, HOUR_END * 60)
  return Math.max(((clampedEnd - clampedStart) / TOTAL_MINUTES) * 100, 8)
}

function EventCard({ event, onSelect }) {
  const tone = TONE_STYLES[event.tone] || TONE_STYLES.blue
  const widthPct = 100 / event.cols
  const leftPct = event.col * widthPct

  return (
    <article
      role="button"
      tabIndex={0}
      className="sd-cal-v2__event"
      style={{
        top: `${eventTopPct(event)}%`,
        height: `${eventHeightPct(event)}%`,
        left: `calc(${leftPct}% + 4px)`,
        width: `calc(${widthPct}% - 8px)`,
        background: tone.bg,
        borderColor: tone.border,
        color: tone.text,
      }}
      onClick={() => onSelect?.(event)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect?.(event)
      }}
    >
      <h4 className="sd-cal-v2__event-title">{event.title}</h4>
      {event.subtitle ? <p className="sd-cal-v2__event-sub">{event.subtitle}</p> : null}
      <p className="sd-cal-v2__event-time">
        <IconClock size={12} stroke={1.75} />
        {formatTimeRange(event.startH, event.startM, event.endH, event.endM)}
      </p>
      <div className="sd-cal-v2__avatar-row">
        {(event.avatars || []).slice(0, 3).map((a) => (
          <span key={a} className="sd-cal-v2__avatar sd-cal-v2__avatar--sm">
            {getInitials(a)}
          </span>
        ))}
      </div>
    </article>
  )
}

export default function CalendarWeekGrid({
  focusDate,
  events,
  dayCount = 5,
  onSelectEvent,
  onSlotClick,
}) {
  const weekStart = startOfWeekMonday(focusDate)
  const days = dayCount === 1
    ? [new Date(focusDate.getFullYear(), focusDate.getMonth(), focusDate.getDate())]
    : Array.from({ length: dayCount }, (_, i) => addDays(weekStart, i))
  const focusKey = toDateKey(focusDate)
  const hourLabels = Array.from({ length: SLOT_COUNT + 1 }, (_, i) => HOUR_START + i)

  const eventsByDay = days.map((day) => {
    const key = toDateKey(day)
    return layoutOverlaps(events.filter((e) => e.dateKey === key))
  })

  const weekdayFor = (day) => WEEKDAY_LABELS[(day.getDay() + 6) % 7]

  return (
    <div className="sd-cal-v2__week" data-days={dayCount}>
      <div
        className="sd-cal-v2__week-head"
        style={{ gridTemplateColumns: `4.5rem repeat(${dayCount}, minmax(0, 1fr))` }}
      >
        <span className="sd-cal-v2__tz">Local</span>
        {days.map((day) => {
          const isFocus = toDateKey(day) === focusKey
          return (
            <div key={toDateKey(day)} className={cn('sd-cal-v2__day-head', isFocus && 'is-focus')}>
              <span className="sd-cal-v2__day-name">{weekdayFor(day)}</span>
              <span className={cn('sd-cal-v2__day-num', isFocus && 'is-focus')}>{day.getDate()}</span>
            </div>
          )
        })}
      </div>

      <div className="sd-cal-v2__week-body">
        <div
          className="sd-cal-v2__time-col"
          style={{ gridTemplateRows: `repeat(${SLOT_COUNT + 1}, 1fr)` }}
        >
          {hourLabels.map((h) => (
            <div key={h} className="sd-cal-v2__time-slot">
              {String(h).padStart(2, '0')} {h >= 12 ? 'PM' : 'AM'}
            </div>
          ))}
        </div>
        <div
          className="sd-cal-v2__day-cols"
          style={{ gridTemplateColumns: `repeat(${dayCount}, minmax(0, 1fr))` }}
        >
          {hourLabels.slice(0, -1).map((h, i) => (
            <div
              key={`line-${h}`}
              className="sd-cal-v2__grid-line"
              style={{ top: `${(i / SLOT_COUNT) * 100}%` }}
            />
          ))}
          <div
            className="sd-cal-v2__grid-line sd-cal-v2__grid-line--end"
            style={{ top: '100%' }}
          />
          {days.map((day, dayIndex) => (
            <div
              key={toDateKey(day)}
              className="sd-cal-v2__day-col"
              onDoubleClick={() => onSlotClick?.(day)}
            >
              {eventsByDay[dayIndex].map((event) => (
                <EventCard key={event.id} event={event} onSelect={onSelectEvent} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
