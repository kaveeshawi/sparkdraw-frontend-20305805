export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const MINI_WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

export function toDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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
