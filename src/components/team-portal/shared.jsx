import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const DASH_STATUS_CLASS = {
  present: 'is-track', approved: 'is-track', paid: 'is-track', completed: 'is-track', active: 'is-track',
  in_progress: 'is-hold', processing: 'is-hold', leave: 'is-hold', half: 'is-hold', cover: 'is-hold',
  pending: 'is-risk', late: 'is-risk',
  weekend: 'is-done', off: 'is-done',
}

const STATUS_LABEL = {
  in_progress: 'In Progress', present: 'Present', absent: 'Absent',
  late: 'Late', leave: 'Leave', weekend: 'Weekend', half: 'Half day', off: 'Off', cover: 'Cover',
}

export function StatusBadge({ status, className }) {
  if (!status) return null
  const label = STATUS_LABEL[status] || (status.charAt(0).toUpperCase() + status.slice(1))
  if (status === 'absent' || status === 'rejected') {
    return <Badge variant="destructive" className={className}>{label}</Badge>
  }
  return <span className={cn('sd-dash-v2__status', DASH_STATUS_CLASS[status] || 'is-hold', className)}>{label}</span>
}

const KPI_TONE = {
  blue: { bg: '#eff6ff', color: '#2563eb' },
  orange: { bg: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)' },
  violet: { bg: '#f5f3ff', color: '#7c3aed' },
  green: { bg: '#ecfdf5', color: '#059669' },
  amber: { bg: '#fffbeb', color: '#d97706' },
  red: { bg: '#fef2f2', color: '#dc2626' },
}

// KPI card — used by Attendance / Leave / Payroll / etc. tabs
export function KpiCard({ icon: Icon, label, value, sub, subTone = 'is-up', tone = 'orange' }) {
  const t = KPI_TONE[tone] || KPI_TONE.orange
  return (
    <article className="sd-dash-v2__kpi-card sd-team-portal__kpi-card">
      <div className="sd-dash-v2__kpi-top">
        <p className="sd-dash-v2__kpi-label">{label}</p>
        <span className="sd-dash-v2__kpi-icon" style={{ background: t.bg, color: t.color }} aria-hidden>
          <Icon size={19} stroke={1.75} />
        </span>
      </div>
      <p className="sd-dash-v2__kpi-value">{value}</p>
      {sub && <p className={cn('sd-dash-v2__kpi-trend', subTone)}>{sub}</p>}
    </article>
  )
}

// Panel — identical shape to DashboardProjectsOverview / DashboardActivityFeed panels
export function Panel({ title, desc, linkTo, linkLabel, action, filters, children }) {
  return (
    <section className="sd-dash-v2__panel">
      <header className="sd-dash-v2__panel-head">
        <div>
          <h2 className="sd-dash-v2__panel-title">{title}</h2>
          {desc && <p className="sd-dash-v2__panel-desc">{desc}</p>}
        </div>
        {linkTo ? (
          <Link to={linkTo} className="sd-dash-v2__panel-link">{linkLabel || 'View all →'}</Link>
        ) : action}
      </header>
      {filters}
      {children}
    </section>
  )
}

