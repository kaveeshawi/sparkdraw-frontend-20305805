import { useState } from 'react'
import { IconCheck, IconX } from '@tabler/icons-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { apiErrorMessage } from '@/lib/apiError'
import { portalApi } from '../../services/api'

function formatDate(value) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ApprovalCard({ approval, slug, projectId, onUpdated }) {
  const [showReject, setShowReject] = useState(false)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(null)

  const isSettled = done || ['approved', 'rejected'].includes(approval.status)
  const finalStatus = done || approval.status

  const handleApprove = async () => {
    setLoading(true)
    try {
      await portalApi.approve(slug, projectId, approval.id)
      setDone('approved')
      toast.success('Deliverable approved')
      onUpdated?.()
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not approve'))
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!reason.trim()) return
    setLoading(true)
    try {
      await portalApi.reject(slug, projectId, approval.id, reason.trim())
      setDone('rejected')
      setShowReject(false)
      toast.success('Change request sent')
      onUpdated?.()
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not send feedback'))
    } finally {
      setLoading(false)
    }
  }

  const title =
    approval.deliverable_name
    || approval.deliverable?.original_name
    || approval.title
    || 'Deliverable'

  return (
    <article className="sd-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{title}</h3>
          {approval.requested_at ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Requested {formatDate(approval.requested_at)}
            </p>
          ) : null}
        </div>
        <Badge
          variant={
            finalStatus === 'approved'
              ? 'success'
              : finalStatus === 'rejected'
                ? 'destructive'
                : 'warning'
          }
          className="capitalize"
        >
          {finalStatus || 'pending'}
        </Badge>
      </div>

      {approval.description ? (
        <p className="mt-2 text-sm text-muted-foreground">{approval.description}</p>
      ) : null}

      {finalStatus === 'approved' ? (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          <IconCheck size={14} />
          Approved — thank you!
        </div>
      ) : null}

      {finalStatus === 'rejected' ? (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600 dark:bg-red-950/40 dark:text-red-300">
          <IconX size={14} />
          Changes requested — your team has been notified.
        </div>
      ) : null}

      {!isSettled ? (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="flex-1" disabled={loading} onClick={handleApprove}>
              <IconCheck size={14} />
              {loading ? 'Processing…' : 'Approve'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={loading}
              onClick={() => setShowReject((v) => !v)}
            >
              <IconX size={14} />
              Request changes
            </Button>
          </div>

          {showReject ? (
            <div className="space-y-2">
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe what changes are needed…"
                rows={3}
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="destructive"
                  disabled={loading || !reason.trim()}
                  onClick={handleReject}
                >
                  {loading ? 'Sending…' : 'Send feedback'}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}
