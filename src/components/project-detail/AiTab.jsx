import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  IconAlertTriangle,
  IconCheck,
  IconHeartbeat,
  IconRefresh,
  IconSparkles,
  IconTrendingUp,
  IconX,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { apiErrorMessage } from '@/lib/apiError'
import useAuthStore from '@/store/authStore'
import { isAgencyAdmin } from '@/lib/roles'
import {
  aiApi,
  healthScoresApi,
  risksApi,
  sentimentApi,
  upsellApi,
} from '@/services/api'
import { FLAG_META, formatDate } from './shared'

const RISK_LABELS = {
  deadline_at_risk: 'Deadline at risk',
  revision_risk_detected: 'Revision risk detected',
  health_score_critical: 'Health score critical',
  client_sentiment_declining: 'Client sentiment declining',
  ai_ticket_generated: 'AI ticket generated',
}

const EXAMPLES = [
  'Make the homepage feel more premium and modern.',
  'The checkout flow is confusing — can we simplify it?',
  "There's a bug where the login button doesn't respond on mobile.",
]

function formatServiceType(value) {
  return String(value || 'service')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function Panel({ title, desc, action, children, className = '' }) {
  return (
    <section className={cn('sd-ai-panel', className)}>
      <div className="sd-ai-panel__head">
        <div>
          <h2 className="sd-ai-panel__title">{title}</h2>
          {desc ? <p className="sd-ai-panel__desc">{desc}</p> : null}
        </div>
        {action || null}
      </div>
      <div className="sd-ai-panel__body">{children}</div>
    </section>
  )
}

function ConfidenceRing({ value = 0 }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0))
  // Leave a tiny gap so a near-full ring doesn't look like a solid disk
  const arc = Math.min(pct, 99.2)
  const tone = pct >= 75 ? 'high' : pct >= 55 ? 'mid' : 'low'
  return (
    <div className={cn('sd-upsell-engine__ring', `is-${tone}`)} aria-label={`${pct}% confidence`}>
      <svg viewBox="0 0 120 120" className="sd-upsell-engine__ring-svg" aria-hidden>
        <circle
          cx="60"
          cy="60"
          r="52"
          pathLength="100"
          className="sd-upsell-engine__ring-track"
        />
        <circle
          cx="60"
          cy="60"
          r="52"
          pathLength="100"
          className="sd-upsell-engine__ring-value"
          strokeDasharray={`${arc} ${100 - arc}`}
          strokeDashoffset="0"
        />
      </svg>
      <div className="sd-upsell-engine__ring-label">
        <strong>{pct}</strong>
        <em>%</em>
        <span>confidence</span>
      </div>
    </div>
  )
}

