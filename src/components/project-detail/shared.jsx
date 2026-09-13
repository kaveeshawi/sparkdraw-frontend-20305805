import { IconCircleCheck, IconAlertTriangle, IconAlertCircle } from '@tabler/icons-react'
import { Badge } from '@/components/ui/badge'

export const FLAG_META = {
  green: { icon: IconCircleCheck, dot: 'bg-emerald-500', className: 'bg-green-50 text-green-700 dark:bg-green-900/70 dark:text-white/80' },
  amber: { icon: IconAlertTriangle, dot: 'bg-amber-500', className: 'bg-orange-50 text-orange-700 dark:bg-orange-900/70 dark:text-white/80' },
  red: { icon: IconAlertCircle, dot: 'bg-red-500', className: 'bg-red-50 text-red-700 dark:bg-red-900/70 dark:text-white/80' },
}

export const STATUS_BADGE_VARIANT = {
  active: 'success',
  on_hold: 'warning',
  completed: 'secondary',
  cancelled: 'destructive',
  planning: 'info',
}

export function initials(name = '') {
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

export function formatDate(value, opts = { day: 'numeric', month: 'short' }) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-GB', opts)
}

export function StatusBadge({ status }) {
  if (!status) return null
  const variant = STATUS_BADGE_VARIANT[status] || 'outline'
  const label = status.replace(/_/g, ' ')
  return <Badge variant={variant} className="capitalize">{label}</Badge>
}

export function sentimentTextClass(label) {
  if (label === 'positive') return 'text-emerald-600'
  if (label === 'negative') return 'text-red-500'
  return 'text-amber-600'
}
