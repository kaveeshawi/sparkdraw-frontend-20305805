import {
  IconBriefcase,
  IconHeartbeat,
  IconListCheck,
  IconCurrencyDollar,
} from '@tabler/icons-react'

function formatMoney(n) {
  if (n == null || Number.isNaN(Number(n))) return null
  return `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

function KpiCard({ label, value, hint, hintTone, icon: Icon, empty }) {
  return (
    <article className="sd-dash-v2__kpi-card">
      <div className="sd-dash-v2__kpi-top">
        <p className="sd-dash-v2__kpi-label">{label}</p>
        <span className="sd-dash-v2__kpi-icon" aria-hidden>
          <Icon size={18} stroke={1.75} />
        </span>
      </div>
      {empty ? (
        <>
          <p className="sd-dash-v2__kpi-value">—</p>
          <p className="sd-dash-v2__kpi-trend">{hint || 'Insufficient events'}</p>
        </>
      ) : (
        <>
          <p className="sd-dash-v2__kpi-value">{value}</p>
          {hint ? (
            <p
              className={`sd-dash-v2__kpi-trend${hintTone === 'up' ? ' is-up' : ''}${hintTone === 'down' ? ' is-down' : ''}`}
            >
              {hint}
            </p>
          ) : null}
        </>
      )}
    </article>
  )
}

export default function DashboardKpiStrip({
  loading = false,
  summary = null,
  health = null,
  revenue = null,
  tasksInProgress = 0,
}) {
  if (loading) {
    return (
      <div className="sd-dash-v2__kpi-grid">
        {[1, 2, 3, 4].map((i) => (
          <article key={i} className="sd-dash-v2__kpi-card">
            <p className="sd-dash-v2__kpi-label">Loading…</p>
            <p className="sd-dash-v2__kpi-value">—</p>
          </article>
        ))}
      </div>
    )
  }

  const active = summary?.active ?? 0
  const avg = health?.average_score
  const scoredCount =
    Number(health?.green_count || 0) +
    Number(health?.amber_count || 0) +
    Number(health?.red_count || 0)
  const thisMonth = revenue?.this_month
  const lastMonth = revenue?.last_month
  const changePct = revenue?.change_pct

  const healthEmpty = !health || scoredCount === 0
  const revenueEmpty = revenue == null
  const revenueZeroHonest = !revenueEmpty && Number(thisMonth) === 0

  return (
    <div className="sd-dash-v2__kpi-grid">
      <KpiCard
        label="Active Projects"
        icon={IconBriefcase}
        value={String(active)}
        hint={summary?.total ? `${summary.total} total in agency` : 'No projects yet'}
      />
      <KpiCard
        label="Tasks in Progress"
        icon={IconListCheck}
        value={String(tasksInProgress)}
        hint={tasksInProgress === 0 ? 'No tasks in progress' : null}
      />
      <KpiCard
        label="Health Score (Avg.)"
        icon={IconHeartbeat}
        value={healthEmpty ? null : `${avg}/100`}
        empty={healthEmpty}
        hint={
          healthEmpty
            ? 'Insufficient events — recompute on Health'
            : `${health.green_count} green · ${health.amber_count} amber · ${health.red_count} red`
        }
      />
      <KpiCard
        label="Revenue (MTD)"
        icon={IconCurrencyDollar}
        value={revenueEmpty ? null : formatMoney(thisMonth)}
        empty={revenueEmpty}
        hint={
          revenueEmpty
            ? 'Revenue unavailable'
            : revenueZeroHonest
              ? Number(lastMonth) > 0
                ? `No paid invoices this month · last month ${formatMoney(lastMonth)}`
                : 'No paid invoices this month'
              : `${changePct >= 0 ? '+' : ''}${changePct}% vs last month`
        }
        hintTone={revenueZeroHonest ? null : Number(changePct) >= 0 ? 'up' : 'down'}
      />
    </div>
  )
}
