import { IconHeartbeat, IconRefresh, IconSparkles } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function InsightsHero({
  isAdmin = false,
  recomputing = false,
  atRiskCount = 0,
  onRecompute,
  onOpenAtRisk,
}) {
  return (
    <section className="sd-ai-hero" aria-labelledby="sd-ai-hero-title">
      <div className="sd-ai-hero__glow" aria-hidden />
      <div className="sd-ai-hero__inner">
        <div className="sd-ai-hero__copy">
          <p className="sd-ai-hero__brand">
            <IconSparkles size={16} stroke={1.75} aria-hidden />
            Sparkdraw AI
          </p>
          <h1 id="sd-ai-hero-title" className="sd-ai-hero__title">
            Insights
          </h1>
          <p className="sd-ai-hero__lead">
            Predicts project health, client churn risk, and upsell timing — before profitability takes a hit.
          </p>
          <div className="sd-ai-hero__actions">
            {isAdmin ? (
              <Button
                type="button"
                className="sd-btn-gradient border-0"
                disabled={recomputing}
                onClick={onRecompute}
              >
                <IconRefresh size={16} stroke={1.75} className={cn(recomputing && 'animate-spin')} />
                {recomputing ? 'Recomputing…' : 'Recompute health'}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              className="border-0"
              onClick={onOpenAtRisk}
            >
              <IconHeartbeat size={16} stroke={1.75} />
              {atRiskCount > 0 ? `${atRiskCount} at-risk projects` : 'View health scores'}
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
