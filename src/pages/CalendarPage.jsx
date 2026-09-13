import { useCallback, useEffect, useMemo, useState } from 'react'
import { IconChevronLeft, IconChevronRight, IconPlus } from '@tabler/icons-react'
import PageWrapper from '../components/layout/PageWrapper'
import FloatPageHeader from '../components/layout/FloatPageHeader'
import { Button } from '@/components/ui/button'
import CalendarSidebar from '../components/calendar/CalendarSidebar'
import CalendarWeekGrid from '../components/calendar/CalendarWeekGrid'
import CalendarMonthGrid from '../components/calendar/CalendarMonthGrid'
import CalendarEventModal from '../components/calendar/CalendarEventModal'
import { calendarApi } from '../services/api'
import {
  FILTER_OPTIONS,
  addDays,
  formatHeaderDate,
  normalizeCalendarEvent,
  rangeForView,
} from '../components/calendar/calendar-utils'

const VIEW_MODES = ['Daily', 'Weekly', 'Monthly']

export default function CalendarPage() {
  const [focusDate, setFocusDate] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [viewMode, setViewMode] = useState('Weekly')
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [otherOpen, setOtherOpen] = useState(false)
  const [filters, setFilters] = useState(() =>
    Object.fromEntries(FILTER_OPTIONS.map((f) => [f.id, f.defaultChecked])),
  )
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [activeEvent, setActiveEvent] = useState(null)
  const [dismissedReminderId, setDismissedReminderId] = useState(null)

  const loadEvents = useCallback(() => {
    setLoading(true)
    const { from, to } = rangeForView(focusDate, viewMode)
    calendarApi
      .index({ from, to })
      .then((res) => {
        const list = Array.isArray(res.data.data) ? res.data.data : []
        setEvents(list.map(normalizeCalendarEvent))
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [focusDate, viewMode])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  const visibleEvents = useMemo(
    () => events.filter((e) => filters[e.type] !== false),
    [events, filters],
  )

  const reminderEvent = useMemo(() => {
    const now = new Date()
    const upcoming = visibleEvents
      .filter((e) => e.type === 'meetings' && e.startsAt && new Date(e.startsAt) >= now)
      .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))
    const next = upcoming[0] || visibleEvents.find((e) => e.type === 'meetings') || null
    if (!next || String(next.id) === String(dismissedReminderId)) return null
    return next
  }, [visibleEvents, dismissedReminderId])

  const shiftWeek = (delta) => setFocusDate((d) => addDays(d, delta * 7))
  const shiftDay = (delta) => setFocusDate((d) => addDays(d, delta))
  const shiftMonth = (delta) => {
    setFocusDate((d) => new Date(d.getFullYear(), d.getMonth() + delta, Math.min(d.getDate(), 28)))
    setMonthCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1))
  }

  const onMonthChange = (delta) => {
    setMonthCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1))
  }

  const onSelectDate = (d) => {
    setFocusDate(d)
    setMonthCursor(new Date(d.getFullYear(), d.getMonth(), 1))
  }

  const onToggleFilter = (id) => {
    setFilters((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const openCreate = (day = focusDate) => {
    setActiveEvent(null)
    setFocusDate(day)
    setModalOpen(true)
  }

  const openEvent = (event) => {
    if (event.source === 'task' && event.projectId) {
      window.location.href = `/projects/${event.projectId}/kanban`
      return
    }
    if (event.source === 'milestone' && event.projectId) {
      window.location.href = `/projects/${event.projectId}/kanban`
      return
    }
    setActiveEvent(event)
    setModalOpen(true)
  }

  const headerDate = formatHeaderDate(focusDate)

  return (
    <PageWrapper
      pageActions={
        <FloatPageHeader
          title="Calendar"
          subtitle="Create meetings, track deadlines, and stay on schedule."
        />
      }
    >
      <div className="sd-page sd-page--team sd-page--calendar">
        <div className="sd-cal-v2">
          <CalendarSidebar
            monthCursor={monthCursor}
            focusDate={focusDate}
            onMonthChange={onMonthChange}
            onSelectDate={onSelectDate}
            filters={filters}
            onToggleFilter={onToggleFilter}
            reminderEvent={reminderEvent}
            onDismissReminder={() => setDismissedReminderId(reminderEvent?.id)}
            filtersOpen={filtersOpen}
            onToggleFilters={() => setFiltersOpen((v) => !v)}
            otherOpen={otherOpen}
            onToggleOther={() => setOtherOpen((v) => !v)}
          />

          <section className="sd-cal-v2__main">
            <header className="sd-cal-v2__toolbar">
              <div className="sd-cal-v2__toolbar-date">
                <button
                  type="button"
                  className="sd-cal-v2__icon-btn"
                  aria-label="Previous"
                  onClick={() => {
                    if (viewMode === 'Weekly') shiftWeek(-1)
                    else if (viewMode === 'Monthly') shiftMonth(-1)
                    else shiftDay(-1)
                  }}
                >
                  <IconChevronLeft size={18} stroke={2} />
                </button>
                <h1 className="sd-cal-v2__toolbar-label">{headerDate}</h1>
                <button
                  type="button"
                  className="sd-cal-v2__icon-btn"
                  aria-label="Next"
                  onClick={() => {
                    if (viewMode === 'Weekly') shiftWeek(1)
                    else if (viewMode === 'Monthly') shiftMonth(1)
                    else shiftDay(1)
                  }}
                >
                  <IconChevronRight size={18} stroke={2} />
                </button>
                <Button
                  type="button"
                  variant="secondary"
                  className="ml-1 h-9 rounded-full border-0 px-3 text-xs"
                  onClick={() => onSelectDate(new Date())}
                >
                  Today
                </Button>
              </div>

              <div className="sd-cal-v2__view-toggle" role="tablist" aria-label="Calendar view">
                {VIEW_MODES.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    role="tab"
                    aria-selected={viewMode === mode}
                    className={viewMode === mode ? 'is-active' : undefined}
                    onClick={() => setViewMode(mode)}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              <Button
                type="button"
                className="sd-cal-v2__create sd-btn-gradient border-0 shadow-none"
                onClick={() => openCreate()}
              >
                <IconPlus size={16} stroke={2} />
                Create Event
              </Button>
            </header>

            <div className="sd-cal-v2__canvas">
              {loading ? (
                <div className="sd-cal-v2__placeholder">
                  <p>Loading schedule…</p>
                </div>
              ) : viewMode === 'Monthly' ? (
                <CalendarMonthGrid
                  focusDate={focusDate}
                  events={visibleEvents}
                  onSelectDate={(d) => {
                    onSelectDate(d)
                    setViewMode('Daily')
                  }}
                  onSelectEvent={openEvent}
                />
              ) : (
                <CalendarWeekGrid
                  focusDate={focusDate}
                  events={visibleEvents}
                  dayCount={viewMode === 'Daily' ? 1 : 5}
                  onSelectEvent={openEvent}
                  onSlotClick={(day) => openCreate(day)}
                />
              )}
              {!loading && visibleEvents.length === 0 ? (
                <p className="sd-cal-v2__empty-hint">
                  No events in this range. Click Create Event or double-click a day column.
                </p>
              ) : null}
            </div>
          </section>
        </div>
      </div>

      <CalendarEventModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        focusDate={focusDate}
        event={activeEvent}
        onSaved={() => loadEvents()}
        onDeleted={() => loadEvents()}
      />
    </PageWrapper>
  )
}
