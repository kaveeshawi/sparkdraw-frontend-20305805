import {
  IconBriefcase,
  IconClipboardCheck,
  IconHeartbeat,
  IconListCheck,
} from '@tabler/icons-react'
import { TrendChart } from '@/components/dashboard/TrendChart'
import { DASHBOARD_KPIS } from '../dashboard-demo-data'

const ICONS = {
  briefcase: IconBriefcase,
  list: IconListCheck,
  heartbeat: IconHeartbeat,
  clipboard: IconClipboardCheck,
}

const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function DashboardKpiStrip() {
  return (
    <div className="sd-dash-v2__kpi-grid">
      {DASHBOARD_KPIS.map((kpi) => {
        const Icon = ICONS[kpi.icon]
        const series = WEEK.map((label, i) => ({ label, value: kpi.sparkline[i] ?? kpi.sparkline.at(-1) }))

        return (
          <article key={kpi.id} className="sd-dash-v2__kpi-card">
            <div className="sd-dash-v2__kpi-top">
              <p className="sd-dash-v2__kpi-label">{kpi.label}</p>
              <span className="sd-dash-v2__kpi-icon" aria-hidden>
                <Icon size={18} stroke={1.75} />
              </span>
            </div>
            <p className="sd-dash-v2__kpi-value">{kpi.value}</p>
            <p
              className={`sd-dash-v2__kpi-trend${kpi.trendUp ? ' is-up' : ' is-down'}`}
            >
              {kpi.trendUp ? '↑' : '↓'} {kpi.trend}
            </p>
            <TrendChart
              data={series}
              color="var(--primary)"
              gradientId={`dash-kpi-${kpi.id}`}
              className="sd-dash-v2__kpi-spark"
            />
          </article>
        )
      })}
    </div>
  )
}
