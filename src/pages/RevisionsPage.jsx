import { useEffect, useMemo, useState } from 'react'
import { Sparkles, ArrowDown } from 'lucide-react'
import { toast } from 'sonner'
import PageWrapper from '../components/layout/PageWrapper'
import FloatPageHeader from '../components/layout/FloatPageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { revisionsApi } from '../services/api'

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'acknowledged', label: 'Acknowledged' },
  { key: 'resolved', label: 'Resolved' },
]

const STATUS_BADGE = {
  pending: 'warning',
  acknowledged: 'info',
  resolved: 'success',
}

function RevisionRow({ revision, onAccepted }) {
  const ticket = revision.ai_ticket_json || {}
  const [accepting, setAccepting] = useState(false)
  const canAccept = Boolean(ticket.title) && revision.status === 'pending'

  const handleAccept = async () => {
    setAccepting(true)
    try {
      await revisionsApi.acceptTicket(revision.project_id, revision.id)
      toast.success('Tasks created successfully')
      onAccepted?.()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept ticket')
    } finally {
      setAccepting(false)
    }
  }

  return (
    <div className="sd-feedback">
      <div className="flex min-w-0 flex-1 gap-3">
        <div className="sd-feedback-icon">
          <Sparkles className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{revision.client?.company_name || '—'}</p>
            <span className="text-xs text-muted-foreground">
              {revision.project?.name ? `· ${revision.project.name}` : ''}
            </span>
            <Badge variant="outline" className="text-[10px]">R{revision.round_number}</Badge>
          </div>
          <p className="mt-1 text-xs italic text-muted-foreground">"{revision.feedback_text}"</p>
          {ticket.title && (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-foreground/80">
              <ArrowDown className="size-3 text-primary" />
              <span className="font-medium">{ticket.title}</span>
              {ticket.category && (
                <Badge variant="outline" className="border-primary/20 bg-primary/5 text-[10px] text-primary">
                  {ticket.category}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        <Badge variant={STATUS_BADGE[revision.status] || 'outline'} className="capitalize">
          {revision.status}
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

export default function RevisionsPage() {
  const [revisions, setRevisions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [filter, setFilter] = useState('all')

  const load = () => {
    setLoading(true)
    setError(false)
    revisionsApi
      .all()
      .then((res) => setRevisions(res.data.data || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(
    () => (filter === 'all' ? revisions : revisions.filter((r) => r.status === filter)),
    [revisions, filter]
  )

  const counts = useMemo(() => {
    const c = { all: revisions.length }
    for (const r of revisions) c[r.status] = (c[r.status] || 0) + 1
    return c
  }, [revisions])

  return (
    <PageWrapper
      pageActions={
        <FloatPageHeader
          title="Revisions"
          subtitle="Client feedback, translated into structured tasks by AI (C1 Feedback Translator)."
        />
      }
    >
      <div className="sd-page sd-page--team">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                filter === f.key
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:bg-accent'
              }`}
            >
              {f.label}
              {counts[f.key] ? ` (${counts[f.key]})` : ''}
            </button>
          ))}
        </div>

        <div className="sd-card">
          {loading ? (
            <div className="flex flex-col gap-2 p-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : error ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Failed to load revisions.</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">No revisions found.</div>
          ) : (
            filtered.map((r) => <RevisionRow key={r.id} revision={r} onAccepted={load} />)
          )}
        </div>
      </div>
    </PageWrapper>
  )
}
