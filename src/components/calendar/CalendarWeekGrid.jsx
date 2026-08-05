import { IconClock } from '@tabler/icons-react'
import { cn, getInitials } from '@/lib/utils'
import { addDays, formatTimeRange, minutesFromMidnight, startOfWeekMonday, toDateKey, WEEKDAY_LABELS } from './calendar-utils'

const HOUR_START = 9
const HOUR_END = 18
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
    const end = minutesFromMidnight(event.endH, event.endM)
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
  const start = minutesFromMidnight(event.startH, event.startM)
  return ((start - HOUR_START * 60) / TOTAL_MINUTES) * 100
}

function eventHeightPct(event) {
  const start = minutesFromMidnight(event.startH, event.startM)
  const end = minutesFromMidnight(event.endH, event.endM)
  return Math.max(((end - start) / TOTAL_MINUTES) * 100, 8)
}

function EventCard({ event }) {
  const tone = TONE_STYLES[event.tone] || TONE_STYLES.blue
  const widthPct = 100 / event.cols
  const leftPct = event.col * widthPct

  return (
    <article
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
    >
      <h4 className="sd-cal-v2__event-title">{event.title}</h4>
      <p className="sd-cal-v2__event-sub">{event.subtitle}</p>
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

export default function CalendarWeekGrid({ focusDate, events }) {
  const weekStart = startOfWeekMonday(focusDate)
  const days = Array.from({ length: 4 }, (_, i) => addDays(weekStart, i))
  const focusKey = toDateKey(focusDate)
  const hourLabels = Array.from({ length: SLOT_COUNT + 1 }, (_, i) => HOUR_START + i)

  const eventsByDay = days.map((day, dayIndex) =>
    layoutOverlaps(events.filter((e) => e.dayOffset === dayIndex)),
  )

  return (
    <div className="sd-cal-v2__week">
      <div className="sd-cal-v2__week-head">
        <span className="sd-cal-v2__tz">GMT+07</span>
        {days.map((day, i) => {
          const isFocus = toDateKey(day) === focusKey
          return (
            <div key={i} className={cn('sd-cal-v2__day-head', isFocus && 'is-focus')}>
              <span className="sd-cal-v2__day-name">{WEEKDAY_LABELS[i]}</span>
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
        <div className="sd-cal-v2__day-cols">
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
            <div key={day.toISOString()} className="sd-cal-v2__day-col">
              {eventsByDay[dayIndex].map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
