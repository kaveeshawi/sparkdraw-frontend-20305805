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
import { teamApi } from '@/services/api'

export default function InviteSuccessPanel({ invite, open, onOpenChange, onDone }) {
  const [password, setPassword] = useState(invite?.temporary_password || '')
  const [resending, setResending] = useState(false)

  useEffect(() => {
    setPassword(invite?.temporary_password || '')
  }, [invite])

  const email = invite?.email || ''
  const memberId = invite?.id

  const handleCopy = async () => {
    if (!email || !password) return
    try {
      await navigator.clipboard.writeText(`Email: ${email}\nPassword: ${password}`)
      toast.success('Credentials copied')
    } catch {
      toast.error('Could not copy credentials')
    }
  }

  const handleResend = async () => {
    if (!memberId) return
    setResending(true)
    try {
      const res = await teamApi.resendInvite(memberId)
      const nextPassword = res.data?.data?.temporary_password
      if (nextPassword) setPassword(nextPassword)
      toast.success(res.data?.message || 'Credentials regenerated')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to regenerate credentials')
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
          <DialogTitle>Login ready for {email}</DialogTitle>
          <DialogDescription>
            Share these credentials. After login they open Tasks — assign work and they can chat with the team.
          </DialogDescription>
        </DialogHeader>

        <div className="sd-team-invite-success gap-2">
          <div className="sd-team-success__cred">
            <span>Email</span>
            <code>{email || '—'}</code>
          </div>
          <div className="sd-team-success__cred">
            <span>Password</span>
            <code>{password || '—'}</code>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-start">
          <Button variant="outline" onClick={handleCopy} disabled={!email || !password}>
            <IconCopy size={15} />
            Copy credentials
          </Button>
          <Button variant="outline" onClick={handleResend} disabled={resending || !memberId}>
            <IconRefresh size={15} className={resending ? 'animate-spin' : ''} />
            {resending ? 'Generating…' : 'New password'}
          </Button>
          <Button onClick={() => handleClose(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
