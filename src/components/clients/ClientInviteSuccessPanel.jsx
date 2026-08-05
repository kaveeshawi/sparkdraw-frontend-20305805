import { useEffect, useState } from 'react'
import { IconCheck, IconCopy, IconRefresh } from '@tabler/icons-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { clientsApi } from '@/services/api'

export default function ClientInviteSuccessPanel({ client, open, onOpenChange, onDone }) {
  const [inviteUrl, setInviteUrl] = useState(client?.invite_url || '')
  const [resending, setResending] = useState(false)

  useEffect(() => {
    setInviteUrl(client?.invite_url || '')
  }, [client])

  const clientId = client?.id
  const email = client?.contact_email || client?.email || ''

  const handleCopy = async () => {
    if (!inviteUrl) return
    try {
      await navigator.clipboard.writeText(inviteUrl)
      toast.success('Invite link copied')
    } catch {
      toast.error('Could not copy link')
    }
  }

  const handleResend = async () => {
    if (!clientId) return
    setResending(true)
    try {
      const res = await clientsApi.resendInvite(clientId)
      const nextUrl = res.data?.data?.invite_url
      if (nextUrl) setInviteUrl(nextUrl)
      toast.success(res.data?.message || 'Invite resent')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend invite')
    } finally {
      setResending(false)
    }
  }

  const handleClose = (nextOpen) => {
    if (!nextOpen) onDone?.()
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:mx-0">
            <IconCheck size={22} stroke={1.75} />
          </div>
          <DialogTitle>Invite sent to {email || 'client contact'}</DialogTitle>
          <DialogDescription>
            Share the set-password link below if they need another way to join the portal.
          </DialogDescription>
        </DialogHeader>

        <div className="sd-team-invite-success">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Invite link
          </p>
          <div className="sd-team-invite-success__link-box">
            <code className="truncate text-xs">{inviteUrl || '—'}</code>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-start">
          <Button variant="outline" onClick={handleCopy} disabled={!inviteUrl}>
            <IconCopy size={15} />
            Copy invite link
          </Button>
          <Button variant="outline" onClick={handleResend} disabled={resending || !clientId}>
            <IconRefresh size={15} className={resending ? 'animate-spin' : ''} />
            {resending ? 'Resending…' : 'Resend invite'}
          </Button>
          <Button onClick={() => handleClose(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
