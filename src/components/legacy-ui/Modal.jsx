import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { IconX } from '@tabler/icons-react'

export default function Modal({ open, onClose, title, subtitle, icon: Icon, children, footer, wide = false, extraWide = false }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  if (!open) return null

  const maxWidth = extraWide ? '1100px' : wide ? '920px' : '560px'

  return createPortal(
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}
      className="sd-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-[#11112a]/45 p-5 backdrop-blur-sm"
    >
      <div
        className="sd-modal-panel sd-glass sd-card--grad-border relative w-full overflow-hidden"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[2px]"
          style={{ background: 'var(--sd-grad)' }}
        />

        <div className="flex items-center justify-between border-b border-border px-4.5 pb-3.5 pt-4">
          <div className="flex items-center gap-2.5">
            {Icon && (
              <div className="sd-icon-chip size-8">
                <Icon size={16} />
              </div>
            )}
            <div>
              {title && (
                <div className="text-[13px] font-medium text-foreground">{title}</div>
              )}
              {subtitle && (
                <div className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex size-7 cursor-pointer items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
            aria-label="Close"
          >
            <IconX size={14} />
          </button>
        </div>

        <div className="flex flex-col gap-3 px-4.5 py-4">{children}</div>

        {footer && (
          <div className="flex items-center justify-between border-t border-border bg-[var(--sd-grad-soft)] px-4.5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
