import { useEffect, useState } from 'react'
import { IconMessage2, IconSparkles } from '@tabler/icons-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { revisionsApi, messagesApi } from '../../services/api'
import { formatDate, sentimentTextClass } from './shared'

export default function FeedbackTab({ projectId }) {
  const [loading, setLoading] = useState(true)
  const [revisions, setRevisions] = useState([])
  const [messages, setMessages] = useState([])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.allSettled([
      revisionsApi.index(projectId),
      messagesApi.index(projectId),
    ]).then(([revRes, msgRes]) => {
      if (cancelled) return
      if (revRes.status === 'fulfilled') setRevisions(revRes.value.data.data || [])
      if (msgRes.status === 'fulfilled') setMessages(msgRes.value.data.data || [])
    }).finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [projectId])

  if (loading) {
    return <div className="flex flex-col gap-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>
  }

  return (
    <div className="grid grid-cols-1 gap-3 overflow-y-auto pb-4 lg:grid-cols-2">
      <div className="sd-card">
        <div className="sd-card-header">
          <p className="sd-card-title">Revision history</p>
        </div>
        <div className="sd-card-body--flush sd-card-body flex flex-col gap-3">
          {revisions.length === 0 ? (
            <p className="text-[11.5px] text-muted-foreground">No revisions submitted yet.</p>
          ) : (
            revisions.map((r) => (
              <div key={r.id} className="border-t border-border pt-3 first:border-t-0 first:pt-0">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-medium">Round {r.round_number}</span>
                  <Badge variant={r.status === 'accepted' ? 'success' : r.status === 'rejected' ? 'destructive' : 'outline'} className="text-[9px] capitalize">{r.status}</Badge>
                  {r.has_ai_ticket && (
                    <span className="flex items-center gap-0.5 text-[9.5px] text-primary"><IconSparkles size={10} /> AI ticket</span>
                  )}
                </div>
                <p className="mt-1 text-[11.5px] text-muted-foreground">{r.feedback_text}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">{formatDate(r.created_at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="sd-card">
        <div className="sd-card-header">
          <p className="sd-card-title flex items-center gap-1.5"><IconMessage2 size={14} /> Messages &amp; sentiment</p>
        </div>
        <div className="sd-card-body--flush sd-card-body flex flex-col gap-2.5">
          {messages.length === 0 ? (
            <p className="text-[11.5px] text-muted-foreground">No messages yet.</p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="border-t border-border pt-2.5 first:border-t-0 first:pt-0 text-[11.5px]">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{m.sender_name}</span>
                  <span className={`font-medium ${sentimentTextClass(m.sentiment_label)}`}>
                    {m.sentiment_score != null ? `${m.sentiment_score >= 0 ? '+' : ''}${Number(m.sentiment_score).toFixed(2)}` : 'Pending'}
                  </span>
                </div>
                <p className="mt-0.5 text-muted-foreground">{m.body}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{formatDate(m.created_at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
