import { useCallback, useEffect, useState } from 'react'
import { IconClock, IconClockOff } from '@tabler/icons-react'
import { toast } from 'sonner'
import useAuthStore from '@/store/authStore'
import { workSessionsApi, meApi } from '@/services/api'
import { cn } from '@/lib/utils'

type Availability = 'available' | 'away' | 'busy'

type WorkSession = {
  id: number
  clock_in_at: string
  clock_out_at: string | null
}

const AVAILABILITY_OPTIONS: { value: Availability; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'busy', label: 'Busy' },
  { value: 'away', label: 'Away' },
]

const STATUS_DOT: Record<Availability, string> = {
  available: 'sd-clock-control__dot--available',
  busy: 'sd-clock-control__dot--busy',
  away: 'sd-clock-control__dot--away',
}

const AGENCY_ROLES = ['admin', 'pm', 'member']

export function ClockControl() {
  const { user } = useAuthStore()
  const [session, setSession] = useState<WorkSession | null>(null)
  const [availability, setAvailability] = useState<Availability>('available')
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
      setAvailability(res.data.data.availability ?? 'available')
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
    const prev = availability
    setAvailability(value)
    try {
      await meApi.updateAvailability(value)
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

        <label className="sd-clock-control__select-wrap">
          <span className="sr-only">Availability</span>
          <select
            className="sd-clock-control__select"
            value={availability}
            onChange={(e) => handleAvailabilityChange(e.target.value as Availability)}
            disabled={busy}
            aria-label="Set availability"
          >
            {AVAILABILITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

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
