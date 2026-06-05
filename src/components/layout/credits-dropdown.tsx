import { useState } from 'react'
import { Link } from 'react-router-dom'
import { IconChevronDown, IconSparkles } from '@tabler/icons-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import useAuthStore from '@/store/authStore'
import { cn } from '@/lib/utils'

type UsageTab = 'credits' | 'hours' | 'storage'

type UsageMetric = {
  label: string
  unit: string
  total: number
  remaining: number
}

const PLAN_NAME = 'Agency Starter'

const USAGE: Record<UsageTab, UsageMetric> = {
  credits: { label: 'Remaining credits', unit: 'Credits', total: 10, remaining: 10 },
  hours: { label: 'AI hours left', unit: 'Hours', total: 25, remaining: 18 },
  storage: { label: 'Storage available', unit: 'GB', total: 10, remaining: 7.2 },
}

const TABS: { id: UsageTab; label: string }[] = [
  { id: 'credits', label: 'Credits' },
  { id: 'hours', label: 'Hours' },
  { id: 'storage', label: 'Storage' },
]

function formatValue(tab: UsageTab, value: number) {
  if (tab === 'storage') return value % 1 === 0 ? String(value) : value.toFixed(1)
  return String(Math.round(value))
}

function progressPct(metric: UsageMetric) {
  if (metric.total <= 0) return 0
  return Math.min(100, Math.round((metric.remaining / metric.total) * 100))
}

export function CreditsDropdown() {
  const { user } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<UsageTab>('credits')

  if (!user || user.role === 'client') return null

  const metric = USAGE[tab]
  const pct = progressPct(metric)
  const creditsRemaining = USAGE.credits.remaining

  return (
    <div className="sd-float-topbar__credits">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="sd-credits-trigger"
            aria-label={`${creditsRemaining} AI credits remaining`}
            aria-expanded={open}
          >
            <span className="sd-credits-trigger__icon" aria-hidden>
              <IconSparkles size={15} stroke={2} />
            </span>
            <span className="sd-credits-trigger__value">{creditsRemaining}</span>
            <IconChevronDown
              size={14}
              stroke={2}
              className={cn('sd-credits-trigger__chevron', open && 'sd-credits-trigger__chevron--open')}
            />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="sd-credits-panel w-[17.5rem] p-0" align="end" sideOffset={10}>
          <div className="sd-credits-panel__head">
            <p className="sd-credits-panel__plan">{PLAN_NAME}</p>
            <Link to="/ai-studio" className="sd-credits-panel__upgrade" onClick={() => setOpen(false)}>
              Upgrade
            </Link>
          </div>

          <div className="sd-credits-panel__tabs" role="tablist" aria-label="Usage type">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                className={cn('sd-credits-panel__tab', tab === item.id && 'sd-credits-panel__tab--active')}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="sd-credits-panel__body">
            <p className="sd-credits-panel__metric-label">{metric.label}</p>
            <div className="sd-credits-panel__metric-row">
              <span className="sd-credits-panel__metric-icon" aria-hidden>
                <IconSparkles size={14} stroke={2} />
              </span>
              <p className="sd-credits-panel__metric-value">
                <strong>{formatValue(tab, metric.remaining)}</strong> {metric.unit}
              </p>
            </div>

            <div className="sd-credits-panel__progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <div className="sd-credits-panel__progress-fill" style={{ width: `${pct}%` }} />
            </div>

            <dl className="sd-credits-panel__stats">
              <div className="sd-credits-panel__stat">
                <dt>Total</dt>
                <dd>{formatValue(tab, metric.total)}</dd>
              </div>
              <div className="sd-credits-panel__stat">
                <dt>Remaining</dt>
                <dd>{formatValue(tab, metric.remaining)}</dd>
              </div>
            </dl>
          </div>

          <div className="sd-credits-panel__foot">
            <p className="sd-credits-panel__hint">
              Credits power AI briefs, feedback translation, and health insights.
            </p>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
