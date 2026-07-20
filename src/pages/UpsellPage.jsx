import { useEffect, useMemo, useState } from 'react'
import { IconTrendingUp, IconCheck, IconX } from '@tabler/icons-react'
import { toast } from 'sonner'
import PageWrapper from '../components/layout/PageWrapper'
import PageHeader from '../components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { upsellApi } from '../services/api'

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
]

const STATUS_BADGE = {
  pending: 'warning',
  approved: 'success',
  rejected: 'destructive',
}

function SuggestionRow({ suggestion, onUpdated }) {
  const [busy, setBusy] = useState(false)
  const isPending = suggestion.admin_status === 'pending'

  const respond = async (action) => {
    setBusy(true)
    try {
      if (action === 'approve') await upsellApi.approve(suggestion.id)
      else await upsellApi.reject(suggestion.id)
      toast.success(action === 'approve' ? 'Suggestion approved' : 'Suggestion rejected')
      onUpdated?.()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-3 border-t border-border px-4 py-3 first:border-t-0">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <IconTrendingUp size={16} stroke={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium capitalize">{suggestion.service_type?.replace('_', ' ')}</p>
        <p className="truncate text-xs text-muted-foreground">
          {suggestion.client_name || 'Unknown client'} · {suggestion.project_name || 'Unknown project'}
        </p>
      </div>
      <Badge variant="outline" className="shrink-0">
        {Math.round((suggestion.confidence || 0) * 100)}% confidence
      </Badge>
      <Badge variant={STATUS_BADGE[suggestion.admin_status] || 'outline'} className="shrink-0 capitalize">
        {suggestion.admin_status}
      </Badge>
      {isPending && (
        <div className="flex shrink-0 gap-1.5">
          <Button size="icon-sm" variant="outline" disabled={busy} onClick={() => respond('approve')} aria-label="Approve">
            <IconCheck size={14} />
          </Button>
          <Button size="icon-sm" variant="outline" disabled={busy} onClick={() => respond('reject')} aria-label="Reject">
            <IconX size={14} />
          </Button>
        </div>
      )}
    </div>
  )
}

export default function UpsellPage() {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [filter, setFilter] = useState('all')

  const load = () => {
    setLoading(true)
    setError(false)
    upsellApi
      .index()
      .then((res) => setSuggestions(res.data.data || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(
    () => (filter === 'all' ? suggestions : suggestions.filter((s) => s.admin_status === filter)),
    [suggestions, filter]
  )

  const counts = useMemo(() => {
    const c = { all: suggestions.length }
    for (const s of suggestions) c[s.admin_status] = (c[s.admin_status] || 0) + 1
    return c
  }, [suggestions])

  return (
    <PageWrapper>
      <div className="sd-page">
        <PageHeader
          title="Upsell Suggestions"
          subtitle="Timing-aware service recommendations — surfaced only when a project is healthy and the client is happy."
        />

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
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : error ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Failed to load suggestions.</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <IconTrendingUp size={22} stroke={1.5} />
              </div>
              <p className="text-sm font-medium">No suggestions yet</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                The upsell engine only surfaces a suggestion once a project is green and the client sentiment is positive.
              </p>
            </div>
          ) : (
            filtered.map((s) => <SuggestionRow key={s.id} suggestion={s} onUpdated={load} />)
          )}
        </div>
      </div>
    </PageWrapper>
  )
}
