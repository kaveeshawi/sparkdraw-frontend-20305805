export default function ProgressBar({ value = 0, height = 4, color, showLabel = false, style: extra = {} }) {
  const pct = Math.min(100, Math.max(0, value))
  const barColor = color || 'var(--sd-grad)'

  return (
    <div className="flex flex-col gap-1" style={extra}>
      {showLabel && (
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Progress</span>
          <span>{pct}%</span>
        </div>
      )}
      <div className="overflow-hidden rounded-full bg-muted" style={{ height: `${height}px` }}>
        <div
          className="h-full rounded-full transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
    </div>
  )
}
