import { IconCheck, IconChevronDown } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/**
 * Pill-styled select that matches Sparkdraw form fields (not native OS menus).
 */
export default function TeamSelect({
  id,
  value,
  onValueChange,
  options = [],
  placeholder = 'Select',
  className,
  contentClassName,
  disabled = false,
  'aria-label': ariaLabel,
}) {
  const selected = options.find((opt) => opt.value === value)

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          type="button"
          id={id}
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn('sd-team-field sd-team-select-trigger', className)}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <span className={cn('sd-team-select-trigger__label', !selected && 'is-placeholder')}>
            {selected?.label ?? placeholder}
          </span>
          <IconChevronDown size={16} className="sd-team-select-trigger__chevron" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className={cn('sd-team-select-content border-0', contentClassName)}
        style={{ width: 'var(--radix-dropdown-menu-trigger-width)' }}
      >
        {options.map((opt) => {
          const active = opt.value === value
          return (
            <DropdownMenuItem
              key={opt.value}
              className={cn('sd-team-select-item', active && 'is-active')}
              onSelect={() => onValueChange?.(opt.value)}
            >
              <span className="flex-1 truncate">{opt.label}</span>
              {active && <IconCheck size={14} className="shrink-0 text-primary" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