export default function AiTab({ project, projectId, onProjectRefresh }) {
  const { user } = useAuthStore()
  const isAdmin = isAgencyAdmin(user)

  const [loading, setLoading] = useState(true)
  const [recomputing, setRecomputing] = useState(false)
  const [health, setHealth] = useState(project?.health_score || null)
  const [sentiment, setSentiment] = useState([])
  const [risks, setRisks] = useState([])
  const [upsells, setUpsells] = useState([])
  const [lastRun, setLastRun] = useState(null)

  const [feedbackText, setFeedbackText] = useState('')
  const [translating, setTranslating] = useState(false)
  const [ticket, setTicket] = useState(null)
  const [translateError, setTranslateError] = useState('')

  const [digest, setDigest] = useState('')
  const [digestLoading, setDigestLoading] = useState(false)

  const [upsellBusy, setUpsellBusy] = useState(null)
  const [generatingUpsell, setGeneratingUpsell] = useState(false)
  const [selectedUpsellId, setSelectedUpsellId] = useState(null)

  const load = useCallback(() => {
    if (!projectId) return
    setLoading(true)
    Promise.allSettled([
      healthScoresApi.show(projectId),
      sentimentApi.project(projectId),
      risksApi.index(projectId),
      upsellApi.index(),
    ])
      .then(([healthRes, sentRes, riskRes, upsellRes]) => {
        if (healthRes.status === 'fulfilled') {
          const data = healthRes.value.data?.data
          const latest = Array.isArray(data) ? data[0] : data
          setHealth(latest || project?.health_score || null)
        } else {
          setHealth(project?.health_score || null)
        }
        if (sentRes.status === 'fulfilled') {
          setSentiment(sentRes.value.data?.data || [])
        }
        if (riskRes.status === 'fulfilled') {
          setRisks(riskRes.value.data?.data || [])
        }
        if (upsellRes.status === 'fulfilled') {
          const all = upsellRes.value.data?.data || []
          const mine = all.filter((u) => Number(u.project_id) === Number(projectId))
          setUpsells(mine)
          setLastRun((prev) => {
            if (prev || !mine[0]) return prev
            const conf = Number(mine[0].confidence || 0)
            return {
              confidence: Math.round(conf * 100),
              service: mine[0].service_type,
              ready: conf >= 0.55,
              signals: [],
              tier: conf >= 0.75 ? 'high' : conf >= 0.55 ? 'medium' : 'low',
            }
          })
          setSelectedUpsellId((prev) => {
            if (prev && mine.some((u) => u.id === prev)) return prev
            const pending = mine.find((u) => u.admin_status === 'pending')
            return pending?.id || mine[0]?.id || null
          })
        }
      })
      .finally(() => setLoading(false))
  }, [projectId, project?.health_score])

  useEffect(() => {
    load()
  }, [load])

  const flagMeta = health?.flag ? FLAG_META[health.flag] : null
  const reasons = Array.isArray(health?.reasons) ? health.reasons : []
  const latestSent = sentiment[sentiment.length - 1]
  const negStreak = useMemo(() => {
    let n = 0
    for (let i = sentiment.length - 1; i >= 0; i -= 1) {
      if (sentiment[i]?.label === 'negative') n += 1
      else break
    }
    return n
  }, [sentiment])

  // Active batch: pending options + anything already sent (for undo)
  const optionUpsells = useMemo(() => {
    const pending = upsells.filter(
      (u) => u.admin_status === 'pending' && u.client_status === 'hidden',
    )
    const sent = upsells.filter((u) =>
      ['shown', 'accepted', 'declined'].includes(u.client_status),
    )
    const approved = upsells.filter(
      (u) => u.admin_status === 'approved' && u.client_status === 'hidden',
    )
    const batch = [...pending, ...sent, ...approved]
    if (batch.length) return batch
    return upsells.slice(0, 3)
  }, [upsells])

  const selectedUpsell =
    optionUpsells.find((u) => u.id === selectedUpsellId) || optionUpsells[0] || null

  const confidencePct = lastRun?.confidence
    ?? (selectedUpsell ? Math.round(Number(selectedUpsell.confidence || 0) * 100) : null)

  const canUndo = Boolean(
    selectedUpsell &&
      (['shown', 'accepted', 'declined'].includes(selectedUpsell.client_status) ||
        selectedUpsell.admin_status === 'approved' ||
        selectedUpsell.admin_status === 'rejected'),
  )

  const canSend = Boolean(
    selectedUpsell &&
      selectedUpsell.client_status === 'hidden' &&
      selectedUpsell.admin_status !== 'rejected',
  )

  const handleRecompute = async () => {
    setRecomputing(true)
    try {
      const res = await healthScoresApi.compute(projectId)
      setHealth(res.data?.data || null)
      toast.success('Health score recomputed')
      onProjectRefresh?.()
      load()
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not recompute health score'))
    } finally {
      setRecomputing(false)
    }
  }

  const handleTranslate = async () => {
    if (!feedbackText.trim() || feedbackText.trim().length < 10) {
      setTranslateError('Feedback must be at least 10 characters.')
      return
    }
    setTranslateError('')
    setTranslating(true)
    setTicket(null)
    try {
      const res = await aiApi.analyzeFeedback({
        feedback_text: feedbackText,
        project_type: project?.type || 'general',
        project_id: Number(projectId),
      })
      setTicket(res.data?.data || null)
    } catch (err) {
      const msg = apiErrorMessage(err, 'AI service unavailable — try again shortly.')
      setTranslateError(msg)
      toast.error(msg)
    } finally {
      setTranslating(false)
    }
  }

  const handleDigest = async () => {
    setDigestLoading(true)
    try {
      const res = await aiApi.generateDigest(Number(projectId))
      const data = res.data?.data
      setDigest(typeof data === 'string' ? data : data?.summary || data?.digest || JSON.stringify(data))
      toast.success('Weekly digest generated')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not generate digest'))
    } finally {
      setDigestLoading(false)
    }
  }

  const handleGenerateUpsell = async () => {
    setGeneratingUpsell(true)
    try {
      const res = await aiApi.getUpsell(Number(projectId), { force: true })
      const payload = res.data?.data || {}
      const suggestion = payload.suggestion || payload.suggestions?.[0]
      const list = Array.isArray(payload.suggestions) ? payload.suggestions : []
      const confidence = Math.round(Number(payload.raw?.confidence || suggestion?.confidence || 0) * 100)
      const ready = Boolean(payload.ready)
      const signals = Array.isArray(payload.raw?.signals) ? payload.raw.signals : []
      const metrics = payload.metrics || {}

      setLastRun({
        confidence,
        ready,
        signals,
        service: suggestion?.service_type || payload.raw?.service,
        tier: payload.raw?.tier || 'medium',
        metrics,
        model: payload.raw?.model_version || 'ensemble-v2-calibrated',
      })

      if (suggestion || list.length) {
        toast.success(
          ready
            ? `Upsell engine · ${list.length || 1} options · ${confidence}%`
            : `Upsell engine · ${confidence}% saved for review`,
        )
        load()
      } else {
        toast.error(
          payload.raw?.reason === 'timing_not_right'
            ? `Model scored ${confidence}% — timing not ready yet`
            : 'No suggestion produced — check AI service / model file',
        )
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not run upsell engine'))
    } finally {
      setGeneratingUpsell(false)
    }
  }

  const respondUpsell = async (id, action) => {
    setUpsellBusy(id)
    try {
      if (action === 'approve') await upsellApi.approve(id)
      else if (action === 'reject') await upsellApi.reject(id)
      else if (action === 'send') await upsellApi.send(id)
      else if (action === 'undo') await upsellApi.undo(id)
      const messages = {
        approve: 'Suggestion approved',
        reject: 'Suggestion rejected',
        send: 'Sent to client',
        undo: 'Upsell action undone',
      }
      toast.success(messages[action] || 'Updated')
      load()
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not update suggestion'))
    } finally {
      setUpsellBusy(null)
    }
  }

  if (loading) {
    return (
      <div className="sd-proj-ai">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    )
  }

  const m = lastRun?.metrics || {}

  return (
    <div className="sd-proj-ai">
      {/* ── Upsell Engine (primary) ── */}
      <section className="sd-upsell-engine">
        <div className="sd-upsell-engine__top">
          <div className="sd-upsell-engine__brand">
            <span className="sd-upsell-engine__icon" aria-hidden>
              <IconTrendingUp size={22} stroke={1.75} />
            </span>
            <div>
              <p className="sd-upsell-engine__eyebrow">C2 · Predictive engine</p>
              <h2 className="sd-upsell-engine__title">Upsell Engine</h2>
              <p className="sd-upsell-engine__sub">
                Trained sklearn ensemble scores this project and recommends the next service —
                timing-aware, review before client sees it.
              </p>
            </div>
          </div>
          <Button
            type="button"
            className="sd-btn-gradient border-0 shrink-0"
            disabled={generatingUpsell}
            onClick={handleGenerateUpsell}
          >
            <IconSparkles size={16} stroke={1.75} />
            {generatingUpsell
              ? 'Running model…'
              : optionUpsells.length
                ? 'Re-run model'
                : 'Run upsell model'}
          </Button>
        </div>

        <div className="sd-upsell-engine__body">
          <div className="sd-upsell-engine__score-col">
            <ConfidenceRing value={confidencePct ?? 0} />
            <p className="sd-upsell-engine__tier">
              {confidencePct == null
                ? 'Not scored yet'
                : lastRun?.ready
                  ? `${(lastRun.tier || 'medium').toUpperCase()} · timing ready`
                  : `${(lastRun?.tier || 'low').toUpperCase()} · soft timing`}
            </p>
            <p className="sd-upsell-engine__model">
              {lastRun?.model || 'ensemble-v2-calibrated'}
            </p>
          </div>

          <div className="sd-upsell-engine__main">
            {optionUpsells.length > 0 ? (
              <div className="sd-upsell-engine__result">
                <div className="sd-upsell-engine__result-head">
                  <div>
                    <p className="sd-upsell-engine__label">Pick a service to send</p>
                    <h3 className="sd-upsell-engine__service">
                      {selectedUpsell
                        ? formatServiceType(selectedUpsell.service_type)
                        : 'Choose an option'}
                    </h3>
                  </div>
                  {selectedUpsell ? (
                    <span
                      className={cn(
                        'sd-upsell-engine__status',
                        selectedUpsell.client_status === 'shown' ||
                        selectedUpsell.client_status === 'accepted' ||
                        selectedUpsell.client_status === 'declined'
                          ? 'is-sent'
                          : `is-${selectedUpsell.admin_status || 'pending'}`,
                      )}
                    >
                      {selectedUpsell.client_status === 'accepted'
                        ? 'accepted'
                        : selectedUpsell.client_status === 'declined'
                          ? 'declined'
                          : selectedUpsell.client_status === 'shown'
                            ? 'sent'
                            : selectedUpsell.admin_status || 'pending'}
                    </span>
                  ) : null}
                </div>

                <div className="sd-upsell-engine__options" role="listbox" aria-label="Upsell options">
                  {optionUpsells.map((u, idx) => {
                    const active = selectedUpsell?.id === u.id
                    return (
                      <button
                        key={u.id}
                        type="button"
                        role="option"
                        aria-selected={active}
                        className={cn('sd-upsell-engine__option', active && 'is-active')}
                        onClick={() => setSelectedUpsellId(u.id)}
                      >
                        <span className="sd-upsell-engine__option-rank">#{idx + 1}</span>
                        <span className="sd-upsell-engine__option-body">
                          <strong>{formatServiceType(u.service_type)}</strong>
                          <em>
                            {Math.round(Number(u.confidence || 0) * 100)}% confidence
                            {['shown', 'accepted', 'declined'].includes(u.client_status)
                              ? ` · ${u.client_status === 'shown' ? 'sent' : u.client_status}`
                              : ''}
                          </em>
                        </span>
                      </button>
                    )
                  })}
                </div>

                {Array.isArray(lastRun?.signals) && lastRun.signals.length > 0 ? (
                  <ul className="sd-upsell-engine__signals">
                    {lastRun.signals.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="sd-upsell-engine__hint">
                    Select one option to send. You can undo or re-run the model anytime.
                  </p>
                )}

                {isAdmin && selectedUpsell ? (
                  <div className="sd-upsell-engine__actions">
                    {canSend ? (
                      <Button
                        size="sm"
                        className="border-0"
                        disabled={upsellBusy === selectedUpsell.id}
                        onClick={() => respondUpsell(selectedUpsell.id, 'send')}
                      >
                        <IconCheck size={15} />
                        Send to client
                      </Button>
                    ) : null}
                    {canUndo ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={upsellBusy === selectedUpsell.id}
                        onClick={() => respondUpsell(selectedUpsell.id, 'undo')}
                      >
                        <IconRefresh size={15} />
                        Undo
                      </Button>
                    ) : null}
                    {selectedUpsell.admin_status === 'pending' &&
                    selectedUpsell.client_status !== 'shown' ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={upsellBusy === selectedUpsell.id}
                        onClick={() => respondUpsell(selectedUpsell.id, 'reject')}
                      >
                        <IconX size={15} />
                        Dismiss
                      </Button>
                    ) : null}
                  </div>
                ) : null}

                <div className="sd-upsell-engine__metrics">
                  {[
                    {
                      label: 'Completion',
                      value:
                        m.completion_pct != null
                          ? `${Math.round(Number(m.completion_pct) * 100)}%`
                          : '—',
                    },
                    {
                      label: 'Health',
                      value:
                        m.health_score != null
                          ? Math.round(Number(m.health_score))
                          : (health?.score ?? '—'),
                    },
                    {
                      label: 'Sentiment',
                      value:
                        m.sentiment_avg != null
                          ? Number(m.sentiment_avg).toFixed(2)
                          : '—',
                    },
                    {
                      label: 'Revisions',
                      value: m.revision_count != null ? m.revision_count : '—',
                    },
                  ].map((row) => (
                    <div key={row.label} className="sd-upsell-engine__metric">
                      <span>{row.label}</span>
                      <strong className="tabular-nums">{row.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="sd-upsell-engine__empty">
                <IconTrendingUp size={28} stroke={1.5} />
                <p className="sd-upsell-engine__empty-title">No model run yet</p>
                <p className="sd-upsell-engine__empty-desc">
                  Run the upsell model to get 2–3 ranked service options for{' '}
                  <strong>{project?.name || 'this project'}</strong>.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Supporting AI modules ── */}
      <div className="sd-proj-ai__grid">
        <Panel
          title="Health score"
          desc="Rule-based 0–100 score — scope-creep early warning."
          action={
            <Button
              variant="secondary"
              size="sm"
              className="border-0"
              disabled={recomputing}
              onClick={handleRecompute}
            >
              <IconRefresh size={14} className={cn(recomputing && 'animate-spin')} />
              {recomputing ? '…' : 'Recompute'}
            </Button>
          }
        >
          <div className="sd-proj-ai__health">
            <div
              className={cn(
                'sd-proj-ai__score',
                flagMeta?.className || 'bg-muted text-muted-foreground',
              )}
            >
              {health?.score ?? '—'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium capitalize">
                {health?.flag
                  ? `${health.flag} — ${
                      health.flag === 'green'
                        ? 'on track'
                        : health.flag === 'amber'
                          ? 'at risk'
                          : 'critical'
                    }`
                  : 'Not computed yet'}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {health?.computed_at
                  ? `Updated ${formatDate(health.computed_at, {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`
                  : 'Run recompute to generate the first score.'}
              </p>
              {reasons.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {reasons.slice(0, 3).map((r, i) => (
                    <li key={i} className="text-xs text-muted-foreground">
                      · {r}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </Panel>

        <Panel
          title="Client sentiment"
          desc="Three negatives in a row flag relationship risk."
        >
          {sentiment.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No sentiment points yet — client messages feed this timeline.
            </p>
          ) : (
            <>
              <div className="sd-proj-ai__sentiment-head">
                <span className={cn('text-sm font-medium', latestSent?.label === 'negative' && 'text-red-600')}>
                  Latest: {latestSent?.label || 'neutral'}
                  {latestSent?.score != null ? ` (${Number(latestSent.score).toFixed(2)})` : ''}
                </span>
                {negStreak >= 3 ? (
                  <Badge variant="destructive">At risk</Badge>
                ) : (
                  <Badge variant="outline">{sentiment.length} scored</Badge>
                )}
              </div>
              <div className="sd-proj-ai__spark" aria-hidden>
                {sentiment.slice(-16).map((p, i) => {
                  const h = Math.max(8, Math.round(((Number(p.score) + 1) / 2) * 100))
                  const tone =
                    p.label === 'negative' ? 'is-neg' : p.label === 'positive' ? 'is-pos' : 'is-neu'
                  return (
                    <span
                      key={p.id || i}
                      className={cn('sd-proj-ai__bar', tone)}
                      style={{ height: `${h}%` }}
                    />
                  )
                })}
              </div>
            </>
          )}
        </Panel>
      </div>

      <Panel
        title="AI risk alerts"
        desc="Deadline, revision, health, and sentiment signals."
      >
        {risks.length === 0 ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <IconHeartbeat size={16} className="text-emerald-500" />
            No risk signals right now.
          </p>
        ) : (
          <ul className="sd-proj-ai__risks">
            {risks.slice(0, 6).map((r, i) => (
              <li key={r.id || i}>
                <span className="sd-proj-ai__risk-icon" aria-hidden>
                  <IconAlertTriangle size={14} />
                </span>
                <div>
                  <p className="text-sm font-medium">
                    {RISK_LABELS[r.event_type || r.type] || r.message || r.event_type || 'Risk'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[r.message || r.metadata?.message, r.created_at
                      ? formatDate(r.created_at, {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : null]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title="Feedback translator"
        desc="Vague client feedback → structured ticket for this project."
      >
        <div className="sd-ai-translator">
          <div className="sd-ai-translator__col">
            <p className="sd-ai-translator__label">Client feedback</p>
            <div className="sd-ai-filters">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  className="sd-ai-chip"
                  onClick={() => setFeedbackText(ex)}
                >
                  {ex.length > 36 ? `${ex.slice(0, 36)}…` : ex}
                </button>
              ))}
            </div>
            <Textarea
              rows={4}
              className="sd-team-field sd-team-field--textarea"
              placeholder="Describe what the client said…"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
            />
            {translateError ? <p className="sd-team-form__error">{translateError}</p> : null}
            <Button
              type="button"
              className="sd-btn-gradient self-start border-0"
              disabled={translating}
              onClick={handleTranslate}
            >
              <IconSparkles size={15} stroke={1.75} />
              {translating ? 'Translating…' : 'Translate to ticket'}
            </Button>
          </div>
          <div className="sd-ai-translator__col">
            <p className="sd-ai-translator__label">AI-generated ticket</p>
            {!ticket ? (
              <p className="text-sm text-muted-foreground">
                Translate feedback to see title, priority, role, and subtasks.
              </p>
            ) : (
              <div className="sd-ai-ticket">
                <div className="sd-ai-ticket__head">
                  <p className="sd-ai-ticket__title">{ticket.title}</p>
                  {ticket.priority ? (
                    <Badge
                      variant={
                        ticket.priority === 'high'
                          ? 'destructive'
                          : ticket.priority === 'medium'
                            ? 'warning'
                            : 'success'
                      }
                      className="capitalize"
                    >
                      {ticket.priority}
                    </Badge>
                  ) : null}
                </div>
                {Array.isArray(ticket.subtasks) && ticket.subtasks.length > 0 ? (
                  <ul className="sd-ai-ticket__subtasks">
                    {ticket.subtasks.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </Panel>

      <Panel
        title="Weekly digest"
        desc="Plain-English client summary from project events."
        action={
          <Button
            size="sm"
            variant="secondary"
            className="border-0"
            disabled={digestLoading}
            onClick={handleDigest}
          >
            <IconSparkles size={14} />
            {digestLoading ? 'Writing…' : 'Generate digest'}
          </Button>
        }
      >
        {digest ? (
          <p className="sd-proj-ai__digest whitespace-pre-wrap text-sm leading-relaxed">{digest}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Generate a digest to draft a client-ready weekly update.
          </p>
        )}
      </Panel>
    </div>
  )
}
