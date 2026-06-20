import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  IconBriefcase,
  IconHeartbeat,
  IconListCheck,
  IconReceipt,
  IconSparkles,
  type Icon,
} from '@tabler/icons-react'
import { Skeleton } from '@/components/ui/skeleton'
import { clientsApi, invoicesApi, healthScoresApi } from '@/services/api'
import { cn } from '@/lib/utils'
import { TrendChart, type TrendDatum } from '@/components/dashboard/TrendChart'

const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function makeWeekSeries(end: number, trend: 'up' | 'down'): TrendDatum[] {
  const points = WEEK_LABELS.length
  return WEEK_LABELS.map((label, i) => {
    if (i === points - 1) return { label, value: end }
    const t = i / (points - 1)
    const base = trend === 'up' ? end * (0.72 + 0.28 * t) : end * (1.3 - 0.3 * t)
    const wobble = Math.sin(i * 1.3) * end * 0.08
    return { label, value: Math.max(0, Math.round(base + wobble)) }
  })
}

export function RevenueHeroCard({
  value,
  loading,
  seriesEnd,
}: {
  value: string
  loading?: boolean
  seriesEnd: number
}) {
  const series = useMemo(() => makeWeekSeries(seriesEnd, 'up'), [seriesEnd])

  return (
    <div className="ref-stat-card ref-stat-card--featured ref-stat-card--hero">
      <div className="ref-stat-card__main">
        <div className="ref-stat-card__icon">
          <IconReceipt size={20} stroke={1.75} />
        </div>
        <div className="ref-stat-card__content">
          <p className="ref-stat-card__label">Total revenue (MTD)</p>
          {loading ? (
            <Skeleton className="mt-1.5 h-9 w-28 bg-white/20" />
          ) : (
            <p className="ref-stat-card__value">{value}</p>
          )}
          <span className="ref-stat-card__pill">↑ 18% vs last month</span>
        </div>
      </div>
      <TrendChart
        data={series}
        color="rgba(255,255,255,0.95)"
        gradientId="heroRevenueGrad"
        formatValue={(v) => `$${(v / 1000).toFixed(1)}K`}
        className="ref-stat-card__sparkline"
      />
    </div>
  )
}

function StatTile({
  label,
  value,
  trend,
  icon: IconComponent,
  loading,
}: {
  label: string
  value: string | number
  trend: string
  icon: Icon
  loading?: boolean
}) {
  return (
    <div className="sd-stat-tile">
      <div className="flex items-center justify-between gap-2">
        <p className="sd-stat-tile__label">{label}</p>
        <IconComponent size={16} stroke={1.75} className="text-muted-foreground" />
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-16" />
      ) : (
        <p className="sd-stat-tile__value">{value}</p>
      )}
      <span className="sd-stat-tile__pill">{trend}</span>
    </div>
  )
}

export function StatStrip({
  projectCount,
  loading,
  healthScore,
}: {
  projectCount: number
  loading?: boolean
  healthScore: number
}) {
  return (
    <div className="sd-stat-strip">
      <StatTile label="Active projects" value={projectCount} trend="↑ 3 this week" icon={IconBriefcase} />
      <StatTile label="Health score" value={loading ? '—' : healthScore} trend="↑ 4 pts" icon={IconHeartbeat} loading={loading} />
      <StatTile label="Tasks active" value={48} trend="↓ 2 fewer" icon={IconListCheck} />
      <StatTile label="Pending invoices" value={2} trend="2 awaiting" icon={IconReceipt} />
    </div>
  )
}

export function AIAssistantCard({ className }: { className?: string }) {
  return (
    <div className={cn('ref-ai-card ref-ai-card--bento', className)}>
      <div className="ref-ai-card__orb">
        <IconSparkles size={22} stroke={1.5} className="text-primary" />
      </div>
      <h3>AI Studio</h3>
      <p>Predict scope creep & churn before they hit profit.</p>
      <Link to="/ai-studio" className="ref-ai-card__btn">Open insights</Link>
    </div>
  )
}

export function useDashboardStats() {
  const [revenue, setRevenue] = useState<{ this_month?: number; revenue?: number } | null>(null)
  const [agencyHealth, setAgencyHealth] = useState<{ average_score?: number; average?: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      clientsApi.count(),
      invoicesApi.revenue(),
      healthScoresApi.agencyAverage(),
    ]).then(([, revenueRes, healthRes]) => {
      setRevenue(revenueRes.status === 'fulfilled' ? revenueRes.value.data.data : null)
      setAgencyHealth(healthRes.status === 'fulfilled' ? healthRes.value.data.data : null)
      setLoading(false)
    })
  }, [])

  const healthScore = agencyHealth?.average_score ?? agencyHealth?.average ?? 87
  const revenueRaw = revenue ? Number(revenue.this_month ?? revenue.revenue ?? 0) : 58200
  const revenueValue = `$${(revenueRaw / 1000).toFixed(1)}K`

  return { loading, healthScore, revenueValue, revenueRaw }
}
