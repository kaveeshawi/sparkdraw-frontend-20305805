import { useCallback, useEffect, useState } from 'react'
import { IconCheck, IconChevronDown, IconClock, IconClockOff } from '@tabler/icons-react'
import { toast } from 'sonner'
import useAuthStore from '@/store/authStore'
import { workSessionsApi, meApi } from '@/services/api'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type Availability = 'available' | 'away' | 'busy' | 'offline'
type MemberAvailability = 'available' | 'away' | 'busy'

type WorkSession = {
  id: number
  clock_in_at: string
  clock_out_at: string | null
}

const MEMBER_OPTIONS: { value: MemberAvailability; label: string; hint: string }[] = [
  { value: 'available', label: 'Available', hint: 'Ready to collaborate' },
  { value: 'busy', label: 'Busy', hint: 'In focus / meetings' },
  { value: 'away', label: 'Away', hint: 'Temporarily unavailable' },
]

const ADMIN_OPTIONS: { value: Availability; label: string; hint: string }[] = [
  { value: 'available', label: 'Available', hint: 'Ready to collaborate' },
  { value: 'busy', label: 'Busy', hint: 'In focus / meetings' },
  { value: 'away', label: 'Away', hint: 'Temporarily unavailable' },
  { value: 'offline', label: 'Offline', hint: 'Not signed in' },
]

const STATUS_DOT: Record<Availability, string> = {
  available: 'sd-clock-control__dot--available',
  busy: 'sd-clock-control__dot--busy',
  away: 'sd-clock-control__dot--away',
  offline: 'sd-clock-control__dot--offline',
}

const AGENCY_ROLES = ['admin', 'pm', 'member']

function normalizeAvailability(value: unknown, allowOffline: boolean): Availability {
  if (value === 'busy' || value === 'away' || value === 'available') return value
  if (allowOffline && value === 'offline') return 'offline'
  return allowOffline ? 'offline' : 'available'
}

