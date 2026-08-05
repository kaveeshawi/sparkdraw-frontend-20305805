import { useMemo, useState } from 'react'
import { IconCalendar, IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

function toKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function parseKey(value) {
  if (!value) return null
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function buildGrid(year, month) {
  const first = new Date(year, month, 1)
  const start = new Date(year, month, 1 - first.getDay())
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

function formatDisplay(value) {
  const d = parseKey(value)
  if (!d) return ''
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function decadeStart(year) {
  return Math.floor(year / 12) * 12
}

/**
 * Soft Sparkdraw date picker with day / month / year views.
 */
export default function TeamDatePicker({
  id,
  value = '',
  onValueChange,
  placeholder = 'Select date',
  className,
  disabled = false,
}) {
  const selected = parseKey(value)
  const [open, setOpen] = useState(false)
  const [view, setView] = useState('days') // days | months | years
  const [cursor, setCursor] = useState(() => selected || new Date())

  const grid = useMemo(
    () => buildGrid(cursor.getFullYear(), cursor.getMonth()),
    [cursor],
  )

  const todayKey = toKey(new Date())
  const year = cursor.getFullYear()
  const decade = decadeStart(year)
  const yearOptions = Array.from({ length: 12 }, (_, i) => decade + i)

  const openPanel = (next) => {
    setOpen(next)
    if (next) {
      setCursor(selected || new Date())
      setView('days')
    }
  }

  const navPrev = () => {
    setCursor((c) => {
      if (view === 'days') return new Date(c.getFullYear(), c.getMonth() - 1, 1)
      if (view === 'months') return new Date(c.getFullYear() - 1, c.getMonth(), 1)
      return new Date(c.getFullYear() - 12, c.getMonth(), 1)
    })
  }

  const navNext = () => {
    setCursor((c) => {
      if (view === 'days') return new Date(c.getFullYear(), c.getMonth() + 1, 1)
      if (view === 'months') return new Date(c.getFullYear() + 1, c.getMonth(), 1)
      return new Date(c.getFullYear() + 12, c.getMonth(), 1)
    })
  }

  const navLabel =
    view === 'days'
      ? cursor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
      : view === 'months'
        ? String(year)
        : `${decade} – ${decade + 11}`

  const onNavLabelClick = () => {
    if (view === 'days') setView('months')
    else if (view === 'months') setView('years')
  }

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={openPanel}>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          type="button"
          id={id}
          disabled={disabled}
          className={cn('sd-team-field sd-team-date-trigger', className)}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <span className={cn('sd-team-date-trigger__label', !value && 'is-placeholder')}>
            {value ? formatDisplay(value) : placeholder}
          </span>
          <IconCalendar size={16} className="sd-team-date-trigger__icon" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="sd-team-date-panel"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="sd-team-date-panel__nav">
          <button
            type="button"
            className="sd-team-date-panel__nav-btn"
            onClick={navPrev}
            aria-label="Previous"
          >
            <IconChevronLeft size={16} />
          </button>
          <button
            type="button"
            className={cn(
              'sd-team-date-panel__nav-label',
              view !== 'years' && 'is-clickable',
            )}
            onClick={onNavLabelClick}
            disabled={view === 'years'}
          >
            {navLabel}
          </button>
          <button
            type="button"
            className="sd-team-date-panel__nav-btn"
            onClick={navNext}
            aria-label="Next"
          >
            <IconChevronRight size={16} />
          </button>
        </div>

        {view === 'days' && (
          <>
            <div className="sd-team-date-panel__weekdays">
              {WEEKDAYS.map((w) => (
                <span key={w}>{w}</span>
              ))}
            </div>
            <div className="sd-team-date-panel__grid">
              {grid.map((d) => {
                const key = toKey(d)
                const inMonth = d.getMonth() === cursor.getMonth()
                const isSelected = value === key
                const isToday = key === todayKey
                return (
                  <button
                    key={key}
                    type="button"
                    className={cn(
                      'sd-team-date-panel__day',
                      !inMonth && 'is-outside',
                      isSelected && 'is-selected',
                      isToday && 'is-today',
                    )}
                    onClick={() => {
                      onValueChange?.(key)
                      setOpen(false)
                    }}
                  >
                    {d.getDate()}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {view === 'months' && (
          <div className="sd-team-date-panel__months">
            {MONTHS.map((label, monthIndex) => {
              const isSelected =
                selected &&
                selected.getFullYear() === year &&
                selected.getMonth() === monthIndex
              const isCurrent =
                new Date().getFullYear() === year &&
                new Date().getMonth() === monthIndex
              return (
                <button
                  key={label}
                  type="button"
                  className={cn(
                    'sd-team-date-panel__chip',
                    isSelected && 'is-selected',
                    isCurrent && !isSelected && 'is-today',
                  )}
                  onClick={() => {
                    setCursor(new Date(year, monthIndex, 1))
                    setView('days')
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        )}

        {view === 'years' && (
          <div className="sd-team-date-panel__years">
            {yearOptions.map((y) => {
              const isSelected = selected && selected.getFullYear() === y
              const isCurrent = new Date().getFullYear() === y
              return (
                <button
                  key={y}
                  type="button"
                  className={cn(
                    'sd-team-date-panel__chip',
                    isSelected && 'is-selected',
                    isCurrent && !isSelected && 'is-today',
                  )}
                  onClick={() => {
                    setCursor(new Date(y, cursor.getMonth(), 1))
                    setView('months')
                  }}
                >
                  {y}
                </button>
              )
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
