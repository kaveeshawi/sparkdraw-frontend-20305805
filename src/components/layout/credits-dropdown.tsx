import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconChevronDown, IconSparkles } from '@tabler/icons-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import useAuthStore from '@/store/authStore'
import { aiApi } from '@/services/api'
import { cn } from '@/lib/utils'

const ROLE_LABELS = {
  admin: 'Admin',
  pm: 'Project Manager',
  member: 'Team Member',
}

function formatPeriod(period) {
  if (!period?.start || !period?.end) return null
  const opts = { month: 'short', day: 'numeric' }
  const start = new Date(`${period.start}T00:00:00`)
  const end = new Date(`${period.end}T00:00:00`)
  return `${start.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, opts)}`
}

export function CreditsDropdown() {
  const { user } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(null)

  const load = () => {
    setLoading(true)
    aiApi
      .credits()
      .then((res) => setSummary(res.data.data ?? null))
      .catch(() => setSummary(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!user || user.role === 'client') return
    load()
  }, [user?.id, user?.role])

  useEffect(() => {
    if (open && user && user.role !== 'client') load()
  }, [open])

  if (!user || user.role === 'client') return null

  const remaining = summary?.remaining ?? 0
  const allowance = summary?.allowance ?? 0
  const used = summary?.used ?? 0
  const pct = allowance > 0 ? Math.min(100, Math.round((remaining / allowance) * 100)) : 0
  const periodLabel = formatPeriod(summary?.period)
  const features = Array.isArray(summary?.features) ? summary.features : []
  const roleAllowances = summary?.allowances_by_role || {}

  return (
    <div className="sd-float-topbar__credits">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="sd-credits-trigger"
            aria-label={`${remaining} AI credits remaining`}
            aria-expanded={open}
          >
            <span className="sd-credits-trigger__icon" aria-hidden>
              <IconSparkles size={15} stroke={2} />
            </span>
            <span className="sd-credits-trigger__value">{loading ? '…' : remaining}</span>
            <IconChevronDown
              size={14}
              stroke={2}
              className={cn('sd-credits-trigger__chevron', open && 'sd-credits-trigger__chevron--open')}
            />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="sd-credits-panel w-[19rem] p-0" align="end" sideOffset={10}>
          <div className="sd-credits-panel__head">
            <p className="sd-credits-panel__plan">{summary?.plan_name || 'Agency Starter'}</p>
            <Link to="/ai-studio" className="sd-credits-panel__upgrade" onClick={() => setOpen(false)}>
              Upgrade
            </Link>
          </div>

          <div className="sd-credits-panel__body">
            <p className="sd-credits-panel__metric-label">
              Remaining credits
              {periodLabel ? <span className="sd-credits-panel__period"> · {periodLabel}</span> : null}
            </p>
            <div className="sd-credits-panel__metric-row">
              <span className="sd-credits-panel__metric-icon" aria-hidden>
                <IconSparkles size={14} stroke={2} />
              </span>
              <p className="sd-credits-panel__metric-value">
                <strong>{remaining}</strong> Credits
              </p>
            </div>

            <div className="sd-credits-panel__progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <div className="sd-credits-panel__progress-fill" style={{ width: `${pct}%` }} />
            </div>

            <dl className="sd-credits-panel__stats">
              <div className="sd-credits-panel__stat">
                <dt>Monthly total</dt>
                <dd>{allowance}</dd>
              </div>
              <div className="sd-credits-panel__stat">
                <dt>Used</dt>
                <dd>{used}</dd>
              </div>
              <div className="sd-credits-panel__stat">
                <dt>Role</dt>
                <dd>{ROLE_LABELS[summary?.role] || summary?.role || '—'}</dd>
              </div>
            </dl>

            {Object.keys(roleAllowances).length > 0 ? (
              <div className="sd-credits-panel__roles">
                <p className="sd-credits-panel__roles-title">Monthly by role</p>
                <ul>
                  <li><span>Admin</span><strong>{roleAllowances.admin ?? '—'}</strong></li>
                  <li><span>Team (PM / Member)</span><strong>{roleAllowances.member ?? roleAllowances.pm ?? '—'}</strong></li>
                </ul>
              </div>
            ) : null}

            {features.length > 0 ? (
              <div className="sd-credits-panel__features">
                <p className="sd-credits-panel__features-title">Feature costs</p>
                <ul>
                  {features.map((f) => (
                    <li key={f.feature}>
                      <span>{f.label}</span>
                      <strong>{f.cost} cr</strong>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="sd-credits-panel__foot">
            <p className="sd-credits-panel__hint">
              Credits reset each month. AI actions deduct from your personal allowance after a successful run.
            </p>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
