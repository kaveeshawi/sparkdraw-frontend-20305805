import { Link } from 'react-router-dom'
import { IconSparkles } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'

export function NavUpgrade() {
  return (
    <div className="sd-upgrade-card sd-upgrade-card--float">
      <div className="sd-upgrade-card__icon">
        <IconSparkles size={14} stroke={1.75} />
      </div>
      <p className="sd-upgrade-card__title">AI Insights</p>
      <p className="sd-upgrade-card__desc">
        Predict scope creep and spot upsell opportunities early.
      </p>
      <Button
        size="sm"
        asChild
        className="sd-upgrade-card__btn w-full bg-white text-primary hover:bg-white/90"
      >
        <Link to="/ai-studio">Try AI Studio</Link>
      </Button>
    </div>
  )
}
