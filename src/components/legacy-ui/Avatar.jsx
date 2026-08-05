const SIZES = {
  xs: 'size-[18px] text-[8px]',
  sm: 'size-[22px] text-[9px]',
  md: 'size-[26px] text-[10px]',
  lg: 'size-[30px] text-[11px]',
  xl: 'size-9 text-[13px]',
}

const ROLE_COLORS = {
  admin:  'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
  pm:     'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  member: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  client: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  default:'bg-[var(--sd-grad-soft)] text-primary',
}

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function Avatar({ name, role, size = 'md', src, style: extra = {}, className: extraClass = '' }) {
  const sizeClass = SIZES[size] || SIZES.md
  const colorClass = ROLE_COLORS[role] || ROLE_COLORS.default

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        style={extra}
        className={`${sizeClass} shrink-0 rounded-full object-cover ${extraClass}`}
      />
    )
  }

  return (
    <div
      style={extra}
      className={`${sizeClass} ${colorClass} flex shrink-0 items-center justify-center rounded-full font-medium ${extraClass}`}
      title={name}
    >
      {getInitials(name)}
    </div>
  )
}
