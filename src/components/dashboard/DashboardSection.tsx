import { cn } from '@/lib/utils'

export default function DashboardSection({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
  flushBody = false,
}) {
  return (
    <div className={cn('sd-card sd-dash-card h-full flex flex-col', className)}>
      <div className="sd-card-header shrink-0">
        <div>
          <h2 className="sd-card-title">{title}</h2>
          {description && <p className="sd-card-desc">{description}</p>}
        </div>
        {action}
      </div>
      <div className={cn('sd-card-body flex-1 min-h-0', flushBody && 'sd-card-body--flush', bodyClassName)}>
        {children}
      </div>
    </div>
  )
}
