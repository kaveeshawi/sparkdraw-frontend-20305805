export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="sd-page-header flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
