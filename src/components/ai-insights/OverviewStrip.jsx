import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

function KpiCard({ label, value, hint, tone = 'default', onClick, loading }) {
  return (
    <button
      type="button"
      className={cn('sd-ai-kpi', `sd-ai-kpi--${tone}`)}
      onClick={onClick}
      disabled={!onClick}
    >
      {loading ? (
        <Skeleton className="h-10 w-16 bg-white/25" />
      ) : (
        <>
          <p className="sd-ai-kpi__value">{value}</p>
          <p className="sd-ai-kpi__label">{label}</p>
          {hint ? <p className="sd-ai-kpi__hint">{hint}</p> : null}
        </>
      )}
    </button>
  )
}

export default function OverviewStrip({
  loading,
  agencyAvg,
  pendingUpsells = 0,
  atRiskClients = 0,
  alertCount = 0,
  onNavigate,
}) {
  const avg = agencyAvg?.average_score ?? '—'
  const green = agencyAvg?.green_count ?? 0
  const amber = agencyAvg?.amber_count ?? 0
  const red = agencyAvg?.red_count ?? 0

  return (
    <div className="sd-ai-overview">
      <div className="sd-ai-kpi-grid">
        <KpiCard
          loading={loading}
          tone="primary"
          label="Agency health"
          value={avg === '—' ? '—' : `${avg}`}
          hint="/100 average"
          onClick={() => onNavigate?.('health')}
        />
        <KpiCard
          loading={loading}
          tone="flags"
          label="Project flags"
          value={`${green} · ${amber} · ${red}`}
          hint="Green · Amber · Red"
          onClick={() => onNavigate?.('health')}
        />
        <KpiCard
          loading={loading}
          tone="upsell"
          label="Pending upsells"
          value={pendingUpsells}
          hint="Ready for review"
          onClick={() => onNavigate?.('upsell')}
        />
        <KpiCard
          loading={loading}
          tone="risk"
          label="At-risk clients"
          value={atRiskClients}
          hint="Sentiment warning"
          onClick={() => onNavigate?.('sentiment')}
        />
        <KpiCard
          loading={loading}
          tone="alert"
          label="AI alerts"
          value={alertCount}
          hint="Recent signals"
          onClick={() => onNavigate?.('alerts')}
        />
      </div>

      <div className="sd-ai-attention">
        <h2 className="sd-ai-panel__title">Needs attention</h2>
        <p className="sd-ai-panel__desc">
          Jump into the AI feature that needs a decision right now.
        </p>
        <div className="sd-ai-attention__chips">
          <button type="button" className="sd-ai-chip" onClick={() => onNavigate?.('health')}>
            Health scores
          </button>
          <button type="button" className="sd-ai-chip" onClick={() => onNavigate?.('sentiment')}>
            Client sentiment
          </button>
          <button type="button" className="sd-ai-chip" onClick={() => onNavigate?.('upsell')}>
            Upsell review
          </button>
          <button type="button" className="sd-ai-chip" onClick={() => onNavigate?.('translator')}>
            Feedback translator
          </button>
          <button type="button" className="sd-ai-chip" onClick={() => onNavigate?.('alerts')}>
            Alert feed
          </button>
        </div>
      </div>
    </div>
  )
}
