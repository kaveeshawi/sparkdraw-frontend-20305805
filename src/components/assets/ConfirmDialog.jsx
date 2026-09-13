import { IconAlertTriangle } from '@tabler/icons-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

/**
 * Modal confirmation — always a dialog, never an inline empty-state card.
 */
export default function ConfirmDialog({
  open,
  onOpenChange,
  title = 'Are you sure?',
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  destructive = true,
  busy = false,
  closeOnConfirm = true,
  onConfirm,
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => {
      if (busy) return
      onOpenChange?.(next)
    }}
    >
      <DialogContent className="sd-confirm-dialog border-0 sm:max-w-md">
        <DialogHeader className="sd-confirm-dialog__header">
          <div
            className={`sd-confirm-dialog__icon${destructive ? ' is-danger' : ''}`}
            aria-hidden
          >
            <IconAlertTriangle size={22} stroke={1.75} />
          </div>
          <div className="sd-confirm-dialog__copy">
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </div>
        </DialogHeader>
        <DialogFooter className="sd-confirm-dialog__actions gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={busy}
            onClick={() => onOpenChange?.(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            disabled={busy}
            className={destructive ? 'rounded-full bg-destructive text-white hover:bg-destructive/90' : 'sd-btn-gradient rounded-full'}
            onClick={() => {
              onConfirm?.()
              if (closeOnConfirm) onOpenChange?.(false)
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
