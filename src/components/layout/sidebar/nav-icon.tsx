import type { Icon } from '@tabler/icons-react'
import { cn } from '@/lib/utils'

const NAV_ICON_SIZE = 20
const NAV_ICON_STROKE = 1.75

export function NavIcon({
  icon: IconComponent,
  className,
  size = NAV_ICON_SIZE,
  stroke = NAV_ICON_STROKE,
}: {
  icon: Icon
  className?: string
  size?: number
  stroke?: number
}) {
  return (
    <IconComponent
      size={size}
      stroke={stroke}
      className={cn('shrink-0', className)}
    />
  )
}