export function FilterPills({ options, value, onChange }) {
  return (
    <div className="sd-dash-v2__filters">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          className={cn('sd-dash-v2__filter', value === opt.id && 'is-active')}
          onClick={() => onChange(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function DataTable({ columns, children }) {
  return (
    <div className="sd-dash-v2__table-wrap">
      <table className="sd-dash-v2__table">
        <thead>
          <tr>
            {columns.map((col) => <th key={col}>{col}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export function Widget({ title, linkTo, linkLabel, action, children }) {
  return (
    <section className="sd-dash-v2__widget">
      <div className="sd-dash-v2__widget-head">
        <h3 className="sd-dash-v2__widget-title">{title}</h3>
        {action || (linkTo ? (
          <Link to={linkTo} className="sd-dash-v2__widget-link">{linkLabel || 'View all →'}</Link>
        ) : null)}
      </div>
      {children}
    </section>
  )
}

// A labelled progress row used inside widgets (leave balances, metric breakdowns)
export function MetricRow({ label, value, total, tone }) {
  const pct = total ? Math.min(100, Math.round((value / total) * 100)) : value
  return (
    <div className="sd-dash-v2__metric-row">
      <div className="sd-dash-v2__metric-row-head">
        <span>{label}</span>
        <strong>{total ? `${value} / ${total} days` : `${value}%`}</strong>
      </div>
      <div className="sd-dash-v2__progress-track">
        <div className="sd-dash-v2__progress-fill" style={{ width: `${pct}%`, ...(tone ? { background: tone } : {}) }} />
      </div>
    </div>
  )
}

const LEAVE_PIE_COLORS = {
  annual: 'var(--primary)',
  casual: '#0d9488',
  medical: '#2563eb',
}

function polar(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function donutSlice(cx, cy, outerR, innerR, startAngle, endAngle) {
  if (endAngle - startAngle >= 359.9) {
    return [
      `M ${cx} ${cy - outerR}`,
      `A ${outerR} ${outerR} 0 1 1 ${cx - 0.01} ${cy - outerR}`,
      `L ${cx - 0.01} ${cy - innerR}`,
      `A ${innerR} ${innerR} 0 1 0 ${cx} ${cy - innerR}`,
      'Z',
    ].join(' ')
  }
  const large = endAngle - startAngle > 180 ? 1 : 0
  const o1 = polar(cx, cy, outerR, startAngle)
  const o2 = polar(cx, cy, outerR, endAngle)
  const i2 = polar(cx, cy, innerR, endAngle)
  const i1 = polar(cx, cy, innerR, startAngle)
  return [
    `M ${o1.x} ${o1.y}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${o2.x} ${o2.y}`,
    `L ${i2.x} ${i2.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${i1.x} ${i1.y}`,
    'Z',
  ].join(' ')
}

/** Donut chart of remaining leave days by type (annual / casual / medical). */
export function LeaveBalancePie({ leave, size = 168 }) {
  const slices = [
    { key: 'annual', label: 'Annual', used: leave?.annual?.used ?? 0, total: leave?.annual?.total ?? 0 },
    { key: 'casual', label: 'Casual', used: leave?.casual?.used ?? 0, total: leave?.casual?.total ?? 0 },
    { key: 'medical', label: 'Medical', used: leave?.medical?.used ?? 0, total: leave?.medical?.total ?? 0 },
  ].map((s) => ({
    ...s,
    remaining: Math.max(0, s.total - s.used),
    color: LEAVE_PIE_COLORS[s.key],
  }))

  const remainingTotal = slices.reduce((sum, s) => sum + s.remaining, 0)
  const allocatedTotal = slices.reduce((sum, s) => sum + s.total, 0)
  const cx = size / 2
  const cy = size / 2
  const outerR = size * 0.42
  const innerR = size * 0.26

  let angle = 0
  const paths = remainingTotal > 0
    ? slices.filter((s) => s.remaining > 0).map((s) => {
      const sweep = (s.remaining / remainingTotal) * 360
      const start = angle
      const end = angle + sweep
      angle = end
      return { ...s, d: donutSlice(cx, cy, outerR, innerR, start, end) }
    })
    : []

  return (
    <div className="sd-team-portal__leave-pie">
      <div className="sd-team-portal__leave-pie-chart" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
          {remainingTotal === 0 ? (
            <circle
              cx={cx}
              cy={cy}
              r={(outerR + innerR) / 2}
              fill="none"
              stroke="var(--border)"
              strokeWidth={outerR - innerR}
            />
          ) : (
            paths.map((s) => (
              <path key={s.key} d={s.d} fill={s.color} className="sd-team-portal__leave-pie-slice" />
            ))
          )}
        </svg>
        <div className="sd-team-portal__leave-pie-center">
          <strong>{remainingTotal}</strong>
          <span>days left</span>
        </div>
      </div>
      <ul className="sd-team-portal__leave-pie-legend">
        {slices.map((s) => (
          <li key={s.key}>
            <span className="sd-team-portal__leave-pie-swatch" style={{ background: s.color }} />
            <div className="sd-team-portal__leave-pie-legend-text">
              <span>{s.label}</span>
              <strong>{s.remaining}<em>/{s.total}</em></strong>
            </div>
          </li>
        ))}
        <li className="is-total">
          <span className="sd-team-portal__leave-pie-swatch is-muted" />
          <div className="sd-team-portal__leave-pie-legend-text">
            <span>Allocated</span>
            <strong>{allocatedTotal}</strong>
          </div>
        </li>
      </ul>
    </div>
  )
}

function smoothAreaPath(points, width, height, padX, padTop, padBottom, maxY) {
  if (!points.length) return { line: '', area: '' }
  const innerH = height - padTop - padBottom
  const step = points.length === 1 ? 0 : (width - padX * 2) / (points.length - 1)
  const coords = points.map((p, i) => {
    const x = padX + i * step
    const y = padTop + innerH * (1 - (maxY ? p.remaining / maxY : 0))
    return { x, y }
  })

  let line = `M ${coords[0].x} ${coords[0].y}`
  for (let i = 0; i < coords.length - 1; i += 1) {
    const c0 = coords[i === 0 ? i : i - 1]
    const c1 = coords[i]
    const c2 = coords[i + 1]
    const c3 = coords[i + 2] || c2
    const cp1x = c1.x + (c2.x - c0.x) / 6
    const cp1y = c1.y + (c2.y - c0.y) / 6
    const cp2x = c2.x - (c3.x - c1.x) / 6
    const cp2y = c2.y - (c3.y - c1.y) / 6
    line += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${c2.x} ${c2.y}`
  }

  const last = coords[coords.length - 1]
  const first = coords[0]
  const baseY = height - padBottom
  const area = `${line} L ${last.x} ${baseY} L ${first.x} ${baseY} Z`
  return { line, area, coords }
}

/** Smooth area chart of remaining leave balance over months. */
export function LeaveBalanceTrend({ leave, embedded = false }) {
  const year = new Date().getFullYear()
  const allocated =
    (leave?.annual?.total ?? 0) + (leave?.casual?.total ?? 0) + (leave?.medical?.total ?? 0)
  const remaining =
    Math.max(0, (leave?.annual?.total ?? 0) - (leave?.annual?.used ?? 0))
    + Math.max(0, (leave?.casual?.total ?? 0) - (leave?.casual?.used ?? 0))
    + Math.max(0, (leave?.medical?.total ?? 0) - (leave?.medical?.used ?? 0))
  const used = Math.max(0, allocated - remaining)
  const balancePct = allocated ? Math.round((remaining / allocated) * 100) : 0
  const points = Array.isArray(leave?.trend) && leave.trend.length
    ? leave.trend
    : [{ label: 'Now', remaining, used }]

  const prevRemaining = points.length > 1 ? points[0].remaining : allocated
  const deltaDays = remaining - prevRemaining
  const deltaLabel = `${deltaDays >= 0 ? '↑' : '↓'} ${Math.abs(deltaDays)}d`

  const width = 420
  const height = embedded ? 180 : 168
  const padX = 12
  const padTop = 12
  const padBottom = 28
  const maxY = Math.max(allocated, ...points.map((p) => p.remaining), 1)
  const { line, area, coords } = smoothAreaPath(points, width, height, padX, padTop, padBottom, maxY)
  const gradId = 'leaveBalanceAreaFill'

  return (
    <div className={`sd-team-portal__leave-trend${embedded ? ' is-embedded' : ''}`}>
      <div className="sd-team-portal__leave-trend-head">
        <div>
          {!embedded ? <p className="sd-team-portal__leave-trend-title">Leave usage</p> : null}
          <div className="sd-team-portal__leave-trend-score">
            <strong>{balancePct}%</strong>
            <span className={cn('sd-team-portal__leave-trend-delta', deltaDays >= 0 ? 'is-up' : 'is-down')}>
              {deltaLabel}
            </span>
            <em>balance left</em>
          </div>
        </div>
        <span className="sd-team-portal__leave-trend-year">{year}</span>
      </div>

      <div className="sd-team-portal__leave-trend-chart">
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {coords?.map((c, i) => (
            <line
              key={points[i].label}
              x1={c.x}
              y1={padTop}
              x2={c.x}
              y2={height - padBottom}
              className="sd-team-portal__leave-trend-grid"
            />
          ))}
          <path d={area} fill={`url(#${gradId})`} />
          <path d={line} fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="sd-team-portal__leave-trend-labels">
          {points.map((p) => (
            <span key={p.label}>{p.label}</span>
          ))}
        </div>
      </div>

      <p className="sd-team-portal__leave-trend-note">
        Remaining leave balance across the year · {used} days used of {allocated}
      </p>
    </div>
  )
}

export function ProgressCell({ value, tone }) {
  return (
    <div className="sd-dash-v2__progress">
      <div className="sd-dash-v2__progress-track">
        <div
          className="sd-dash-v2__progress-fill"
          style={{ width: `${value}%`, ...(tone ? { background: tone } : {}) }}
        />
      </div>
      <span>{value}%</span>
    </div>
  )
}
