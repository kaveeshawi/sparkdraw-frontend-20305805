import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  IconBriefcase,
  IconHeartbeat,
  IconListCheck,
  IconCurrencyDollar,
  IconTrendingUp,
  IconArrowRight,
  IconSparkles,
} from '@tabler/icons-react'
import { TrendChart } from '@/components/dashboard/TrendChart'
import { useFormatMoney } from '@/hooks/useAgencyCurrency'
import DashboardFocusToday from '@/components/dashboard/v2/DashboardFocusToday'

const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug']

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

function formatServiceType(value) {
  return String(value || 'service')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
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

function ChartCard({ title, sub, children, className = '' }) {
  return (
    <section className={`sd-dash-v2__chart-card ${className}`.trim()}>
      <div className="sd-dash-v2__chart-head">
        <div>
          <h3 className="sd-dash-v2__chart-title">{title}</h3>
          {sub ? <p className="sd-dash-v2__chart-sub">{sub}</p> : null}
        </div>
      </div>
      {children}
    </section>
  )
}

function UpsellFeatureCard({ upsells = [] }) {
  const top = upsells[0]
  const options = upsells.slice(0, 3)
  const conf = top ? Math.round(Number(top.confidence || 0) * 100) : null
  const href = '/ai-studio?section=upsell'
  const count = upsells.length

  return (
    <Link to={href} className="sd-dash-v2__upsell-feature sd-dash-v2__upsell-feature--link">
      <div className="sd-dash-v2__upsell-feature-top">
        <div className="sd-dash-v2__upsell-feature-brand">
          <span className="sd-dash-v2__upsell-feature-icon" aria-hidden>
            <IconTrendingUp size={20} stroke={1.75} />
          </span>
          <div>
            <p className="sd-dash-v2__upsell-feature-eyebrow">C2 · Predictive</p>
            <h3 className="sd-dash-v2__upsell-feature-title">Upsell Engine</h3>
          </div>
        </div>
        {conf != null ? (
          <div className="sd-dash-v2__upsell-feature-score" aria-label={`${conf}% confidence`}>
            <strong>{conf}%</strong>
            <span>confidence</span>
          </div>
        ) : null}
      </div>

      {top ? (
        <>
          <p className="sd-dash-v2__upsell-feature-project">
            {top.project_name || 'Project'}
            {top.client_name ? ` · ${top.client_name}` : ''}
          </p>
          <p className="sd-dash-v2__upsell-feature-service">
            {formatServiceType(top.service_type)}
          </p>
          {options.length > 1 ? (
            <ul className="sd-dash-v2__upsell-feature-options">
              {options.map((u, i) => (
                <li key={u.id}>
                  <em>#{i + 1}</em>
                  {formatServiceType(u.service_type)}
                  <span>{Math.round(Number(u.confidence || 0) * 100)}%</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="sd-dash-v2__upsell-feature-hint">
              Review, send to client, or re-run from AI Insights → Upsell.
            </p>
          )}
        </>
      ) : (
        <p className="sd-dash-v2__upsell-feature-hint">
          No pending suggestions yet. Open Upsell Engine to review and run models.
        </p>
      )}

      <div className="sd-dash-v2__upsell-feature-foot">
        <span className="sd-dash-v2__upsell-feature-cta">
          <IconSparkles size={15} stroke={1.75} />
          Open engine
          <IconArrowRight size={14} stroke={1.75} />
        </span>
        {count > 0 ? (
          <span className="sd-dash-v2__upsell-feature-count">
            {count} awaiting review
          </span>
        ) : null}
      </div>
    </Link>
  )
}

/**
 * Overview bands:
 * 1) KPI strip
 * 2) Upsell Engine + Focus
 * 3) Charts (Revenue / Time / Presence)
 */
export default function DashboardOverviewGrid({
  loading = false,
  summary = null,
  health = null,
  revenue = null,
  timeOverview = null,
  presence = null,
  tasksInProgress = 0,
  focusItems = [],
  pendingUpsells = [],
  showRevenue = true,
  showPresence = true,
}) {
  const formatMoney = useFormatMoney()
  const money = formatMoney

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
  const revenueSpark = useMemo(
    () => makeWeekSeries(Math.max(thisMonth, lastMonth * 0.85, 1), revenueTrend),
    [thisMonth, lastMonth, revenueTrend],
  )
  const revenueChart = useMemo(
    () => buildRevenueSeries(revenue?.this_month, revenue?.last_month),
    [revenue?.this_month, revenue?.last_month],
  )

  const kpiCount = 3 + (showRevenue ? 1 : 0)
  const chartCount = (showRevenue ? 1 : 0) + 1 + (showPresence ? 1 : 0)

  if (loading) {
    return (
      <div className="sd-dash-v2__overview">
        <div className={`sd-dash-v2__kpi-strip sd-dash-v2__kpi-strip--${kpiCount}`}>
          {Array.from({ length: kpiCount }, (_, i) => (
            <article key={i} className="sd-dash-v2__kpi-card">
              <p className="sd-dash-v2__kpi-label">Loading…</p>
              <p className="sd-dash-v2__kpi-value">—</p>
            </article>
          ))}
        </div>
        <div className="sd-dash-v2__action-row">
          <section className="sd-dash-v2__upsell-feature">
            <div className="sd-dash-v2__chart-skel" />
          </section>
          <article className="sd-dash-v2__focus-card">
            <div className="sd-dash-v2__chart-skel" />
          </article>
        </div>
      </div>
    )
  }

  return (
    <div className="sd-dash-v2__overview">
      {/* Band 1 — KPIs */}
      <div className={`sd-dash-v2__kpi-strip sd-dash-v2__kpi-strip--${kpiCount}`}>
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
            sparkSeries={revenueSpark}
            sparkColor="#f97316"
            sparkId="dashKpiRevenue"
            formatSpark={(v) => formatMoney(v, { compact: true })}
          />
        ) : null}
      </div>

      {/* Band 2 — Upsell Engine + Focus */}
      <div className="sd-dash-v2__action-row">
        <UpsellFeatureCard upsells={pendingUpsells} />
        <DashboardFocusToday items={focusItems} />
      </div>

      {/* Band 3 — Charts */}
      <div className={`sd-dash-v2__chart-strip sd-dash-v2__chart-strip--${chartCount}`}>
        {showRevenue ? (
          <ChartCard
            title="Revenue trend"
            sub={`MTD ${money(Number(revenue?.this_month || 0), { compact: true })}${
              revenue?.change_pct != null
                ? ` · ${revenue.change_pct >= 0 ? '+' : ''}${revenue.change_pct}% vs last month`
                : ''
            }`}
          >
            <TrendChart
              data={revenueChart}
              gradientId="dashOverviewRevenue"
              formatValue={(v) => money(v, { compact: true })}
              className="sd-dash-v2__chart-trend"
            />
          </ChartCard>
        ) : null}

        <ChartCard
          title="Time this month"
          sub="Billable vs on-duty hours"
          className="sd-dash-v2__chart-card--time"
        >
          <TimeDonut
            billable={Number(timeOverview?.billable_hours || 0)}
            onDuty={Number(timeOverview?.on_duty_hours || 0)}
          />
        </ChartCard>

        {showPresence ? (
          <ChartCard
            title="Team presence"
            sub={`${presence?.summary?.on_duty ?? 0} on duty right now`}
          >
            <PresenceBars summary={presence?.summary} />
          </ChartCard>
        ) : null}
      </div>
    </div>
  )
}
