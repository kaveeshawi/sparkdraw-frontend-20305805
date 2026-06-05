import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { IconMoon, IconSun } from '@tabler/icons-react'
import { cn } from '@/lib/utils'

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark =
    theme === 'dark' || (theme === 'system' && resolvedTheme === 'dark')

  if (!mounted) {
    return <div className="sd-theme-toggle sd-theme-toggle--placeholder" aria-hidden />
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn('sd-theme-toggle', isDark && 'sd-theme-toggle--dark')}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      <IconSun size={14} stroke={1.75} className="sd-theme-toggle__icon sd-theme-toggle__icon--sun" />
      <span className="sd-theme-toggle__track" aria-hidden>
        <span className="sd-theme-toggle__thumb" />
      </span>
      <IconMoon size={14} stroke={1.75} className="sd-theme-toggle__icon sd-theme-toggle__icon--moon" />
    </button>
  )
}
