const VARIANTS = {
  success:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  warning:  'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  danger:   'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  info:     'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  violet:   'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  active:   'bg-[var(--sd-grad-soft)] text-primary border border-primary/20',
  muted:    'bg-muted text-muted-foreground',
  'priority-high': 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  'priority-med':  'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  'priority-low':  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  'tag-ui':       'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  'tag-dev':      'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  'tag-design':   'bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300',
  'tag-research': 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  'tag-test':     'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
}

export default function Badge({ children, variant = 'violet', style: extra = {} }) {
  const v = VARIANTS[variant] || VARIANTS.violet

  return (
    <span
      style={extra}
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-px text-[10px] font-medium ${v}`}
    >
      {children}
    </span>
  )
}
