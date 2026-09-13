import { cn } from '@/lib/utils'
import { SECTIONS } from './shared'

export default function InsightsSectionNav({ active, onChange }) {
  return (
    <div className="sd-ai-section-nav-wrap" role="tablist" aria-label="AI Insights sections">
      <div className="sd-header-tabs sd-ai-section-nav">
        {SECTIONS.map((section) => {
          const Icon = section.icon
          const isActive = active === section.id
          return (
            <button
              key={section.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={cn('sd-header-tab', isActive && 'sd-header-tab--active')}
              onClick={() => onChange?.(section.id)}
            >
              <Icon size={14} stroke={1.75} aria-hidden />
              {section.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
