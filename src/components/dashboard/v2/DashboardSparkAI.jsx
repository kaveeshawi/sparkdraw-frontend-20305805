import { Link } from 'react-router-dom'
import {
  IconAlertTriangle,
  IconRobot,
} from '@tabler/icons-react'

export default function DashboardSparkAI({ health = null }) {
  const atRisk = health?.at_risk_projects || []
  const pills = atRisk.slice(0, 3).map((p) => ({
    id: p.id,
    tone: p.flag === 'red' ? 'danger' : 'warning',
    title: `${p.name} is ${p.flag} (score ${p.score})`,
    action: 'Review health',
    href: '/health-scores',
  }))

  return (
    <section className="sd-dash-v2__ai-banner">
      <div className="sd-dash-v2__ai-head">
        <div className="sd-dash-v2__ai-brand">
          <span className="sd-dash-v2__ai-mascot" aria-hidden>
            <IconRobot size={28} stroke={1.5} />
          </span>
          <div>
            <h2 className="sd-dash-v2__ai-title">
              Sparkdraw AI Insights
              <span className="sd-dash-v2__ai-beta">BETA</span>
            </h2>
            <p className="sd-dash-v2__ai-sub">
              Live C3 risk signals for this agency — no demo filler
            </p>
          </div>
        </div>
        <Link to="/ai-studio" className="sd-dash-v2__ai-cta">
          Ask Sparkdraw AI
        </Link>
      </div>

      <div className="sd-dash-v2__ai-pills">
        {pills.length === 0 ? (
          <p className="text-sm text-muted-foreground px-1 py-2">
            Insufficient events for predictive chips — Health will populate these when scores exist.
          </p>
        ) : (
          pills.map((item) => (
            <Link
              key={item.id}
              to={item.href}
              className={`sd-dash-v2__ai-pill sd-dash-v2__ai-pill--${item.tone}`}
            >
              <span className="sd-dash-v2__ai-pill-icon" aria-hidden>
                <IconAlertTriangle size={16} stroke={1.75} />
              </span>
              <div className="sd-dash-v2__ai-pill-body">
                <p className="sd-dash-v2__ai-pill-title">{item.title}</p>
                <span className="sd-dash-v2__ai-pill-action">{item.action} →</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  )
}
