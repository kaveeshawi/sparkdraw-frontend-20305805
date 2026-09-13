const STORAGE_KEY = 'sparkdraw.attendanceSettings'
const DAY_META_KEY = 'sparkdraw.attendanceDayMeta'

export const DAY_OPTIONS = [
  { id: 1, label: 'Mon', full: 'Monday' },
  { id: 2, label: 'Tue', full: 'Tuesday' },
  { id: 3, label: 'Wed', full: 'Wednesday' },
  { id: 4, label: 'Thu', full: 'Thursday' },
  { id: 5, label: 'Fri', full: 'Friday' },
  { id: 6, label: 'Sat', full: 'Saturday' },
  { id: 0, label: 'Sun', full: 'Sunday' },
]

export const DEFAULT_ATTENDANCE_SETTINGS = {
  workingDays: [1, 2, 3, 4, 5], // Mon–Fri
  holidays: [
    { id: 'poya-2026-09-07', date: '2026-09-07', label: 'Poya Day' },
    { id: 'poya-2026-09-26', date: '2026-09-26', label: 'Poya Day' },
  ],
}

function normalize(raw) {
  const workingDays = Array.isArray(raw?.workingDays)
    ? [...new Set(raw.workingDays.map(Number).filter((d) => d >= 0 && d <= 6))]
    : [...DEFAULT_ATTENDANCE_SETTINGS.workingDays]

  const holidays = Array.isArray(raw?.holidays)
    ? raw.holidays
      .filter((h) => h && typeof h.date === 'string' && h.date)
      .map((h) => ({
        id: String(h.id || h.date),
        date: h.date.slice(0, 10),
        label: String(h.label || 'Holiday').trim() || 'Holiday',
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
    : [...DEFAULT_ATTENDANCE_SETTINGS.holidays]

  return {
    workingDays: workingDays.length ? workingDays : [...DEFAULT_ATTENDANCE_SETTINGS.workingDays],
    holidays,
  }
}

export function loadAttendanceSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_ATTENDANCE_SETTINGS, holidays: [...DEFAULT_ATTENDANCE_SETTINGS.holidays] }
    return normalize(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_ATTENDANCE_SETTINGS, holidays: [...DEFAULT_ATTENDANCE_SETTINGS.holidays] }
  }
}

export function saveAttendanceSettings(next) {
  const normalized = normalize(next)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  window.dispatchEvent(new CustomEvent('sparkdraw:attendance-settings', { detail: normalized }))
  return normalized
}

export function holidayOnDate(settings, isoDate) {
  return (settings?.holidays || []).find((h) => h.date === isoDate) || null
}

export function isWorkingDow(settings, dow) {
  return (settings?.workingDays || []).includes(dow)
}

export function toIsoDate(year, monthIndex, day) {
  const m = String(monthIndex + 1).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${year}-${m}-${d}`
}

function loadAllDayMeta() {
  try {
    const raw = localStorage.getItem(DAY_META_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function loadMemberDayMeta(memberId) {
  const all = loadAllDayMeta()
  const key = String(memberId || '0')
  const entry = all[key]
  return entry && typeof entry === 'object' ? entry : {}
}

export function getDayMeta(memberId, isoDate) {
  const meta = loadMemberDayMeta(memberId)[isoDate]
  if (!meta || typeof meta !== 'object') return { note: '', cover: false }
  return {
    note: typeof meta.note === 'string' ? meta.note : '',
    cover: Boolean(meta.cover),
  }
}

export function saveDayMeta(memberId, isoDate, patch) {
  const all = loadAllDayMeta()
  const key = String(memberId || '0')
  const member = { ...(all[key] || {}) }
  const prev = member[isoDate] || {}
  const next = {
    note: patch.note !== undefined ? String(patch.note) : (prev.note || ''),
    cover: patch.cover !== undefined ? Boolean(patch.cover) : Boolean(prev.cover),
  }

  if (!next.note.trim() && !next.cover) {
    delete member[isoDate]
  } else {
    member[isoDate] = {
      note: next.note.trim(),
      cover: next.cover,
    }
  }

  if (Object.keys(member).length === 0) delete all[key]
  else all[key] = member

  localStorage.setItem(DAY_META_KEY, JSON.stringify(all))
  window.dispatchEvent(new CustomEvent('sparkdraw:attendance-day-meta', {
    detail: { memberId: key, isoDate, meta: member[isoDate] || { note: '', cover: false } },
  }))
  return member[isoDate] || { note: '', cover: false }
}
