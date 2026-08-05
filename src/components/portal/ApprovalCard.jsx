import { useState } from 'react'
import { IconCheck, IconX } from '@tabler/icons-react'
import Badge from '../legacy-ui/Badge'
import { portalApi } from '../../services/api'

export default function ApprovalCard({ approval, slug, projectId, onUpdated }) {
  const [showReject, setShowReject] = useState(false)
  const [reason, setReason]         = useState('')
  const [loading, setLoading]       = useState(false)
  const [done, setDone]             = useState(null) // 'approved' | 'rejected'

  const isSettled = done || ['approved', 'rejected'].includes(approval.status)
  const finalStatus = done || approval.status

  const handleApprove = async () => {
    setLoading(true)
    try {
      await portalApi.approve(slug, projectId, approval.id)
      setDone('approved')
      onUpdated?.()
    } catch {
      // silently ignore — demo mode
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!reason.trim()) return
    setLoading(true)
    try {
      await portalApi.reject(slug, projectId, approval.id, reason)
      setDone('rejected')
      setShowReject(false)
      onUpdated?.()
    } catch {
      // silently ignore — demo mode
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="sd-glass sd-card--interactive flex flex-col gap-3 p-4 px-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[13px] font-medium text-foreground">
            {approval.deliverable_name || approval.deliverable?.original_name || approval.title || 'Deliverable'}
          </div>
          {approval.requested_at && (
            <div className="mt-0.5 text-[10px] text-muted-foreground">
              Requested {approval.requested_at}
            </div>
          )}
        </div>
        <Badge
          variant={
            finalStatus === 'approved'
              ? 'success'
              : finalStatus === 'rejected'
                ? 'danger'
                : 'warning'
          }
        >
          {finalStatus || 'pending'}
        </Badge>
      </div>

      {/* Description */}
      {approval.description && (
        <p className="m-0 text-xs leading-relaxed text-foreground/80">
          {approval.description}
        </p>
      )}

      {/* Success state */}
      {finalStatus === 'approved' && (
        <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-600">
          <IconCheck size={14} />
          Approved — thank you!
        </div>
      )}

      {finalStatus === 'rejected' && (
        <div className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          <IconX size={14} />
          Rejected — your team has been notified.
        </div>
      )}

      {/* Action buttons */}
      {!isSettled && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              onClick={handleApprove}
              disabled={loading}
              className="portal-submit-btn flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-white"
            >
              <IconCheck size={14} />
              {loading ? 'Processing…' : 'Approve'}
            </button>
            <button
              onClick={() => setShowReject((v) => !v)}
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              <IconX size={14} />
              Request changes
            </button>
          </div>

          {/* Inline rejection reason textarea */}
          {showReject && (
            <div className="flex flex-col gap-2">
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe what changes are needed…"
                rows={3}
                className="portal-textarea w-full rounded-xl border px-2.75 py-2.5 text-xs leading-relaxed outline-none transition-all"
              />
              <button
                onClick={handleReject}
                disabled={loading || !reason.trim()}
                className="self-end rounded-lg bg-red-500 px-4 py-1.75 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Sending…' : 'Send feedback'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
