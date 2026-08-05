import { useEffect, useState } from 'react'
import Badge from '../legacy-ui/Badge'
import { portalApi } from '../../services/api'

// TODO Session 5.x — replace with real API
const MOCK_FEEDBACK = [
  {
    id: 1,
    round_number: 2,
    feedback_text: 'The hero section feels too cluttered. Can we simplify and give more breathing room?',
    status:        'acknowledged',
    created_at:    '2026-06-10',
    ai_ticket_json: { title: 'Hero Section Simplification' },
  },
  {
    id: 2,
    round_number: 1,
    feedback_text: 'Love the color palette! The typography could feel a bit more premium though.',
    status:        'resolved',
    created_at:    '2026-05-28',
    ai_ticket_json: { title: 'Typography Premium Upgrade' },
  },
]

const STATUS_VARIANTS = {
  pending:      'warning',
  acknowledged: 'info',
  resolved:     'success',
  in_progress:  'active',
}

function FeedbackItem({ item }) {
  return (
    <div className="border-b border-border py-3.5 last:border-0">
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="rounded-full px-1.75 py-0.5 text-[10px] font-medium"
            style={{
              color: 'var(--portal-primary)',
              background: 'color-mix(in srgb, var(--portal-primary, #802aee) 10%, transparent)',
            }}
          >
            R{item.round_number}
          </span>
          {item.ai_ticket_json?.title && (
            <span className="text-[11px] font-medium text-foreground">
              {item.ai_ticket_json.title}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {item.created_at && (
            <span className="text-[10px] text-muted-foreground">{item.created_at}</span>
          )}
          <Badge variant={STATUS_VARIANTS[item.status] || 'muted'}>
            {item.status?.replace('_', ' ')}
          </Badge>
        </div>
      </div>
      <p className="m-0 text-xs leading-relaxed text-foreground/80">
        {item.feedback_text}
      </p>
    </div>
  )
}

export default function FeedbackHub({ slug, projectId }) {
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(false)

  const [text, setText]         = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)

  const fetchFeedback = () => {
    if (!slug || !projectId) {
      setFeedback(MOCK_FEEDBACK)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(false)
    portalApi
      .listFeedback(slug, projectId)
      .then((res) => setFeedback(res.data.data || []))
      .catch((err) => {
        if (err.response?.status === 404) setFeedback(MOCK_FEEDBACK)
        else setError(true)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchFeedback() }, [slug, projectId])

  const handleSubmit = async () => {
    if (!text.trim()) return
    setSubmitting(true)
    try {
      await portalApi.submitFeedback(slug, projectId, { feedback_text: text })
      setText('')
      setSubmitted(true)
      fetchFeedback()
      setTimeout(() => setSubmitted(false), 3000)
    } catch {
      // silently ignore — demo mode
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 sd-animate-in">
      {/* Page heading */}
      <div>
        <div className="text-lg font-medium text-foreground">Feedback hub</div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          Share feedback with your team — we'll convert it into action items.
        </div>
      </div>

      {/* Feedback form */}
      <div className="sd-glass flex flex-col gap-3 p-5 px-6">
        <div className="text-[13px] font-medium text-foreground">
          Submit feedback
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describe what you'd like to change or improve…"
          rows={4}
          className="portal-textarea w-full rounded-xl border px-3 py-2.5 text-xs leading-relaxed outline-none transition-all"
        />
        <div className="flex items-center justify-between">
          {submitted ? (
            <span className="text-[11px] text-emerald-600">
              ✓ Feedback submitted — your team has been notified.
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground">
              Feedback is reviewed by your project manager before action.
            </span>
          )}
          <button
            onClick={handleSubmit}
            disabled={submitting || !text.trim()}
            className="portal-submit-btn rounded-lg px-4.5 py-2 text-xs font-medium text-white"
          >
            {submitting ? 'Submitting…' : 'Submit feedback'}
          </button>
        </div>
      </div>

      {/* Previous feedback list */}
      <div className="sd-glass p-5 px-6">
        <div className="mb-1 text-[13px] font-medium text-foreground">
          Previous feedback
        </div>
        {loading ? (
          <div className="py-3 text-xs text-muted-foreground">Loading…</div>
        ) : error ? (
          <div className="py-3 text-xs text-muted-foreground">
            Failed to load feedback.{' '}
            <button
              onClick={fetchFeedback}
              className="cursor-pointer border-none bg-none text-xs"
              style={{ color: 'var(--portal-primary)' }}
            >
              Retry
            </button>
          </div>
        ) : feedback.length === 0 ? (
          <div className="py-3 text-xs text-muted-foreground">
            No feedback submitted yet.
          </div>
        ) : (
          feedback.map((item) => <FeedbackItem key={item.id} item={item} />)
        )}
      </div>
    </div>
  )
}
