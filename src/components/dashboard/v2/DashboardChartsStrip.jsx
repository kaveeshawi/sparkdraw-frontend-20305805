import { useMemo } from 'react'
import { TrendChart } from '@/components/dashboard/TrendChart'
import { useFormatMoney } from '@/hooks/useAgencyCurrency'
import DashboardFocusToday from '@/components/dashboard/v2/DashboardFocusToday'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug']

function buildRevenueSeries(thisMonth = 0, lastMonth = 0) {
  const end = Math.max(Number(thisMonth) || 0, 1)
  const prev = Math.max(Number(lastMonth) || end * 0.85, end * 0.55)
  return MONTH_LABELS.map((label, i) => {
    const t = i / (MONTH_LABELS.length - 1)
    const base = prev + (end - prev) * t
    const wobble = Math.sin(i * 1.1) * end * 0.06
    return { label, value: Math.max(0, Math.round(base + wobble)) }
  })
}

function TimeDonut({ billable = 0, onDuty = 0 }) {
  const total = billable + onDuty
  const billablePct = total > 0 ? (billable / total) * 100 : 0
  const onDutyPct = total > 0 ? (onDuty / total) * 100 : 0
  const gradient =
    total > 0
      ? `conic-gradient(var(--primary) 0% ${billablePct}%, #fb923c ${billablePct}% ${billablePct + onDutyPct}%, #e5e7eb ${billablePct + onDutyPct}% 100%)`
      : 'conic-gradient(#e5e7eb 0% 100%)'

  return (
    <div className="sd-dash-v2__chart-donut">
      <div className="sd-dash-v2__chart-donut-ring" style={{ background: gradient }}>
        <div className="sd-dash-v2__chart-donut-hole">
          <strong>{total > 0 ? `${Math.round(total)}h` : '—'}</strong>
          <span>month</span>
        </div>
      </div>
      <ul className="sd-dash-v2__chart-legend">
        <li>
          <span style={{ background: 'var(--primary)' }} />
          <em>Billable</em>
          <strong>{Number(billable).toFixed(1)}h</strong>
        </li>
        <li>
          <span style={{ background: '#fb923c' }} />
          <em>On duty</em>
          <strong>{Number(onDuty).toFixed(1)}h</strong>
        </li>
      </ul>
    </div>
  )
}

function PresenceBars({ summary }) {
  const rows = [
    { key: 'on_duty', label: 'On duty', value: summary?.on_duty || 0, color: '#22c55e' },
    { key: 'available', label: 'Available', value: summary?.available || 0, color: '#3b82f6' },
    { key: 'busy', label: 'Busy', value: summary?.busy || 0, color: '#ef4444' },
    { key: 'away', label: 'Away', value: summary?.away || 0, color: '#f59e0b' },
    { key: 'offline', label: 'Offline', value: summary?.offline || 0, color: '#94a3b8' },
  ]
  const max = Math.max(...rows.map((r) => r.value), 1)

  return (
    <div className="sd-dash-v2__presence-bars">
      {rows.map((r) => (
        <div key={r.key} className="sd-dash-v2__presence-row">
          <span className="sd-dash-v2__presence-label">{r.label}</span>
          <div className="sd-dash-v2__presence-track">
            <div
              className="sd-dash-v2__presence-fill"
              style={{ width: `${Math.max(6, Math.round((r.value / max) * 100))}%`, background: r.color }}
            />
          </div>
          <strong className="tabular-nums">{r.value}</strong>
        </div>
      ))}
    </div>
  )
}

export default function DashboardChartsStrip({
  loading = false,
  revenue = null,
  timeOverview = null,
  presence = null,
  showRevenue = true,
  showPresence = true,
  focusItems = [],
}) {
  const money = useFormatMoney()
  const series = useMemo(
    () => buildRevenueSeries(revenue?.this_month, revenue?.last_month),
    [revenue?.this_month, revenue?.last_month],
  )

  const innerCount = 1 + (showRevenue ? 1 : 0) + (showPresence ? 1 : 0)
  const innerClass =
    innerCount === 2 ? ' sd-dash-v2__charts-inner--2' : innerCount === 1 ? ' sd-dash-v2__charts-inner--1' : ''

  const charts = loading ? (
    Array.from({ length: innerCount }, (_, i) => (
      <section key={i} className="sd-dash-v2__chart-card">
        <p className="sd-dash-v2__chart-title">Loading…</p>
        <div className="sd-dash-v2__chart-skel" />
      </section>
    ))
  ) : (
    <>
      {showRevenue ? (
        <section className="sd-dash-v2__chart-card">
          <div className="sd-dash-v2__chart-head">
            <div>
              <h3 className="sd-dash-v2__chart-title">Revenue trend</h3>
              <p className="sd-dash-v2__chart-sub">
                MTD {money(Number(revenue?.this_month || 0), { compact: true })}
                {revenue?.change_pct != null
                  ? ` · ${revenue.change_pct >= 0 ? '+' : ''}${revenue.change_pct}% vs last month`
                  : ''}
              </p>
            </div>
          </div>
          <TrendChart
            data={series}
            gradientId="dashOverviewRevenue"
            formatValue={(v) => money(v, { compact: true })}
            className="sd-dash-v2__chart-trend"
          />
        </section>
      ) : null}

      <section className="sd-dash-v2__chart-card sd-dash-v2__chart-card--time">
        <div className="sd-dash-v2__chart-head">
          <div>
            <h3 className="sd-dash-v2__chart-title">Time this month</h3>
            <p className="sd-dash-v2__chart-sub">Billable vs on-duty hours</p>
          </div>
        </div>
        <TimeDonut
          billable={Number(timeOverview?.billable_hours || 0)}
          onDuty={Number(timeOverview?.on_duty_hours || 0)}
        />
      </section>

      {showPresence ? (
        <section className="sd-dash-v2__chart-card">
          <div className="sd-dash-v2__chart-head">
            <div>
              <h3 className="sd-dash-v2__chart-title">Team presence</h3>
              <p className="sd-dash-v2__chart-sub">
                {presence?.summary?.on_duty ?? 0} on duty right now
              </p>
            </div>
          </div>
          <PresenceBars summary={presence?.summary} />
        </section>
      ) : null}
    </>
  )

  return (
    <div className="sd-dash-v2__charts-row">
      <div className={`sd-dash-v2__charts-inner${innerClass}`}>{charts}</div>
      <DashboardFocusToday items={focusItems} />
    </div>
  )
}
