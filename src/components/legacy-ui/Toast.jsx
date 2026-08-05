import { useEffect } from 'react'
import { IconCheck, IconX } from '@tabler/icons-react'

const VARIANTS = {
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  error:   'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
}

export default function Toast({ message, type = 'success', onClose, duration = 3000 }) {
  useEffect(() => {
    const t = setTimeout(() => onClose?.(), duration)
    return () => clearTimeout(t)
  }, [onClose, duration])

  if (!message) return null

  const { Icon } = VARIANTS[type] ? { Icon: type === 'error' ? IconX : IconCheck } : { Icon: IconCheck }

  return (
    <div
      role="status"
      className={`sd-glass fixed bottom-5 right-5 z-[100] flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-medium ${
        VARIANTS[type] || VARIANTS.success
      }`}
      style={{ animation: 'sd-fade-up 0.3s cubic-bezier(0.22, 1, 0.36, 1) both' }}
    >
      <Icon size={14} />
      {message}
    </div>
  )
}
