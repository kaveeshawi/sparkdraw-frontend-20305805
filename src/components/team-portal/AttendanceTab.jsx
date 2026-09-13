import { useEffect, useMemo, useState } from 'react'
import {
  IconCalendarStats, IconCircleCheck, IconX, IconClockHour4, IconCalendarEvent,
  IconDownload, IconChevronLeft, IconChevronRight,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import { KpiCard, Panel, DataTable, StatusBadge } from './shared'
import { cn } from '@/lib/utils'
import {
  holidayOnDate,
  isWorkingDow,
  loadAttendanceSettings,
  loadMemberDayMeta,
  saveDayMeta,
  toIsoDate,
} from '@/lib/attendanceSettings'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const STATUS_META = {
  present: { label: 'Present', tone: 'present' },
  half: { label: 'Half day', tone: 'half' },
  late: { label: 'Late', tone: 'late' },
  absent: { label: 'Absent', tone: 'absent' },
  leave: { label: 'Leave', tone: 'leave' },
  cover: { label: 'Cover', tone: 'cover' },
  holiday: { label: 'Holiday', tone: 'holiday' },
  off: { label: '', tone: 'off' },
  upcoming: { label: '', tone: 'upcoming' },
}

const LEGEND = ['present', 'half', 'late', 'absent', 'leave', 'cover', 'holiday']

function isFutureIso(iso, todayIso) {
  return iso > todayIso
}

function attendanceStatus(year, monthIndex, day, seed, settings, todayIso, dayMeta) {
  const date = new Date(year, monthIndex, day)
  const iso = toIsoDate(year, monthIndex, day)

  // Cover overrides schedule — member worked covering a leave day
  if (dayMeta?.cover) {
    return { status: 'cover', holidayLabel: null }
  }

  const holiday = holidayOnDate(settings, iso)
  if (holiday) {
    return { status: 'holiday', holidayLabel: holiday.label }
  }
  if (!isWorkingDow(settings, date.getDay())) {
    return { status: 'off', holidayLabel: null }
  }
  if (todayIso && isFutureIso(iso, todayIso)) {
    return { status: 'upcoming', holidayLabel: null }
  }
  const r = ((day * seed * 13) % 23) / 23
  if (r > 0.94) return { status: 'absent', holidayLabel: null }
  if (r > 0.88) return { status: 'leave', holidayLabel: null }
  if (r > 0.82) return { status: 'half', holidayLabel: null }
  if (r > 0.74) return { status: 'late', holidayLabel: null }
  return { status: 'present', holidayLabel: null }
}

function defaultNote(status, holidayLabel) {
  const notesPool = {
    present: 'On-site — regular shift completed.',
    late: 'Traffic delay noted at check-in.',
    half: 'Half day approved for personal appointment.',
    leave: 'Leave approved by project manager.',
    cover: 'Covering for a teammate on leave.',
    absent: 'No attendance recorded for this day.',
    holiday: holidayLabel ? `${holidayLabel} — office closed.` : 'Agency holiday — office closed.',
    off: '',
    upcoming: '',
  }
  return notesPool[status] ?? ''
}

function dayDetails(year, monthIndex, day, seed, settings, todayIso, dayMeta) {
  const base = attendanceStatus(year, monthIndex, day, seed, settings, todayIso, dayMeta)
  const worked = ['present', 'late', 'half', 'cover'].includes(base.status)
  const otRoll = ((day * seed * 17) % 11)
  const otMinutes = worked && base.status !== 'half' && otRoll > 7
    ? 45 + (otRoll - 7) * 28
    : 0
  const savedNote = typeof dayMeta?.note === 'string' ? dayMeta.note : ''
  const note = savedNote || defaultNote(base.status, base.holidayLabel)

  return {
    ...base,
    checkIn: !worked ? null : base.status === 'late' ? '09:35 AM' : '09:02 AM',
    checkOut: !worked ? null : base.status === 'half' ? '01:00 PM' : otMinutes ? '07:05 PM' : '06:15 PM',
    hours: !worked
      ? null
      : base.status === 'half'
        ? '4h 00m'
        : base.status === 'late'
          ? '8h 40m'
          : otMinutes
            ? '9h 58m'
            : '9h 13m',
    otLabel: otMinutes
      ? `${Math.floor(otMinutes / 60)}h ${String(otMinutes % 60).padStart(2, '0')}m`
      : null,
    note,
    savedNote,
    isCover: Boolean(dayMeta?.cover),
  }
}

function buildMonthCells(year, monthIndex, seed, settings, todayIso, memberMeta) {
  const firstDow = new Date(year, monthIndex, 1).getDay()
  const mondayOffset = (firstDow + 6) % 7
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const cells = []

  for (let i = 0; i < mondayOffset; i += 1) {
    cells.push({ key: `pad-${i}`, empty: true })
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const iso = toIsoDate(year, monthIndex, day)
    const dayMeta = memberMeta[iso]
    const { status, holidayLabel } = attendanceStatus(year, monthIndex, day, seed, settings, todayIso, dayMeta)
    cells.push({
      key: `d-${day}`,
      day,
      status,
      holidayLabel,
      isToday: iso === todayIso,
      isFuture: isFutureIso(iso, todayIso),
    })
  }

  while (cells.length % 7 !== 0) {
    cells.push({ key: `trail-${cells.length}`, empty: true })
  }

  return cells
}

function detailCopy(status, holidayLabel) {
  if (status === 'holiday') return holidayLabel ? `${holidayLabel} — non-working day` : 'Agency holiday — non-working day'
  if (status === 'off') return 'Non-working day on the agency schedule'
  if (status === 'leave') return 'Approved leave — no check-in required'
  if (status === 'absent') return 'No check-in recorded'
  if (status === 'upcoming') return 'Future date — attendance will appear after this day'
  return null
}

export default function AttendanceTab({ member, data, canManage = false }) {
  const memberId = member?.id
  const seed = (Number(memberId) || 1) + 3
  const [settings, setSettings] = useState(() => loadAttendanceSettings())
  const [memberMeta, setMemberMeta] = useState(() => loadMemberDayMeta(memberId))
  const [today] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  })
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDay, setSelectedDay] = useState(() => today.getDate())
  const [noteDraft, setNoteDraft] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [logRange, setLogRange] = useState('this')
  const [logStatus, setLogStatus] = useState('all')

  useEffect(() => {
    const refreshSettings = () => setSettings(loadAttendanceSettings())
    const refreshMeta = () => setMemberMeta(loadMemberDayMeta(memberId))
    const onStorage = () => {
      refreshSettings()
      refreshMeta()
    }
    window.addEventListener('sparkdraw:attendance-settings', refreshSettings)
    window.addEventListener('sparkdraw:attendance-day-meta', refreshMeta)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('sparkdraw:attendance-settings', refreshSettings)
      window.removeEventListener('sparkdraw:attendance-day-meta', refreshMeta)
      window.removeEventListener('storage', onStorage)
    }
  }, [memberId])

  useEffect(() => {
    setMemberMeta(loadMemberDayMeta(memberId))
  }, [memberId])

  const year = cursor.getFullYear()
  const monthIndex = cursor.getMonth()
  const monthLabel = cursor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  const todayIso = toIsoDate(today.getFullYear(), today.getMonth(), today.getDate())
  const selectedIso = selectedDay ? toIsoDate(year, monthIndex, selectedDay) : null

  const cells = useMemo(
    () => buildMonthCells(year, monthIndex, seed, settings, todayIso, memberMeta),
    [year, monthIndex, seed, settings, todayIso, memberMeta],
  )

  const workingDaysCount = useMemo(() => {
    let totalDays = 0
    let working = 0
    cells.forEach((cell) => {
      if (cell.empty) return
      totalDays += 1
      if (cell.status !== 'off' && cell.status !== 'holiday') working += 1
    })
    return { working, totalDays }
  }, [cells])

  const logSourceMonth = useMemo(() => {
    if (logRange === 'last') return new Date(year, monthIndex - 1, 1)
    return new Date(year, monthIndex, 1)
  }, [logRange, year, monthIndex])

  const logRows = useMemo(() => {
    const ly = logSourceMonth.getFullYear()
    const lm = logSourceMonth.getMonth()
    const sourceCells = logRange === 'this'
      ? cells
      : buildMonthCells(ly, lm, seed, settings, todayIso, memberMeta)

    return sourceCells
      .filter((cell) => !cell.empty && !['off', 'upcoming', 'holiday'].includes(cell.status))
      .filter((cell) => logStatus === 'all' || cell.status === logStatus)
      .map((cell) => {
        const details = dayDetails(
          ly,
          lm,
          cell.day,
          seed,
          settings,
          todayIso,
          memberMeta[toIsoDate(ly, lm, cell.day)] || { note: '', cover: false },
        )
        const dateLabel = new Date(ly, lm, cell.day).toLocaleDateString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })
        return {
          key: `${ly}-${lm}-${cell.key}`,
          date: dateLabel,
          checkIn: details.checkIn || '—',
          checkOut: details.checkOut || '—',
          hours: details.hours || '—',
          status: cell.status,
          overtime: details.otLabel || '—',
        }
      })
  }, [cells, logRange, logStatus, logSourceMonth, seed, settings, todayIso, memberMeta])

  const selected = selectedDay
    ? dayDetails(
      year,
      monthIndex,
      selectedDay,
      seed,
      settings,
      todayIso,
      selectedIso ? (memberMeta[selectedIso] || { note: '', cover: false }) : null,
    )
    : null
  const selectedIsToday = selectedIso === todayIso
  const selectedIsNonWorking = Boolean(
    selectedDay
    && (
      holidayOnDate(settings, selectedIso)
      || !isWorkingDow(settings, new Date(year, monthIndex, selectedDay).getDay())
    ),
  )

  useEffect(() => {
    if (!selectedIso) {
      setNoteDraft('')
      return
    }
    const meta = memberMeta[selectedIso]
    const details = dayDetails(
      year,
      monthIndex,
      selectedDay,
      seed,
      settings,
      todayIso,
      meta || { note: '', cover: false },
    )
    setNoteDraft(meta?.note ?? details.savedNote ?? '')
  }, [selectedIso, selectedDay, year, monthIndex, seed, settings, todayIso, memberMeta])

  const shiftMonth = (delta) => {
    setCursor((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth() + delta, 1)
      if (next.getFullYear() === today.getFullYear() && next.getMonth() === today.getMonth()) {
        setSelectedDay(today.getDate())
      } else {
        setSelectedDay(null)
      }
      return next
    })
  }

  const handleSaveNote = () => {
    if (!canManage || !selectedIso) return
    setSavingNote(true)
    try {
      saveDayMeta(memberId, selectedIso, {
        note: noteDraft,
        cover: Boolean(memberMeta[selectedIso]?.cover),
      })
      setMemberMeta(loadMemberDayMeta(memberId))
      toast.success('Note saved')
    } finally {
      setSavingNote(false)
    }
  }

  const handleToggleCover = () => {
    if (!canManage || !selectedIso) return
    const nextCover = !Boolean(memberMeta[selectedIso]?.cover)
    saveDayMeta(memberId, selectedIso, {
      note: noteDraft,
      cover: nextCover,
    })
    setMemberMeta(loadMemberDayMeta(memberId))
    toast.success(nextCover ? 'Marked as cover day' : 'Cover mark removed')
  }

  const handleExportLog = () => {
    if (logRows.length === 0) {
      toast.error('Nothing to export')
      return
    }
    const firstName = String(member?.name || 'Employee').trim().split(/\s+/)[0] || 'Employee'
    const monthName = logSourceMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    const header = ['Employee', 'Month', 'Date', 'Check-in', 'Check-out', 'Working Hours', 'Status', 'Overtime']
    const lines = [
      header.join(','),
      ...logRows.map((r) => [firstName, monthName, r.date, r.checkIn, r.checkOut, r.hours, r.status, r.overtime]
        .map((v) => `"${String(v).replaceAll('"', '""')}"`)
        .join(',')),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const safeName = firstName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const ym = `${logSourceMonth.getFullYear()}-${String(logSourceMonth.getMonth() + 1).padStart(2, '0')}`
    a.href = url
    a.download = `attendance-${safeName}-${ym}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Attendance log exported')
  }

  return (
    <div className="sd-dash-v2 sd-team-portal__attendance">
      <div className="sd-dash-v2__kpi-grid sd-team-portal__att-kpi">
        <KpiCard icon={IconCalendarStats} label="Attendance Rate" value={`${data.attendance.pct}%`} tone="blue" />
        <KpiCard icon={IconCircleCheck} label="Present" value={`${data.attendance.present} days`} tone="green" />
        <KpiCard
          icon={IconCalendarEvent}
          label="Working days"
          value={`${workingDaysCount.working}/${workingDaysCount.totalDays}`}
          tone="amber"
        />
        <KpiCard icon={IconX} label="Absent" value={`${data.attendance.absent} day${data.attendance.absent === 1 ? '' : 's'}`} tone="red" />
        <KpiCard icon={IconClockHour4} label="Overtime" value={`${data.attendance.overtimeHours}h`} tone="violet" />
      </div>

      <Panel
        title="Attendance Calendar"
        desc="Presence by day — non-working & future days stay faded"
        action={(
          <div className="sd-team-portal__cal-nav">
            <button type="button" className="sd-team-portal__cal-nav-btn" onClick={() => shiftMonth(-1)} aria-label="Previous month">
              <IconChevronLeft size={16} stroke={1.75} />
            </button>
            <span className="sd-team-portal__cal-nav-label">{monthLabel}</span>
            <button type="button" className="sd-team-portal__cal-nav-btn" onClick={() => shiftMonth(1)} aria-label="Next month">
              <IconChevronRight size={16} stroke={1.75} />
            </button>
          </div>
        )}
      >
        <div className="sd-team-portal__cal-shell">
          <div className="sd-team-portal__cal-main">
            <div className="sd-team-portal__cal" role="grid" aria-label={`${monthLabel} attendance`}>
              {WEEKDAYS.map((d) => (
                <span key={d} className="sd-team-portal__cal-dow" role="columnheader">{d}</span>
              ))}
              {cells.map((cell) => {
                if (cell.empty) {
                  return <div key={cell.key} className="sd-team-portal__cal-day is-empty" aria-hidden />
                }
                const meta = STATUS_META[cell.status] || STATUS_META.present
                const label = cell.status === 'holiday' && cell.holidayLabel
                  ? cell.holidayLabel
                  : meta.label
                const selectedCls = selectedDay === cell.day
                const showMark = Boolean(label) && cell.status !== 'upcoming' && cell.status !== 'off'
                return (
                  <button
                    key={cell.key}
                    type="button"
                    role="gridcell"
                    aria-label={`${cell.day} ${monthLabel}${cell.isToday ? ', today' : ''}${label ? `, ${label}` : cell.isFuture ? ', upcoming' : ''}`}
                    aria-pressed={selectedCls}
                    aria-current={cell.isToday ? 'date' : undefined}
                    className={cn(
                      'sd-team-portal__cal-day',
                      `is-${meta.tone}`,
                      cell.isToday && 'is-today',
                      selectedCls && 'is-selected',
                    )}
                    onClick={() => setSelectedDay(cell.day)}
                  >
                    <span className="sd-team-portal__cal-day-top">
                      <span className="sd-team-portal__cal-day-num">{cell.day}</span>
                      {cell.isToday ? (
                        <span className="sd-team-portal__cal-day-today">Today</span>
                      ) : showMark ? (
                        <span className="sd-team-portal__cal-day-dot" aria-hidden />
                      ) : null}
                    </span>
                    {showMark ? (
                      <span className="sd-team-portal__cal-day-chip">{label}</span>
                    ) : (
                      <span className="sd-team-portal__cal-day-chip is-blank" aria-hidden>&nbsp;</span>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="sd-team-portal__cal-legend" aria-label="Status legend">
              {LEGEND.map((key) => (
                <span key={key} className={cn('sd-team-portal__cal-legend-item', `is-${key}`)}>
                  <span className="sd-team-portal__cal-legend-dot" />
                  {STATUS_META[key].label}
                </span>
              ))}
            </div>
          </div>

          <div className="sd-team-portal__cal-aside">
            <div className="sd-team-portal__cal-detail">
              {selectedDay && selected ? (
                <>
                  <p className="sd-team-portal__cal-detail-kicker">
                    {selectedIsToday ? 'Today' : 'Selected day'}
                  </p>
                  <p className="sd-team-portal__cal-detail-date">
                    {selectedDay} {monthLabel}
                  </p>
                  <p className={cn('sd-team-portal__cal-detail-status', `is-${selected.status}`)}>
                    {selected.status === 'holiday' && selected.holidayLabel
                      ? selected.holidayLabel
                      : selected.status === 'upcoming'
                        ? 'Upcoming'
                        : selected.status === 'off'
                          ? 'Non-working day'
                          : STATUS_META[selected.status]?.label}
                  </p>
                  <div className="sd-team-portal__cal-detail-facts">
                    {detailCopy(selected.status, selected.holidayLabel) ? (
                      <p className="sd-team-portal__cal-detail-note">
                        {detailCopy(selected.status, selected.holidayLabel)}
                      </p>
                    ) : (
                      <>
                        <p><span>Check-in</span><strong>{selected.checkIn}</strong></p>
                        <p><span>Check-out</span><strong>{selected.checkOut}</strong></p>
                        <p><span>Hours</span><strong>{selected.hours}</strong></p>
                        {selected.otLabel && (
                          <p className="sd-team-portal__cal-detail-ot">
                            <span>OT hours</span>
                            <strong>{selected.otLabel}</strong>
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {canManage && selectedIsNonWorking && (
                    <button
                      type="button"
                      className={cn('sd-team-portal__cal-cover-btn', selected.isCover && 'is-on')}
                      onClick={handleToggleCover}
                    >
                      {selected.isCover ? 'Cover day · on' : 'Mark as cover day'}
                    </button>
                  )}
                </>
              ) : (
                <p className="sd-team-portal__cal-detail-empty">Select a date to see attendance details</p>
              )}
            </div>

            <div className="sd-team-portal__cal-notes">
              <p className="sd-team-portal__cal-notes-title">Notes</p>
              {!selectedDay ? (
                <p className="sd-team-portal__cal-notes-empty">Select a day to view notes</p>
              ) : canManage ? (
                <div className="sd-team-portal__cal-notes-edit">
                  <textarea
                    className="sd-team-portal__cal-notes-input"
                    rows={3}
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder="Add a note for this day (works on non-working days too)"
                  />
                  <button
                    type="button"
                    className="sd-team-portal__cal-notes-save"
                    onClick={handleSaveNote}
                    disabled={savingNote}
                  >
                    {savingNote ? 'Saving…' : 'Save note'}
                  </button>
                </div>
              ) : (
                <p className="sd-team-portal__cal-notes-body">
                  {selected?.note?.trim() ? selected.note : 'No notes for this day'}
                </p>
              )}
            </div>
          </div>
        </div>
      </Panel>

      <Panel
        title="Attendance Log"
        desc={`${logSourceMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} — ${logRows.length} recorded day${logRows.length === 1 ? '' : 's'}`}
        action={
          <div className="sd-dash-v2__filters" style={{ padding: 0 }}>
            <select
              className="sd-dash-v2__filter"
              value={logRange}
              onChange={(e) => setLogRange(e.target.value)}
            >
              <option value="this">This Month</option>
              <option value="last">Last Month</option>
            </select>
            <select
              className="sd-dash-v2__filter"
              value={logStatus}
              onChange={(e) => setLogStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="present">Present</option>
              <option value="half">Half day</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
              <option value="leave">Leave</option>
              <option value="cover">Cover</option>
            </select>
            <button type="button" className="sd-dash-v2__filter" onClick={handleExportLog}>
              <IconDownload size={13} stroke={1.75} />
              Export
            </button>
          </div>
        }
      >
        <div className="sd-team-portal__att-log">
          <DataTable columns={['Date', 'Check-in', 'Check-out', 'Working Hours', 'Status', 'Overtime']}>
            {logRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="sd-team-portal__att-log-empty">No attendance logged for this month yet.</td>
              </tr>
            ) : (
              logRows.map((r) => (
                <tr key={r.key}>
                  <td><strong>{r.date}</strong></td>
                  <td>{r.checkIn}</td>
                  <td>{r.checkOut}</td>
                  <td>{r.hours}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>{r.overtime}</td>
                </tr>
              ))
            )}
          </DataTable>
        </div>
      </Panel>
    </div>
  )
}
