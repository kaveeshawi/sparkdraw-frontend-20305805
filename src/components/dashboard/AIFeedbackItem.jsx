import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { revisionsApi } from '../../services/api'

const STATUS_BADGE = {
  pending: 'warning',
  acknowledged: 'info',
  resolved: 'success',
}

export default function AIFeedbackItem({ item, onAccepted }) {
  const ticket = item.ai_ticket_json || {}
  const [accepting, setAccepting] = useState(false)

  const canAccept = Boolean(item.project_id) && Boolean(ticket.title) && item.status === 'pending'

  const handleAccept = async () => {
    setAccepting(true)
    try {
      await revisionsApi.acceptTicket(item.project_id, item.id)
      toast.success('Tasks created successfully')
      onAccepted?.()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept ticket')
    } finally {
      setAccepting(false)
    }
  }

  const quote =
    item.feedback_text?.length > 72
      ? `${item.feedback_text.slice(0, 72)}…`
      : item.feedback_text

  return (
    <div className="sd-feedback">
      <div className="flex min-w-0 flex-1 gap-3">
        <div className="sd-feedback-icon">
          <Sparkles className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{ticket.title || 'AI ticket'}</p>
            {ticket.category && (
              <Badge variant="outline" className="border-primary/20 bg-primary/5 text-[10px] text-primary">
                {ticket.category}
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/80">{item.client?.company_name || '—'}</span>
            {quote ? ` · "${quote}"` : ''}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        <Badge variant={STATUS_BADGE[item.status] || 'outline'} className="capitalize">
          {item.status || 'pending'}
        </Badge>
        {canAccept && (
          <Button size="sm" variant="outline" onClick={handleAccept} disabled={accepting} className="h-7 px-2.5 text-xs">
            {accepting ? '…' : 'Accept'}
          </Button>
        )}
      </div>
    </div>
  )
}
