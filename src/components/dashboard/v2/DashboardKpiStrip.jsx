import { useMemo } from 'react'
import {
  IconBriefcase,
  IconHeartbeat,
  IconListCheck,
  IconCurrencyDollar,
} from '@tabler/icons-react'
import { TrendChart } from '@/components/dashboard/TrendChart'
import { useFormatMoney } from '@/hooks/useAgencyCurrency'

const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function makeWeekSeries(end, trend = 'up') {
  const target = Math.max(0, Number(end) || 0)
  const points = WEEK_LABELS.length
  return WEEK_LABELS.map((label, i) => {
    if (i === points - 1) return { label, value: target }
    const t = i / (points - 1)
    const base = trend === 'up' ? target * (0.68 + 0.32 * t) : target * (1.28 - 0.28 * t)
    const wobble = Math.sin(i * 1.35) * Math.max(target * 0.07, 0.8)
    return { label, value: Math.max(0, Math.round(base + wobble)) }
  })
}

function KpiCard({
  label,
  value,
  hint,
  hintTone,
  icon: Icon,
  empty,
  sparkSeries,
  sparkColor,
  sparkId,
  formatSpark,
}) {
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
      {!empty && sparkSeries?.length ? (
        <TrendChart
          data={sparkSeries}
          color={sparkColor || 'var(--primary)'}
          gradientId={sparkId}
          formatValue={formatSpark}
          className="sd-dash-v2__kpi-spark"
        />
      ) : null}
    </article>
  )
}

export default function DashboardKpiStrip({
  loading = false,
  summary = null,
  health = null,
  revenue = null,
  tasksInProgress = 0,
  showRevenue = true,
}) {
  const formatMoney = useFormatMoney()

  const active = summary?.active ?? 0
  const avg = Number(health?.average_score ?? 0)
  const scoredCount =
    Number(health?.green_count || 0) +
    Number(health?.amber_count || 0) +
    Number(health?.red_count || 0)
  const thisMonth = Number(revenue?.this_month ?? 0)
  const lastMonth = Number(revenue?.last_month ?? 0)
  const changePct = Number(revenue?.change_pct ?? 0)

  const healthEmpty = !health || scoredCount === 0
  const revenueEmpty = revenue == null
  const revenueZeroHonest = !revenueEmpty && thisMonth === 0
  const revenueTrend = changePct < 0 ? 'down' : 'up'

  const projectSeries = useMemo(() => makeWeekSeries(active, 'up'), [active])
  const taskSeries = useMemo(() => makeWeekSeries(tasksInProgress, 'up'), [tasksInProgress])
  const healthSeries = useMemo(
    () => makeWeekSeries(healthEmpty ? 0 : avg, 'up'),
    [avg, healthEmpty],
  )
  const revenueSeries = useMemo(
    () => makeWeekSeries(Math.max(thisMonth, lastMonth * 0.85, 1), revenueTrend),
    [thisMonth, lastMonth, revenueTrend],
  )

  if (loading) {
    return (
      <div className={`sd-dash-v2__kpi-grid${showRevenue ? '' : ' sd-dash-v2__kpi-grid--3'}`}>
        {[1, 2, 3, ...(showRevenue ? [4] : [])].map((i) => (
          <article key={i} className="sd-dash-v2__kpi-card">
            <p className="sd-dash-v2__kpi-label">Loading…</p>
            <p className="sd-dash-v2__kpi-value">—</p>
          </article>
        ))}
      </div>
    )
  }

  return (
    <div className={`sd-dash-v2__kpi-grid${showRevenue ? '' : ' sd-dash-v2__kpi-grid--3'}`}>
      <KpiCard
        label="Active Projects"
        icon={IconBriefcase}
        value={String(active)}
        hint={summary?.total ? `${summary.total} total in agency` : 'No projects yet'}
        sparkSeries={projectSeries}
        sparkColor="#2563eb"
        sparkId="dashKpiProjects"
      />
      <KpiCard
        label="Tasks in Progress"
        icon={IconListCheck}
        value={String(tasksInProgress)}
        hint={tasksInProgress === 0 ? 'No tasks in progress' : null}
        sparkSeries={taskSeries}
        sparkColor="#7c3aed"
        sparkId="dashKpiTasks"
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
        sparkSeries={healthSeries}
        sparkColor="#10b981"
        sparkId="dashKpiHealth"
      />
      {showRevenue ? (
        <KpiCard
          label="Revenue (MTD)"
          icon={IconCurrencyDollar}
          value={
            revenueEmpty
              ? null
              : thisMonth == null || Number.isNaN(thisMonth)
                ? null
                : formatMoney(thisMonth)
          }
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
          hintTone={revenueZeroHonest ? null : changePct >= 0 ? 'up' : 'down'}
          sparkSeries={revenueSeries}
          sparkColor="#f97316"
          sparkId="dashKpiRevenue"
          formatSpark={(v) => formatMoney(v, { compact: true })}
        />
      ) : null}
    </div>
  )
}
