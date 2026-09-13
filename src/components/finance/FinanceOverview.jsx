import { useMemo } from 'react'
import { useFormatMoney } from '@/hooks/useAgencyCurrency'

const STATUS_COLORS = {
  paid: '#10b981',
  sent: '#3b82f6',
  overdue: '#e11d48',
  draft: '#94a3b8',
}

function StatusDonut({ segments, total }) {
  if (!total) {
    return (
      <div className="sd-team-donut sd-team-donut--empty sd-finance-donut" aria-hidden>
        <span>0</span>
      </div>
    )
  }

  let cursor = 0
  const stops = segments
    .filter((s) => s.amount > 0)
    .map((s) => {
      const start = cursor
      const end = cursor + (s.amount / total) * 100
      cursor = end
      return `${s.color} ${start}% ${end}%`
    })
    .join(', ')

  return (
    <div
      className="sd-team-donut sd-finance-donut"
      style={{ background: `conic-gradient(${stops || '#e5e7eb 0% 100%'})` }}
      aria-hidden
    >
      <div className="sd-team-donut__hole">
        <strong>{segments.length}</strong>
        <span>Statuses</span>
      </div>
    </div>
  )
}

export default function FinanceOverview({ summary }) {
  const money = useFormatMoney()

  const byStatus = useMemo(() => {
    const rows = summary?.by_status || []
    return rows.map((row) => ({
      ...row,
      color: STATUS_COLORS[row.status] || '#64748b',
      amount: Number(row.amount) || 0,
      count: Number(row.count) || 0,
    }))
  }, [summary])

  const statusTotal = byStatus.reduce((sum, s) => sum + s.amount, 0)
  const aging = summary?.aging || []
  const maxAging = Math.max(1, ...aging.map((a) => Number(a.amount) || 0))

  return (
    <section className="sd-finance-overview">
      <div className="sd-team-kpi">
        <div className="sd-stat-tile sd-team-kpi__card">
          <div className="sd-team-kpi__top">
            <div>
              <p className="sd-stat-tile__label">Collected</p>
              <p className="sd-stat-tile__value">{money(summary?.collected ?? summary?.this_month ?? 0)}</p>
              <p className="sd-team-kpi__hint">
                This month
                {summary?.change_pct != null
                  ? ` · ${summary.change_pct >= 0 ? '+' : ''}${summary.change_pct}%`
                  : ''}
              </p>
            </div>
          </div>
        </div>
        <div className="sd-stat-tile sd-team-kpi__card">
          <div className="sd-team-kpi__top">
            <div>
              <p className="sd-stat-tile__label">Outstanding</p>
              <p className="sd-stat-tile__value">{money(summary?.outstanding ?? 0)}</p>
              <p className="sd-team-kpi__hint">Sent + overdue</p>
            </div>
          </div>
        </div>
        <div className="sd-stat-tile sd-team-kpi__card">
          <div className="sd-team-kpi__top">
            <div>
              <p className="sd-stat-tile__label">Overdue</p>
              <p className="sd-stat-tile__value">{money(summary?.overdue_total ?? 0)}</p>
              <p className="sd-team-kpi__hint">Needs collection</p>
            </div>
          </div>
        </div>
        <div className="sd-stat-tile sd-team-kpi__card">
          <div className="sd-team-kpi__top">
            <div>
              <p className="sd-stat-tile__label">Drafts</p>
              <p className="sd-stat-tile__value">{summary?.draft_count ?? 0}</p>
              <p className="sd-team-kpi__hint">Not sent yet</p>
            </div>
          </div>
        </div>
      </div>

      <div className="sd-finance-overview__charts">
        <div className="sd-card sd-finance-overview__panel">
          <p className="sd-finance-overview__label">By status</p>
          <div className="sd-finance-overview__status">
            <StatusDonut segments={byStatus} total={statusTotal} />
            <ul className="sd-finance-overview__legend">
              {byStatus.map((row) => (
                <li key={row.status}>
                  <span className="sd-finance-overview__swatch" style={{ background: row.color }} />
                  <span className="capitalize">{row.status}</span>
                  <strong>{money(row.amount)}</strong>
                  <em>{row.count}</em>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="sd-card sd-finance-overview__panel">
          <p className="sd-finance-overview__label">Overdue aging</p>
          <div className="sd-finance-aging" role="img" aria-label="Overdue invoice aging">
            {aging.map((bucket) => {
              const amount = Number(bucket.amount) || 0
              const pct = Math.max(amount > 0 ? 8 : 0, Math.round((amount / maxAging) * 100))
              return (
                <div key={bucket.bucket} className="sd-finance-aging__col">
                  <span className="sd-finance-aging__value">{amount > 0 ? money(amount) : ''}</span>
                  <div className="sd-finance-aging__track">
                    <div className="sd-finance-aging__fill" style={{ height: `${pct}%` }} />
                  </div>
                  <span className="sd-finance-aging__label">{bucket.label || bucket.bucket}</span>
                  <span className="sd-finance-aging__count">{bucket.count || 0}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
