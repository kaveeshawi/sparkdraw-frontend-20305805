import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { IconMessageCircle } from '@tabler/icons-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { apiErrorMessage } from '@/lib/apiError'
import { portalApi } from '../../services/api'

const STATUS_VARIANT = {
  pending: 'warning',
  acknowledged: 'default',
  resolved: 'success',
  in_progress: 'default',
}

function formatDate(value) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function FeedbackItem({ item }) {
  return (
    <article className="border-b border-border py-3 last:border-0">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Badge variant="outline">R{item.round_number ?? '—'}</Badge>
          {item.ai_ticket_json?.title ? (
            <span className="truncate text-sm font-medium">{item.ai_ticket_json.title}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {item.created_at ? (
            <span className="text-xs text-muted-foreground">{formatDate(item.created_at)}</span>
          ) : null}
          <Badge variant={STATUS_VARIANT[item.status] || 'outline'} className="capitalize">
            {String(item.status || 'pending').replace(/_/g, ' ')}
          </Badge>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{item.feedback_text}</p>
    </article>
  )
}

export default function FeedbackHub({ slug, projectId }) {
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchFeedback = () => {
    if (!slug || !projectId) {
      setFeedback([])
      setLoading(false)
      setError(false)
      return
    }
    setLoading(true)
    setError(false)
    portalApi
      .listFeedback(slug, projectId)
      .then((res) => setFeedback(res.data.data || []))
      .catch(() => {
        setFeedback([])
        setError(true)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchFeedback() }, [slug, projectId])

  const handleSubmit = async () => {
    if (!text.trim() || !projectId) return
    setSubmitting(true)
    try {
      await portalApi.submitFeedback(slug, projectId, { feedback_text: text.trim() })
      setText('')
      toast.success('Feedback submitted — your team has been notified')
      fetchFeedback()
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not submit feedback'))
    } finally {
      setSubmitting(false)
    }
  }

  if (!projectId) {
    return (
      <div className="sd-page sd-page--team">
        <div className="sd-card p-8 text-center">
          <IconMessageCircle size={22} stroke={1.5} className="mx-auto text-muted-foreground" />
          <p className="mt-2 text-sm font-medium">Select a project first</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Feedback is tied to a specific project workspace.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="sd-page sd-page--team space-y-4">
      <section className="sd-card p-5">
        <h3 className="sd-card-title mb-1">Submit feedback</h3>
        <p className="sd-card-desc mb-3">
          Your project manager reviews feedback before work starts.
        </p>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describe what you’d like to change or improve…"
          rows={4}
        />
        <div className="mt-3 flex justify-end">
          <Button
            type="button"
            disabled={submitting || !text.trim()}
            onClick={handleSubmit}
          >
            {submitting ? 'Submitting…' : 'Submit feedback'}
          </Button>
        </div>
      </section>

      <section className="sd-card p-5">
        <h3 className="sd-card-title mb-3">Previous feedback</h3>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : error ? (
          <p className="text-sm text-muted-foreground">
            Failed to load feedback.{' '}
            <button type="button" className="text-primary underline-offset-2 hover:underline" onClick={fetchFeedback}>
              Retry
            </button>
          </p>
        ) : feedback.length === 0 ? (
          <p className="text-sm text-muted-foreground">No feedback submitted yet.</p>
        ) : (
          feedback.map((item) => <FeedbackItem key={item.id} item={item} />)
        )}
      </section>
    </div>
  )
}
