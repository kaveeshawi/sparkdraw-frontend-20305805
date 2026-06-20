import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  IconAlertTriangle,
  IconClipboardCheck,
  IconMoodSad,
  IconRobot,
  IconSparkles,
} from '@tabler/icons-react'
import { TrendChart } from '@/components/dashboard/TrendChart'
import { Skeleton } from '@/components/ui/skeleton'
import {
  alertsApi,
  clientsApi,
  healthScoresApi,
  invoicesApi,
  upsellApi,
} from '../../services/api'

function formatMoney(n) {
  const v = Number(n) || 0
  if (v >= 1000) return `$${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}K`
  return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

function formatMoneyFull(n) {
  return `$${(Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

/** Build a simple month-to-date series when the API only returns totals. */
function buildRevenueSeries(thisMonth, lastMonth) {
  const end = Math.max(Number(thisMonth) || 0, 0)
  const start = Math.max(Number(lastMonth) || 0, 0) * 0.15
  const labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Now']
  return labels.map((label, i) => {
    const t = i / (labels.length - 1)
    const ease = t * t * (3 - 2 * t)
    const wobble = 1 + Math.sin(i * 1.2) * 0.04
    return { label, value: Math.max(0, Math.round((start + (end - start) * ease) * wobble)) }
  })
}

function healthSegmentsFromProjects(projects = [], agencyAvg) {
  let green = 0
  let amber = 0
  let red = 0
  let onHold = 0

  projects.forEach((p) => {
    if (p.status === 'on_hold') {
      onHold += 1
      return
    }
    if (p.status !== 'active') return
    const flag = p.health_score?.flag || p.latest_health_score?.flag
    if (flag === 'green') green += 1
    else if (flag === 'amber') amber += 1
    else if (flag === 'red') red += 1
  })

  if (green + amber + red === 0 && agencyAvg) {
    green = agencyAvg.green_count ?? 0
    amber = agencyAvg.amber_count ?? 0
    red = agencyAvg.red_count ?? 0
  }

  const total = green + amber + red + onHold
  const pct = (n) => (total > 0 ? Math.round((n / total) * 100) : 0)

  return {
    total,
    segments: [
      { label: 'On Track', count: green, color: '#10b981', pct: pct(green) },
      { label: 'At Risk', count: amber, color: '#f59e0b', pct: pct(amber) },
      { label: 'On Hold', count: onHold, color: '#3b82f6', pct: pct(onHold) },
      { label: 'Critical', count: red, color: '#ef4444', pct: pct(red) },
    ],
  }
}

export default function ProjectsInsightsPanel({ projects = [], onViewProjects, compact = false }) {
  const [loading, setLoading] = useState(true)
  const [revenue, setRevenue] = useState(null)
  const [agencyAvg, setAgencyAvg] = useState(null)
  const [upsells, setUpsells] = useState([])
  const [sentiment, setSentiment] = useState([])
  const [alerts, setAlerts] = useState([])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.allSettled([
      invoicesApi.revenue(),
      healthScoresApi.agencyAverage(),
      upsellApi.index({ status: 'pending' }),
      clientsApi.sentiment(),
      alertsApi.index(20),
    ]).then(([revRes, avgRes, upsellRes, sentRes, alertRes]) => {
      if (cancelled) return
      if (revRes.status === 'fulfilled') setRevenue(revRes.value.data.data)
      if (avgRes.status === 'fulfilled') setAgencyAvg(avgRes.value.data.data)
      if (upsellRes.status === 'fulfilled') setUpsells(upsellRes.value.data.data || [])
      if (sentRes.status === 'fulfilled') setSentiment(sentRes.value.data.data || [])
      if (alertRes.status === 'fulfilled') setAlerts(alertRes.value.data.data || [])
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const thisMonth = Number(revenue?.this_month ?? 0)
  const changePct = Number(revenue?.change_pct ?? 0)
  const series = useMemo(
    () => buildRevenueSeries(thisMonth, revenue?.last_month),
    [thisMonth, revenue?.last_month],
  )

  const distribution = useMemo(
    () => healthSegmentsFromProjects(projects, agencyAvg),
    [projects, agencyAvg],
  )

  const atRiskCount =
    agencyAvg?.at_risk_projects?.length ??
    projects.filter((p) => {
      const f = p.health_score?.flag || p.latest_health_score?.flag
      return p.status === 'active' && (f === 'amber' || f === 'red')
    }).length

  const upsellEstimate = upsells.reduce(
    (sum, u) => sum + Math.round((Number(u.confidence) || 0.5) * 5000),
    0,
  )
  const negativeClients = sentiment.filter((c) => c.at_risk || c.sentiment_label === 'negative').length
  const pendingApprovals = alerts.filter(
    (a) =>
      String(a.event_type || '').includes('approval') ||
      String(a.message || a.title || '').toLowerCase().includes('approval'),
  ).length

  let donutOffset = 0
  const donutGradient = distribution.segments
    .filter((s) => s.count > 0)
    .map((s) => {
      const start = donutOffset
      donutOffset += s.pct
      return `${s.color} ${start}% ${donutOffset}%`
    })
    .join(', ')

  const insights = [
    {
      id: 'risk',
      icon: IconAlertTriangle,
      tone: 'danger',
      text:
        atRiskCount > 0
          ? `${atRiskCount} project${atRiskCount === 1 ? '' : 's'} at high risk of budget overrun`
          : 'No projects currently at high overrun risk',
      action: 'View projects',
      href: onViewProjects ? null : '/projects',
      onClick: onViewProjects,
    },
    {
      id: 'upsell',
      icon: IconSparkles,
      tone: 'success',
      text:
        upsells.length > 0
          ? `${formatMoneyFull(upsellEstimate)} in upsell opportunities identified`
          : 'No pending upsell opportunities',
      action: 'View opportunities',
      href: '/ai-studio',
    },
    {
      id: 'sentiment',
      icon: IconMoodSad,
      tone: 'warning',
      text:
        negativeClients > 0
          ? `${negativeClients} client${negativeClients === 1 ? '' : 's'} showing negative sentiment`
          : 'Client sentiment looks stable',
      action: 'Check feedback',
      href: '/ai-studio',
    },
    {
      id: 'approvals',
      icon: IconClipboardCheck,
      tone: 'info',
      text:
        pendingApprovals > 0
          ? `${pendingApprovals} approval${pendingApprovals === 1 ? '' : 's'} pending from clients`
          : 'No approval alerts right now',
      action: 'View approvals',
      href: '/ai-studio',
    },
  ]

  if (loading) {
    return (
      <div className={`sd-projects-insights${compact ? ' sd-projects-insights--compact' : ''}`}>
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-36 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className={`sd-projects-insights${compact ? ' sd-projects-insights--compact' : ''}`}>
      {/* Revenue overview */}
      <section className="sd-insights-card">
        <div className="sd-insights-card__head">
          <h3 className="sd-insights-card__title">Revenue overview</h3>
          <span className="sd-insights-card__period">This month</span>
        </div>
        <p className="sd-insights-card__metric">{formatMoneyFull(thisMonth)}</p>
        <p
          className={`sd-insights-card__delta${
            changePct >= 0 ? ' sd-insights-card__delta--up' : ' sd-insights-card__delta--down'
          }`}
        >
          {changePct >= 0 ? '↑' : '↓'} {Math.abs(changePct)}% vs last month
        </p>
        <div className="sd-insights-card__chart">
          {series.every((d) => d.value === 0) ? (
            <p className="sd-insights-card__empty">No paid invoice revenue this month yet.</p>
          ) : (
            <TrendChart
              data={series}
              color="var(--primary)"
              gradientId="projects-revenue-trend"
              formatValue={formatMoney}
              className="sd-insights-card__trend"
            />
          )}
        </div>
      </section>

      {/* AI insights */}
      <section className="sd-insights-card">
        <div className="sd-insights-card__head">
          <h3 className="sd-insights-card__title">AI insights</h3>
          <Link to="/ai-studio" className="sd-insights-card__link">
            View all
          </Link>
        </div>
        <ul className="sd-insights-list">
          {insights.map((row) => {
            const Icon = row.icon
            return (
              <li key={row.id} className={`sd-insights-row sd-insights-row--${row.tone}`}>
                <span className="sd-insights-row__icon" aria-hidden>
                  <Icon size={16} stroke={1.75} />
                </span>
                <p className="sd-insights-row__text">{row.text}</p>
                {row.href ? (
                  <Link to={row.href} className="sd-insights-row__action">
                    {row.action}
                  </Link>
                ) : (
                  <button type="button" className="sd-insights-row__action" onClick={row.onClick}>
                    {row.action}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
        <Link to="/ai-studio" className="sd-insights-ask">
          <IconRobot size={18} stroke={1.75} />
          Ask Sparkdraw AI
        </Link>
      </section>

      {/* Health distribution */}
      <section className="sd-insights-card">
        <div className="sd-insights-card__head">
          <h3 className="sd-insights-card__title">Project health distribution</h3>
        </div>
        <div className="sd-insights-donut">
          <div className="sd-insights-donut__wrap">
            <div
              className="sd-insights-donut__chart"
              style={{
                background:
                  distribution.total > 0 && donutGradient
                    ? `conic-gradient(${donutGradient})`
                    : 'var(--border)',
              }}
            >
              <div className="sd-insights-donut__hole">
                <span className="sd-insights-donut__count">{distribution.total}</span>
                <span className="sd-insights-donut__label">Projects</span>
              </div>
            </div>
          </div>
          <ul className="sd-insights-donut__legend">
            {distribution.segments.map((s) => (
              <li key={s.label}>
                <span className="sd-insights-donut__dot" style={{ background: s.color }} />
                <span className="sd-insights-donut__name">{s.label}</span>
                <span className="sd-insights-donut__stats">
                  {s.count}
                  <span className="sd-insights-donut__pct">, {s.pct}%</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}
