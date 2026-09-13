import { useEffect, useMemo, useState } from 'react'
import {
  IconClock,
  IconClockPlay,
  IconSearch,
  IconUserOff,
  IconUsers,
  IconX,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import PageWrapper from '../components/layout/PageWrapper'
import FloatPageHeader from '../components/layout/FloatPageHeader'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ClockControl } from '@/components/layout/clock-control'
import TeamAvatar from '../components/team/TeamAvatar'
import {
  AVAILABILITY_DOT,
  AVAILABILITY_LABELS,
  ROLE_LABELS,
} from '../components/team/team-utils'
import useAuthStore from '../store/authStore'
import { teamApi, timeOverviewApi } from '../services/api'

const FILTER_PILLS = [
  { id: 'all', label: 'All' },
  { id: 'on_duty', label: 'On duty' },
  { id: 'offline', label: 'Offline' },
]

const EMPTY_SUMMARY = {
  on_duty: 0,
  available: 0,
  busy: 0,
  away: 0,
  offline: 0,
}

const STATUS_COLORS = {
  available: '#22c55e',
  busy: '#ef4444',
  away: '#f59e0b',
  offline: '#94a3b8',
}

const ADMIN_STATUS_OPTIONS = [
  { value: 'available', label: 'Available' },
  { value: 'busy', label: 'Busy' },
  { value: 'away', label: 'Away' },
  { value: 'offline', label: 'Offline' },
]

function formatClockIn(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return '—'
  }
}

