export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const MINI_WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

export const FILTER_OPTIONS = [
  { id: 'meetings', label: 'Meetings', defaultChecked: true },
  { id: 'tasks', label: 'Task Due Dates', defaultChecked: true },
  { id: 'milestones', label: 'Milestones', defaultChecked: true },
  { id: 'deadlines', label: 'Deadlines', defaultChecked: true },
  { id: 'personal', label: 'Personal Events', defaultChecked: true },
  { id: 'birthdays', label: 'Birthdays', defaultChecked: false },
]

export const EVENT_TYPE_OPTIONS = [
  { value: 'meetings', label: 'Meeting' },
  { value: 'personal', label: 'Personal' },
  { value: 'deadlines', label: 'Deadline' },
  { value: 'milestones', label: 'Milestone' },
  { value: 'tasks', label: 'Task' },
  { value: 'birthdays', label: 'Birthday' },
]

export function toDateKey(d) {
  const date = d instanceof Date ? d : new Date(d)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function startOfWeekMonday(d) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

export function addDays(d, n) {
  const next = new Date(d)
  next.setDate(next.getDate() + n)
  return next
}

export function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1)
  const startOffset = (first.getDay() + 6) % 7 // Monday-first
  const gridStart = new Date(year, month, 1 - startOffset)
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
}

export function formatHeaderDate(d) {
  const month = d.toLocaleDateString('en-GB', { month: 'long' })
  return `${month}, ${d.getDate()} ${d.getFullYear()}`
}

export function minutesFromMidnight(h, m = 0) {
  return h * 60 + m
}

export function formatTimeRange(startH, startM, endH, endM) {
  const fmt = (h, m) => {
    const period = h >= 12 ? 'PM' : 'AM'
    const hour = h % 12 || 12
    return `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`
  }
  return `${fmt(startH, startM)} - ${fmt(endH, endM)}`
}

export function pad2(n) {
  return String(n).padStart(2, '0')
}

export function toLocalInputValue(date) {
  const d = date instanceof Date ? date : new Date(date)
  return `${toDateKey(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

export function localInputToIso(value) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

/** Map API event → grid event shape */
export function normalizeCalendarEvent(raw) {
  const start = new Date(raw.starts_at)
  const end = new Date(raw.ends_at)
  const startH = start.getHours()
  const startM = start.getMinutes()
  const endH = end.getHours()
  const endM = end.getMinutes()

  return {
    id: raw.id,
    source: raw.source || 'calendar',
    editable: Boolean(raw.editable),
    type: raw.type || 'meetings',
    title: raw.title,
    subtitle: raw.subtitle || raw.project_name || '',
    description: raw.description || '',
    dateKey: toDateKey(start),
    startH,
    startM,
    endH,
    endM,
    allDay: Boolean(raw.all_day),
    tone: raw.tone || 'blue',
    avatars: raw.creator_name ? [raw.creator_name] : [],
    startsAt: raw.starts_at,
    endsAt: raw.ends_at,
    projectId: raw.project_id,
    createdBy: raw.created_by,
  }
}

export function rangeForView(focusDate, viewMode) {
  if (viewMode === 'Daily') {
    const day = new Date(focusDate)
    day.setHours(0, 0, 0, 0)
    const end = addDays(day, 1)
    return { from: toDateKey(day), to: toDateKey(end) }
  }

  if (viewMode === 'Monthly') {
    const start = new Date(focusDate.getFullYear(), focusDate.getMonth(), 1)
    const end = new Date(focusDate.getFullYear(), focusDate.getMonth() + 1, 0)
    // pad a week either side for month grid edges
    return {
      from: toDateKey(addDays(start, -7)),
      to: toDateKey(addDays(end, 7)),
    }
  }

  // Weekly — Mon–Sun
  const weekStart = startOfWeekMonday(focusDate)
  return {
    from: toDateKey(weekStart),
    to: toDateKey(addDays(weekStart, 6)),
  }
}
