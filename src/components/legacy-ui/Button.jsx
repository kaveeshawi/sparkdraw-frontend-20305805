export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  onClick,
  type = 'button',
  style: extraStyle = {},
  className: extraClass = '',
}) {
  const sizes = {
    sm: 'text-[10px] px-2.5 py-1.5',
    md: 'text-[11px] px-3.5 py-2',
    lg: 'text-xs px-4.5 py-2.5',
  }

  const variants = {
    primary: 'sd-btn-gradient rounded-xl',
    ghost: 'rounded-xl border border-border bg-transparent text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground',
    cancel: 'rounded-xl border border-border bg-card-solid text-muted-foreground transition-all hover:border-primary/40 hover:text-primary',
    danger: 'rounded-xl bg-red-100 text-red-600 transition-colors hover:bg-red-200 dark:bg-red-500/15 dark:text-red-300 dark:hover:bg-red-500/25',
    soft: 'rounded-xl bg-[var(--sd-grad-soft)] border border-primary/20 text-primary transition-all hover:shadow-[var(--sd-glow-sm)]',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      style={extraStyle}
      className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-medium ${sizes[size]} ${variants[variant] || variants.primary} ${
        disabled || loading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
      } ${extraClass}`}
    >
      {loading ? <span className="text-[10px]">...</span> : icon}
      {children}
    </button>
  )
}
