import { Link } from 'react-router-dom'
import {
  IconAlertTriangle,
  IconHeartbeat,
  IconSparkles,
  IconUsers,
} from '@tabler/icons-react'

export default function DashboardSparkAI({
  health = null,
  credits = null,
  presence = null,
  alerts = [],
}) {
  const atRisk = health?.at_risk_projects || []
  const green = Number(health?.green_count || 0)
  const amber = Number(health?.amber_count || 0)
  const red = Number(health?.red_count || 0)
  const avg = health?.average_score
  const onDuty = presence?.summary?.on_duty ?? 0
  const creditLeft = credits?.remaining

  const pills = []

  atRisk.slice(0, 2).forEach((p) => {
    pills.push({
      id: `risk-${p.id}`,
      tone: p.flag === 'red' ? 'danger' : 'warning',
      icon: IconAlertTriangle,
      title: `${p.name} is ${p.flag} (score ${p.score})`,
      action: 'Review health',
      href: '/ai-studio?section=health',
    })
  })

  // Upsell lives in the overview Upsell Engine band — not duplicated here.

  if (avg != null && green + amber + red > 0) {
    pills.push({
      id: 'health-avg',
      tone: avg >= 70 ? 'success' : avg >= 40 ? 'warning' : 'danger',
      icon: IconHeartbeat,
      title: `Agency health average ${avg}/100 · ${green} green`,
      action: 'Open health',
      href: '/ai-studio?section=health',
    })
  }

  if (creditLeft != null) {
    pills.push({
      id: 'credits',
      tone: creditLeft < 100 ? 'warning' : 'info',
      icon: IconSparkles,
      title: `${creditLeft} AI credits left this month`,
      action: 'View AI Studio',
      href: '/ai-studio',
    })
  }

  if (onDuty > 0) {
    pills.push({
      id: 'presence',
      tone: 'info',
      icon: IconUsers,
      title: `${onDuty} teammate${onDuty > 1 ? 's' : ''} on duty now`,
      action: 'Open Time',
      href: '/workload',
    })
  }

  if (Array.isArray(alerts) && alerts.length > 0 && pills.length < 4) {
    pills.push({
      id: 'alerts',
      tone: 'warning',
      icon: IconAlertTriangle,
      title: `${alerts.length} recent AI / project alert${alerts.length > 1 ? 's' : ''}`,
      action: 'View alerts',
      href: '/ai-studio?section=alerts',
    })
  }

  const shown = pills.slice(0, 6)

  return (
    <section className="sd-dash-v2__ai-banner">
      <div className="sd-dash-v2__ai-head">
        <div className="sd-dash-v2__ai-brand">
          <span className="sd-dash-v2__ai-mascot" aria-hidden>
            <IconSparkles size={26} stroke={1.5} />
          </span>
          <div>
            <h2 className="sd-dash-v2__ai-title">
              Sparkdraw AI Insights
              <span className="sd-dash-v2__ai-beta">BETA</span>
            </h2>
            <p className="sd-dash-v2__ai-sub">
              Live risk, upsell, credits, and presence signals for this agency
            </p>
          </div>
        </div>
        <Link to="/ai-studio" className="sd-dash-v2__ai-cta">
          Open AI Insights
        </Link>
      </div>

      <div className="sd-dash-v2__ai-pills">
        {shown.length === 0 ? (
          <p className="text-sm text-muted-foreground px-1 py-2">
            Insights will appear as health scores, upsells, and team activity come in.
          </p>
        ) : (
          shown.map((item) => {
            const Icon = item.icon || IconAlertTriangle
            return (
              <Link
                key={item.id}
                to={item.href}
                className={`sd-dash-v2__ai-pill sd-dash-v2__ai-pill--${item.tone}`}
              >
                <span className="sd-dash-v2__ai-pill-icon" aria-hidden>
                  <Icon size={16} stroke={1.75} />
                </span>
                <div className="sd-dash-v2__ai-pill-body">
                  <p className="sd-dash-v2__ai-pill-title">{item.title}</p>
                  <span className="sd-dash-v2__ai-pill-action">{item.action} →</span>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </section>
  )
}