export function ClockControl() {
  const { user, setUser } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const [session, setSession] = useState<WorkSession | null>(null)
  const [availability, setAvailability] = useState<Availability>(
    () => normalizeAvailability(user?.availability, Boolean(user?.role === 'admin')),
  )
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const loadSession = useCallback(async () => {
    try {
      const res = await workSessionsApi.current()
      setSession(res.data.data ?? null)
    } catch {
      setSession(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user || user.role === 'client' || !AGENCY_ROLES.includes(user.role)) {
      setLoading(false)
      return
    }

    setAvailability(normalizeAvailability(user.availability, user.role === 'admin'))

    if (user.role === 'admin') {
      setLoading(false)
      return
    }

    loadSession()
  }, [user, loadSession])

  if (!user || user.role === 'client' || !AGENCY_ROLES.includes(user.role)) {
    return null
  }

  const handleClockIn = async () => {
    setBusy(true)
    try {
      const res = await workSessionsApi.clockIn()
      setSession(res.data.data.session)
      setAvailability(normalizeAvailability(res.data.data.availability ?? 'available', false))
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to clock in'
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  const handleClockOut = async () => {
    setBusy(true)
    try {
      await workSessionsApi.clockOut()
      setSession(null)
      setAvailability('offline')
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to clock out'
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  const handleAvailabilityChange = async (value: Availability) => {
    if (value === availability) return
    const prev = availability
    setAvailability(value)
    try {
      const res = await meApi.updateAvailability(value)
      const next = normalizeAvailability(res.data.data?.availability ?? value, isAdmin)
      setAvailability(next)
      if (user) {
        setUser({ ...user, availability: next })
      }
    } catch (err: unknown) {
      setAvailability(prev)
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to update availability'
      toast.error(message)
    }
  }

  if (loading) {
    return (
      <div className="sd-float-topbar__clock" aria-hidden>
        <div className="sd-clock-control sd-clock-control--loading" />
      </div>
    )
  }

  // Admin: custom soft dropdown — matches Sparkdraw UI (no native select)
  if (isAdmin) {
    const adminLabel =
      ADMIN_OPTIONS.find((opt) => opt.value === availability)?.label ?? 'Offline'

    return (
      <div className="sd-float-topbar__clock">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={busy}
              className={cn(
                'sd-clock-control sd-clock-control--admin',
                `sd-clock-control--admin-${availability}`,
              )}
              aria-label="Set your availability"
            >
              <span
                className={cn(
                  'sd-clock-control__icon',
                  `sd-clock-control__icon--${availability}`,
                )}
                aria-hidden
              >
                <span className={cn('sd-clock-control__icon-dot', STATUS_DOT[availability])} />
              </span>
              <span className="sd-clock-control__admin-copy">
                <span className="sd-clock-control__admin-kicker">Your status</span>
                <span className="sd-clock-control__label">{adminLabel}</span>
              </span>
              <IconChevronDown size={16} stroke={2.25} className="sd-clock-control__chevron" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="sd-soft-dropdown sd-status-menu border-0"
          >
            <p className="sd-status-menu__title">Set availability</p>
            {ADMIN_OPTIONS.map((opt) => {
              const selected = availability === opt.value
              return (
                <DropdownMenuItem
                  key={opt.value}
                  className={cn('sd-status-menu__item', selected && 'is-selected')}
                  onSelect={() => handleAvailabilityChange(opt.value)}
                >
                  <span
                    className={cn(
                      'sd-status-menu__badge',
                      `sd-clock-control__icon--${opt.value}`,
                    )}
                    aria-hidden
                  >
                    <span className={cn('sd-status-menu__dot', STATUS_DOT[opt.value])} />
                  </span>
                  <span className="sd-status-menu__copy">
                    <span className="sd-status-menu__name">{opt.label}</span>
                    <span className="sd-status-menu__hint">{opt.hint}</span>
                  </span>
                  {selected ? (
                    <IconCheck size={15} stroke={2.25} className="sd-status-menu__check" />
                  ) : (
                    <span className="sd-status-menu__check-spacer" aria-hidden />
                  )}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="sd-float-topbar__clock">
        <button
          type="button"
          className="sd-clock-control sd-clock-control--idle"
          onClick={handleClockIn}
          disabled={busy}
          aria-label="Clock in"
        >
          <span className="sd-clock-control__icon sd-clock-control__icon--idle" aria-hidden>
            <IconClock size={15} stroke={2} />
          </span>
          <span className="sd-clock-control__label">Clock in</span>
        </button>
      </div>
    )
  }

  return (
    <div className="sd-float-topbar__clock">
      <div className="sd-clock-control sd-clock-control--active">
        <span className="sd-clock-control__status" aria-label="On duty">
          <span
            className={cn('sd-clock-control__dot', STATUS_DOT[availability])}
            aria-hidden
          />
          <span className="sd-clock-control__label">On duty</span>
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="sd-clock-control__chip"
              disabled={busy}
              aria-label="Set availability"
            >
              <span className={cn('sd-clock-control__dot', STATUS_DOT[availability])} aria-hidden />
              <span>
                {MEMBER_OPTIONS.find((o) => o.value === availability)?.label ?? 'Available'}
              </span>
              <IconChevronDown size={12} stroke={2} aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="sd-soft-dropdown sd-status-menu border-0"
          >
            {MEMBER_OPTIONS.map((opt) => {
              const selected = availability === opt.value
              return (
                <DropdownMenuItem
                  key={opt.value}
                  className={cn('sd-status-menu__item', selected && 'is-selected')}
                  onSelect={() => handleAvailabilityChange(opt.value)}
                >
                  <span className={cn('sd-status-menu__dot', STATUS_DOT[opt.value])} aria-hidden />
                  <span className="sd-status-menu__copy">
                    <span className="sd-status-menu__name">{opt.label}</span>
                    <span className="sd-status-menu__hint">{opt.hint}</span>
                  </span>
                  {selected ? (
                    <IconCheck size={15} stroke={2.25} className="sd-status-menu__check" />
                  ) : (
                    <span className="sd-status-menu__check-spacer" aria-hidden />
                  )}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          type="button"
          className="sd-clock-control__out"
          onClick={handleClockOut}
          disabled={busy}
          aria-label="Clock out"
        >
          <IconClockOff size={14} stroke={2} aria-hidden />
          <span className="sd-clock-control__out-label">Clock out</span>
        </button>
      </div>
    </div>
  )
}
