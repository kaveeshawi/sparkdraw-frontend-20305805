import { Link } from 'react-router-dom'
import {
  IconAlertTriangle,
  IconClipboardCheck,
  IconMoodSad,
  IconRobot,
  IconSparkles,
} from '@tabler/icons-react'
import { SPARK_AI_INSIGHTS } from '../dashboard-demo-data'

const INSIGHT_ICONS = {
  risk: IconAlertTriangle,
  upsell: IconSparkles,
  sentiment: IconMoodSad,
  approvals: IconClipboardCheck,
}

export default function DashboardSparkAI() {
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
              Predictive alerts across projects, clients, and revenue
            </p>
          </div>
        </div>
        <Link to="/ai-studio" className="sd-dash-v2__ai-cta">
          Ask Sparkdraw AI
        </Link>
      </div>

      <div className="sd-dash-v2__ai-pills">
        {SPARK_AI_INSIGHTS.map((item) => {
          const Icon = INSIGHT_ICONS[item.id]
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
        })}
      </div>
    </section>
  )
}
