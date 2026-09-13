import { useEffect, useState } from 'react'
import { TrendChart } from '@/components/dashboard/TrendChart'
import { Skeleton } from '@/components/ui/skeleton'
import { timeOverviewApi } from '@/services/api'
import { useFormatMoney } from '@/hooks/useAgencyCurrency'

const REVENUE_TREND = [
  { label: 'Jan', value: 32000 },
  { label: 'Feb', value: 38000 },
  { label: 'Mar', value: 35000 },
  { label: 'Apr', value: 44000 },
  { label: 'May', value: 41000 },
  { label: 'Jun', value: 52000 },
  { label: 'Jul', value: 49000 },
  { label: 'Aug', value: 58200 },
]

const HEALTH_TREND = [
  { label: 'Jan', value: 74 },
  { label: 'Feb', value: 78 },
  { label: 'Mar', value: 72 },
  { label: 'Apr', value: 80 },
  { label: 'May', value: 76 },
  { label: 'Jun', value: 83 },
  { label: 'Jul', value: 79 },
  { label: 'Aug', value: 87 },
]

function MiniBarChart() {
  const heights = [40, 65, 45, 80, 55, 70, 90, 60]
  return (
    <div className="ref-mini-panel__chart">
      {heights.map((h, i) => (
        <div key={i} className="ref-mini-panel__bar" style={{ height: `${h}%` }} />
      ))}
    </div>
  )
}

function formatHours(hours) {
  const n = Number(hours)
  return `${Number.isInteger(n) ? n : n.toFixed(1)}h`
}

function formatPeriod(start, end) {
  if (!start || !end) return null
  const opts = { month: 'short', day: 'numeric' }
  const s = new Date(`${start}T00:00:00`)
  const e = new Date(`${end}T00:00:00`)
  return `${s.toLocaleDateString(undefined, opts)} – ${e.toLocaleDateString(undefined, opts)}`
}

function TimeOverviewChart({ billable, onDuty }) {
  const total = billable + onDuty
  const billablePct = total > 0 ? (billable / total) * 100 : 0
  const onDutyPct = total > 0 ? (onDuty / total) * 100 : 0

  const gradient =
    total > 0
      ? `conic-gradient(var(--primary) 0% ${billablePct}%, #fb923c ${billablePct}% ${billablePct + onDutyPct}%, #e5e7eb ${billablePct + onDutyPct}% 100%)`
      : 'conic-gradient(#e5e7eb 0% 100%)'

  return (
    <div className="flex items-center justify-center gap-4 py-2">
      <div className="size-20 shrink-0 rounded-full" style={{ background: gradient }}>
        <div className="m-3 flex size-14 items-center justify-center rounded-full bg-card text-center">
          <span className="text-[10px] leading-tight text-muted-foreground">This month</span>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Billable</p>
          <p className="text-sm font-semibold tabular-nums">{formatHours(billable)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">On duty</p>
          <p className="text-sm font-semibold tabular-nums">{formatHours(onDuty)}</p>
        </div>
      </div>
    </div>
  )
}

export function RevenuePanel() {
  const money = useFormatMoney()
  return (
    <div className="ref-mini-panel">
      <p className="ref-mini-panel__title">Revenue overview</p>
      <TrendChart
        data={REVENUE_TREND}
        gradientId="revenueLineGrad"
        formatValue={(v) => money(v, { compact: true })}
      />
    </div>
  )
}

export function TimeTrackingPanel() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    timeOverviewApi
      .get()
      .then((res) => setData(res.data.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  const periodLabel = data?.period ? formatPeriod(data.period.start, data.period.end) : null

  return (
    <div className="ref-mini-panel">
      <p className="ref-mini-panel__title">Time tracking</p>
      {periodLabel && !loading && !error && (
        <p className="-mt-1 mb-1 text-[10px] text-muted-foreground">{periodLabel}</p>
      )}
      {loading ? (
        <div className="space-y-2 py-4">
          <Skeleton className="mx-auto h-20 w-20 rounded-full" />
          <Skeleton className="mx-auto h-4 w-28" />
        </div>
      ) : error ? (
        <p className="py-4 text-center text-xs text-muted-foreground">Unable to load time data</p>
      ) : (
        <TimeOverviewChart billable={data.billable_hours} onDuty={data.on_duty_hours} />
      )}
    </div>
  )
}

export function HealthTrendPanel() {
  return (
    <div className="ref-mini-panel">
      <p className="ref-mini-panel__title">Health trend</p>
      <TrendChart
        data={HEALTH_TREND}
        color="var(--primary)"
        gradientId="healthLineGrad"
        formatValue={(v) => `${v} / 100`}
      />
    </div>
  )
}

export function AIPrioritiesList({ revisions = [] }) {
  const items =
    revisions.length > 0
      ? revisions.slice(0, 4).map((r) => ({
          title: r.ai_ticket_json?.title || 'Review client feedback',
          desc: r.feedback_text?.slice(0, 60) + (r.feedback_text?.length > 60 ? '…' : ''),
          color: 'var(--primary)',
        }))
      : [
          { title: 'Review NovaTech feedback', desc: 'Premium UI upgrade requested', color: 'var(--primary)' },
          { title: 'Schedule Acme check-in', desc: 'Sentiment declining — follow up', color: '#f59e0b' },
          { title: 'Approve upsell for Bluewave', desc: 'SEO package — 82% confidence', color: '#10b981' },
        ]

  return (
    <div>
      {items.map((item, i) => (
        <div key={i} className="ref-list-item">
          <span className="ref-list-item__dot" style={{ background: item.color }} />
          <div className="min-w-0">
            <p className="text-sm font-medium">{item.title}</p>
            <p className="text-xs text-muted-foreground">{item.desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export function RiskFactorsList({ healthScores = [] }) {
  const factors = [
    { label: 'Revision rate', pct: 78, color: '#ef4444' },
    { label: 'Hours burn', pct: 65, color: '#f59e0b' },
    { label: 'Approval lag', pct: 42, color: '#f59e0b' },
    { label: 'Sentiment drop', pct: 28, color: '#10b981' },
  ]

  if (healthScores.some((hs) => hs.flag === 'red')) {
    factors[0].pct = 90
  }

  return (
    <div>
      {factors.map((f) => (
        <div key={f.label} className="ref-risk-bar">
          <span className="w-24 shrink-0 text-xs text-muted-foreground">{f.label}</span>
          <div className="ref-risk-bar__track">
            <div className="ref-risk-bar__fill" style={{ width: `${f.pct}%`, background: f.color }} />
          </div>
          <span className="w-8 text-right text-xs font-medium tabular-nums">{f.pct}%</span>
        </div>
      ))}
    </div>
  )
}

export function RecentActivityList() {
  const events = [
    { text: 'Alex completed "Homepage hero" task', time: '2h ago' },
    { text: 'NovaTech approved deliverable v2', time: '4h ago' },
    { text: 'Health score updated for Acme E-Commerce', time: '6h ago' },
    { text: 'New revision R3 from Bluewave', time: '1d ago' },
    { text: 'Invoice #1042 sent to Acme Corp', time: '1d ago' },
  ]

  return (
    <div>
      {events.map((e, i) => (
        <div key={i} className="ref-list-item">
          <span className="ref-list-item__dot" style={{ background: '#94a3b8' }} />
          <div className="min-w-0 flex-1">
            <p className="text-sm">{e.text}</p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">{e.time}</span>
        </div>
      ))}
    </div>
  )
}
