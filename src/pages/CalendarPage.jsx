import { useMemo, useState } from 'react'
import { IconChevronLeft, IconChevronRight, IconPlus } from '@tabler/icons-react'
import PageWrapper from '../components/layout/PageWrapper'
import { Button } from '@/components/ui/button'
import CalendarSidebar from '../components/calendar/CalendarSidebar'
import CalendarWeekGrid from '../components/calendar/CalendarWeekGrid'
import { DEMO_EVENTS, FILTER_OPTIONS } from '../components/calendar/calendar-demo-events'
import { addDays, formatHeaderDate } from '../components/calendar/calendar-utils'

const VIEW_MODES = ['Daily', 'Weekly', 'Monthly']

const DEFAULT_FOCUS = new Date(2025, 5, 18)

export default function CalendarPage() {
  const [focusDate, setFocusDate] = useState(DEFAULT_FOCUS)
  const [monthCursor, setMonthCursor] = useState(() => new Date(DEFAULT_FOCUS.getFullYear(), DEFAULT_FOCUS.getMonth(), 1))
  const [viewMode, setViewMode] = useState('Weekly')
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [otherOpen, setOtherOpen] = useState(false)
  const [filters, setFilters] = useState(() =>
    Object.fromEntries(FILTER_OPTIONS.map((f) => [f.id, f.defaultChecked])),
  )

  const visibleEvents = useMemo(() => DEMO_EVENTS, [])

  const reminderEvent = useMemo(() => {
    const match = visibleEvents.find((e) => e.title === 'UX Huddle Call') || visibleEvents[0]
    return match || null
  }, [visibleEvents])

  const shiftWeek = (delta) => {
    setFocusDate((d) => addDays(d, delta * 7))
  }

  const shiftDay = (delta) => {
    setFocusDate((d) => addDays(d, delta))
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

  const headerDate = formatHeaderDate(focusDate)

  return (
    <PageWrapper>
      <div className="sd-page sd-page--calendar">
        <div className="sd-cal-v2">
          <CalendarSidebar
            monthCursor={monthCursor}
            focusDate={focusDate}
            onMonthChange={onMonthChange}
            onSelectDate={onSelectDate}
            filters={filters}
            onToggleFilter={onToggleFilter}
            reminderEvent={reminderEvent}
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
                  onClick={() => (viewMode === 'Weekly' ? shiftWeek(-1) : shiftDay(-1))}
                >
                  <IconChevronLeft size={18} stroke={2} />
                </button>
                <h1 className="sd-cal-v2__toolbar-label">{headerDate}</h1>
                <button
                  type="button"
                  className="sd-cal-v2__icon-btn"
                  aria-label="Next"
                  onClick={() => (viewMode === 'Weekly' ? shiftWeek(1) : shiftDay(1))}
                >
                  <IconChevronRight size={18} stroke={2} />
                </button>
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

              <Button className="sd-cal-v2__create sd-btn-gradient border-0 shadow-none">
                <IconPlus size={16} stroke={2} />
                Create Event
              </Button>
            </header>

            <div className="sd-cal-v2__canvas">
              {viewMode === 'Weekly' ? (
                <CalendarWeekGrid focusDate={focusDate} events={visibleEvents} />
              ) : viewMode === 'Monthly' ? (
                <div className="sd-cal-v2__placeholder">
                  <p>Monthly view — switch to Weekly for the full schedule grid.</p>
                </div>
              ) : (
                <div className="sd-cal-v2__placeholder">
                  <p>
                    Daily view for{' '}
                    {focusDate.toLocaleDateString('en-GB', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </PageWrapper>
  )
}
