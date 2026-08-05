const FLAG_STYLES = {
  green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  red:   'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  none:  'bg-[var(--sd-grad-soft)] text-primary',
}

export default function HealthScoreBox({ score, flag = 'none', size = 36 }) {
  const display = score !== null && score !== undefined ? score : '—'

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-xl font-medium ${FLAG_STYLES[flag] || FLAG_STYLES.none}`}
      style={{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.floor(size * 0.33)}px` }}
    >
      {display}
    </div>
  )
}