function formatElapsed(iso, nowMs) {
  if (!iso) return '00:00:00'
  const start = new Date(iso).getTime()
  if (Number.isNaN(start)) return '00:00:00'
  const totalSec = Math.max(0, Math.floor((nowMs - start) / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

function statusLabel(availability) {
  if (availability === 'available') return 'Online'
  return AVAILABILITY_LABELS[availability] || 'Offline'
}

function firstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || 'Member'
}

function rebuildSummary(list) {
  return {
    on_duty: list.filter((m) => m.is_clocked_in).length,
    available: list.filter((m) => m.availability === 'available').length,
    busy: list.filter((m) => m.availability === 'busy').length,
    away: list.filter((m) => m.availability === 'away').length,
    offline: list.filter((m) => m.availability === 'offline').length,
  }
}

function StatusMixChart({ summary }) {
  const slices = [
    { key: 'available', label: 'Available', value: summary.available || 0, color: STATUS_COLORS.available },
    { key: 'busy', label: 'Busy', value: summary.busy || 0, color: STATUS_COLORS.busy },
    { key: 'away', label: 'Away', value: summary.away || 0, color: STATUS_COLORS.away },
    { key: 'offline', label: 'Offline', value: summary.offline || 0, color: STATUS_COLORS.offline },
  ]
  const total = slices.reduce((sum, s) => sum + s.value, 0)

  let cursor = 0
  const gradient = total > 0
    ? `conic-gradient(${slices
        .filter((s) => s.value > 0)
        .map((s) => {
          const start = cursor
          const end = cursor + (s.value / total) * 100
          cursor = end
          return `${s.color} ${start}% ${end}%`
        })
        .join(', ')})`
    : 'conic-gradient(#e5e7eb 0% 100%)'

  return (
    <div className="sd-presence-chart">
      <div className="sd-card-header">
        <div>
          <p className="sd-card-title">Status mix</p>
          <p className="sd-card-desc">Live availability across the team.</p>
        </div>
      </div>
      <div className="sd-presence-chart__body sd-presence-chart__body--donut">
        <div className="sd-team-donut" style={{ background: gradient, width: '5.5rem', height: '5.5rem' }}>
          <div className="sd-team-donut__hole">
            <strong>{total}</strong>
            <span>team</span>
          </div>
        </div>
        <ul className="sd-team-kpi__legend">
          {slices.map((s) => (
            <li key={s.key}>
              <span style={{ background: s.color }} />
              <em>{s.label}</em>
              <strong>{s.value}</strong>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function HoursTodayChart({ members }) {
  const rows = [...members]
    .sort((a, b) => (b.hours_today || 0) - (a.hours_today || 0))
    .slice(0, 8)
  const max = Math.max(...rows.map((m) => Number(m.hours_today) || 0), 1)

  return (
    <div className="sd-presence-chart">
      <div className="sd-card-header">
        <div>
          <p className="sd-card-title">Hours today</p>
          <p className="sd-card-desc">Logged billable hours per member.</p>
        </div>
      </div>
      <div className="sd-presence-chart__body">
        {rows.length === 0 ? (
          <p className="sd-presence-chart__empty">No hours logged today.</p>
        ) : (
          <div className="sd-presence-hbar">
            {rows.map((m) => {
              const hours = Number(m.hours_today) || 0
              const pct = Math.max(4, Math.round((hours / max) * 100))
              return (
                <div key={m.user_id} className="sd-presence-hbar__row">
                  <span className="sd-presence-hbar__name" title={m.name}>{firstName(m.name)}</span>
                  <div className="sd-presence-hbar__track">
                    <div
                      className={`sd-presence-hbar__fill${m.is_clocked_in ? ' is-on-duty' : ''}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="sd-presence-hbar__val tabular-nums">{hours}h</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function WeekHoursChart({ days }) {
  const max = Math.max(...(days.length ? days.map((d) => Number(d.hours) || 0) : [0]), 1)
  const total = days.reduce((sum, d) => sum + (Number(d.hours) || 0), 0)

  return (
    <div className="sd-presence-chart">
      <div className="sd-card-header">
        <div>
          <p className="sd-card-title">This week</p>
          <p className="sd-card-desc">{total.toFixed(1)}h logged Mon–Sun.</p>
        </div>
      </div>
      <div className="sd-presence-chart__body">
        <div className="sd-presence-vbar" role="img" aria-label="Hours logged this week">
          {days.map((d) => {
            const hours = Number(d.hours) || 0
            const pct = Math.max(hours > 0 ? 8 : 2, Math.round((hours / max) * 100))
            return (
              <div key={d.date} className="sd-presence-vbar__col">
                <span className="sd-presence-vbar__val tabular-nums">{hours > 0 ? hours : ''}</span>
                <div className="sd-presence-vbar__track">
                  <div className="sd-presence-vbar__fill" style={{ height: `${pct}%` }} />
                </div>
                <span className="sd-presence-vbar__label">{d.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function WorkloadPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const [members, setMembers] = useState([])
  const [summary, setSummary] = useState(EMPTY_SUMMARY)
  const [hoursByDay, setHoursByDay] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterId, setFilterId] = useState('all')
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [savingId, setSavingId] = useState(null)

  const loadPresence = (silent = false) => {
    if (!silent) setLoading(true)
    timeOverviewApi
      .teamPresence()
      .then((res) => {
        const data = res.data.data ?? {}
        setMembers(Array.isArray(data.members) ? data.members : [])
        setSummary({ ...EMPTY_SUMMARY, ...(data.summary || {}) })
        setHoursByDay(Array.isArray(data.charts?.hours_by_day) ? data.charts.hours_by_day : [])
      })
      .catch(() => {
        setMembers([])
        setSummary(EMPTY_SUMMARY)
        setHoursByDay([])
      })
      .finally(() => {
        if (!silent) setLoading(false)
      })
  }

  useEffect(() => {
    loadPresence(false)
    const poll = setInterval(() => loadPresence(true), 45000)
    return () => clearInterval(poll)
  }, [])

  useEffect(() => {
    const tick = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(tick)
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return members.filter((m) => {
      if (filterId === 'on_duty' && !m.is_clocked_in) return false
      if (filterId === 'offline' && m.availability !== 'offline') return false
      if (!q) return true
      const hay = `${m.name || ''} ${m.role || ''} ${m.job_title || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [members, search, filterId])

  const handleAdminStatusChange = async (member, nextStatus) => {
    if (!isAdmin || !member?.user_id || member.availability === nextStatus) return

    const prev = member.availability
    setSavingId(member.user_id)

    setMembers((list) => {
      const next = list.map((m) => {
        if (m.user_id !== member.user_id) return m
        const patched = { ...m, availability: nextStatus }
        if (nextStatus === 'offline') {
          patched.is_clocked_in = false
          patched.clock_in_at = null
        }
        return patched
      })
      setSummary(rebuildSummary(next))
      return next
    })

    try {
      const res = await teamApi.updateAvailability(member.user_id, nextStatus)
      const data = res.data.data || {}
      setMembers((list) => {
        const next = list.map((m) => {
          if (m.user_id !== member.user_id) return m
          return {
            ...m,
            availability: data.availability ?? nextStatus,
            is_clocked_in: Boolean(data.is_clocked_in),
            clock_in_at: data.is_clocked_in ? (data.clock_in_at ?? m.clock_in_at) : null,
          }
        })
        setSummary(rebuildSummary(next))
        return next
      })
      toast.success(`${member.name} → ${AVAILABILITY_LABELS[nextStatus] || nextStatus}`)
    } catch (err) {
      setMembers((list) => {
        const next = list.map((m) => (m.user_id === member.user_id ? { ...m, availability: prev } : m))
        setSummary(rebuildSummary(next))
        return next
      })
      toast.error(err?.response?.data?.message || 'Failed to update status')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <PageWrapper
      pageActions={
        <FloatPageHeader
          title="Time"
          subtitle="Live team presence — who’s on duty, status, and hours today."
        >
          <ClockControl />
        </FloatPageHeader>
      }
    >
      <div className="sd-page sd-page--team">
        <div className="sd-team-kpi">
          <div className="sd-stat-tile sd-team-kpi__card">
            <div className="sd-team-kpi__top">
              <div>
                <p className="sd-stat-tile__label">On duty</p>
                <p className="sd-stat-tile__value">{summary.on_duty}</p>
                <p className="sd-team-kpi__hint">Clocked in now</p>
              </div>
              <span className="sd-team-kpi__icon sd-team-kpi__icon--green">
                <IconClockPlay size={18} stroke={1.75} />
              </span>
            </div>
          </div>

          <div className="sd-stat-tile sd-team-kpi__card">
            <div className="sd-team-kpi__top">
              <div>
                <p className="sd-stat-tile__label">Available</p>
                <p className="sd-stat-tile__value">{summary.available}</p>
                <p className="sd-team-kpi__hint">Ready to collaborate</p>
              </div>
              <span className="sd-team-kpi__icon sd-team-kpi__icon--blue">
                <span className="sd-team-kpi__online-dot" />
              </span>
            </div>
          </div>

          <div className="sd-stat-tile sd-team-kpi__card">
            <div className="sd-team-kpi__top">
              <div>
                <p className="sd-stat-tile__label">Busy</p>
                <p className="sd-stat-tile__value">{summary.busy}</p>
                <p className="sd-team-kpi__hint">In deep work / meetings</p>
              </div>
              <span className="sd-team-kpi__icon sd-team-kpi__icon--rose">
                <IconUsers size={18} stroke={1.75} />
              </span>
            </div>
          </div>

          <div className="sd-stat-tile sd-team-kpi__card">
            <div className="sd-team-kpi__top">
              <div>
                <p className="sd-stat-tile__label">Offline</p>
                <p className="sd-stat-tile__value">{summary.offline}</p>
                <p className="sd-team-kpi__hint">Not signed in</p>
              </div>
              <span className="sd-team-kpi__icon sd-team-kpi__icon--indigo">
                <IconUserOff size={18} stroke={1.75} />
              </span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="sd-presence-charts">
            <div className="sd-card sd-presence-chart"><div className="p-4"><Skeleton className="h-40 w-full" /></div></div>
            <div className="sd-card sd-presence-chart"><div className="p-4"><Skeleton className="h-40 w-full" /></div></div>
            <div className="sd-card sd-presence-chart"><div className="p-4"><Skeleton className="h-40 w-full" /></div></div>
          </div>
        ) : (
          <div className="sd-presence-charts">
            <div className="sd-card">
              <StatusMixChart summary={summary} />
            </div>
            <div className="sd-card">
              <HoursTodayChart members={members} />
            </div>
            <div className="sd-card">
              <WeekHoursChart days={hoursByDay} />
            </div>
          </div>
        )}

        <div className="sd-team-toolbar sd-team-toolbar--clients">
          <div className="sd-team-toolbar__search">
            <IconSearch size={16} stroke={1.75} className="sd-team-toolbar__search-icon" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search team..."
              className="sd-team-toolbar__input"
            />
            {search ? (
              <button
                type="button"
                className="sd-team-toolbar__clear"
                aria-label="Clear search"
                onClick={() => setSearch('')}
              >
                <IconX size={14} stroke={2} />
              </button>
            ) : null}
          </div>

          <div className="sd-client-filters" role="group" aria-label="Filter presence">
            {FILTER_PILLS.map((pill) => (
              <button
                key={pill.id}
                type="button"
                className={`sd-client-filter sd-client-filter--${pill.id}${filterId === pill.id ? ' is-active' : ''}`}
                onClick={() => setFilterId(pill.id)}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        <div className="sd-card sd-presence-board">
          <div className="sd-card-header">
            <div>
              <p className="sd-card-title">Team presence</p>
              <p className="sd-card-desc">
                {isAdmin
                  ? 'Set Available / Busy / Away / Offline directly — no clock-in required.'
                  : 'Who’s clocked in, availability, and hours today.'}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col gap-2 p-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No team members match this filter.
            </div>
          ) : (
            <div className="sd-presence-list">
              {filtered.map((m) => {
                const availability = m.availability || 'offline'
                const statusClass = AVAILABILITY_DOT[availability] || AVAILABILITY_DOT.offline
                const roleLabel = ROLE_LABELS[m.role] || m.role
                const position = m.job_title?.trim() || roleLabel

                return (
                  <div key={m.user_id} className="sd-presence-row">
                    <div className="sd-presence-row__identity">
                      <div className="sd-team-list-row__avatar-wrap">
                        <TeamAvatar member={m} className="size-11 shrink-0 text-xs" />
                        <span className={`sd-team-status sd-team-status--sm ${statusClass}`} aria-hidden />
                      </div>
                      <div className="min-w-0">
                        <div className="sd-presence-row__name-line">
                          <span className="sd-presence-row__name">{m.name}</span>
                          {m.is_clocked_in ? (
                            <span className="sd-presence-badge">On duty</span>
                          ) : null}
                        </div>
                        <p className="sd-presence-row__meta">
                          {position}
                          {!isAdmin ? (
                            <>
                              <span className="sd-presence-row__sep">·</span>
                              <span className={`sd-team-list-row__status sd-team-list-row__status--${availability}`}>
                                {statusLabel(availability)}
                              </span>
                            </>
                          ) : null}
                        </p>
                      </div>
                    </div>

                    {isAdmin ? (
                      <div className="sd-presence-row__admin-status">
                        <label className="sr-only" htmlFor={`presence-status-${m.user_id}`}>
                          Status for {m.name}
                        </label>
                        <select
                          id={`presence-status-${m.user_id}`}
                          className="sd-presence-status-select"
                          value={availability}
                          disabled={savingId === m.user_id}
                          onChange={(e) => handleAdminStatusChange(m, e.target.value)}
                        >
                          {ADMIN_STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    ) : null}

                    <div className="sd-presence-row__stats">
                      {m.is_clocked_in ? (
                        <>
                          <div className="sd-presence-stat">
                            <span className="sd-presence-stat__label">Clocked in</span>
                            <span className="sd-presence-stat__value">{formatClockIn(m.clock_in_at)}</span>
                          </div>
                          <div className="sd-presence-stat sd-presence-stat--elapsed">
                            <span className="sd-presence-stat__label">
                              <IconClock size={12} stroke={1.75} aria-hidden /> Elapsed
                            </span>
                            <span className="sd-presence-stat__value tabular-nums">
                              {formatElapsed(m.clock_in_at, nowMs)}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="sd-presence-stat">
                          <span className="sd-presence-stat__label">Session</span>
                          <span className="sd-presence-stat__value sd-presence-stat__value--muted">Not clocked in</span>
                        </div>
                      )}
                      <div className="sd-presence-stat">
                        <span className="sd-presence-stat__label">Today</span>
                        <span className="sd-presence-stat__value tabular-nums">{m.hours_today ?? 0}h</span>
                      </div>
                      <div className="sd-presence-stat">
                        <span className="sd-presence-stat__label">This week</span>
                        <span className="sd-presence-stat__value tabular-nums">{m.hours_this_week ?? 0}h</span>
                      </div>
                      <div className="sd-presence-stat">
                        <span className="sd-presence-stat__label">Tasks</span>
                        <span className="sd-presence-stat__value tabular-nums">{m.active_tasks ?? 0}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  )
}
