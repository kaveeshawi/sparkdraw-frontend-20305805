import { useEffect, useMemo, useState } from 'react'
import {
  IconAlertTriangle,
  IconClockHour4,
  IconHeartRateMonitor,
  IconSparkles,
  IconTrendingUp,
} from '@tabler/icons-react'
import { Skeleton } from '@/components/ui/skeleton'
import { tasksApi, risksApi, sentimentApi, revisionsApi } from '../../services/api'
import { FLAG_META, formatDate, sentimentTextClass } from './shared'
import { useFormatMoney } from '@/hooks/useAgencyCurrency'

function Ring({ value, max = 100, tone = 'primary' }) {
  const pct = Math.max(0, Math.min(100, max ? Math.round((value / max) * 100) : 0))
  const r = 34
  const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c
  return (
    <div className="sd-proj-ring">
      <svg viewBox="0 0 80 80" className="sd-proj-ring__svg" aria-hidden>
        <circle cx="40" cy="40" r={r} className="sd-proj-ring__track" />
        <circle
          cx="40"
          cy="40"
          r={r}
          className={`sd-proj-ring__value sd-proj-ring__value--${tone}`}
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="sd-proj-ring__label">
        <strong>{Number.isFinite(value) ? value : '—'}</strong>
        <span>/ {max}</span>
      </div>
    </div>
  )
}

export default function AnalyticsTab({ project, projectId }) {
  const money = useFormatMoney()
  const [loading, setLoading] = useState(true)
  const [sentiment, setSentiment] = useState([])
  const [risks, setRisks] = useState([])
  const [revisions, setRevisions] = useState([])
  const [hours, setHours] = useState({ actual: 0, estimated: 0, done: 0, total: 0 })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.allSettled([
      sentimentApi.project(projectId),
      risksApi.index(projectId),
      revisionsApi.index(projectId),
      tasksApi.index(projectId),
    ]).then(([sentRes, riskRes, revRes, taskRes]) => {
      if (cancelled) return
      if (sentRes.status === 'fulfilled') setSentiment(sentRes.value.data.data || [])
      if (riskRes.status === 'fulfilled') setRisks(riskRes.value.data.data || [])
      if (revRes.status === 'fulfilled') setRevisions(revRes.value.data.data || [])
      if (taskRes.status === 'fulfilled') {
        const tasks = taskRes.value.data.data?.tasks || taskRes.value.data.data || []
        const list = Array.isArray(tasks) ? tasks : []
        setHours({
          actual: list.reduce((s, t) => s + (Number(t.actual_hours) || 0), 0),
          estimated: list.reduce((s, t) => s + (Number(t.estimated_hours) || 0), 0)
            || Number(project?.estimated_hours) || 0,
          done: list.filter((t) => t.status === 'done').length,
          total: list.length,
        })
      }
    }).finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [projectId, project?.estimated_hours])

  const health = project?.health_score
  const flagMeta = health?.flag ? FLAG_META[health.flag] : null
  const burn = hours.estimated ? Math.round((hours.actual / hours.estimated) * 100) : 0
  const latestSent = sentiment[sentiment.length - 1]

  const aiInsights = useMemo(() => {
    const items = []
    if (health?.reasons?.length) {
      health.reasons.slice(0, 3).forEach((r) => items.push({ type: 'health', text: r }))
    }
    if (revisions[0]?.round_number >= 3) {
      items.push({
        type: 'revision',
        text: `Revision round R${revisions[0].round_number} — scope creep risk elevated.`,
      })
    }
    const neg = sentiment.slice(-3).filter((p) => p.label === 'negative').length
    if (neg >= 3) {
      items.push({ type: 'sentiment', text: 'Client sentiment declining — 3+ consecutive negative signals.' })
    }
    if (burn > 85 && hours.done / Math.max(hours.total, 1) < 0.5) {
      items.push({ type: 'burn', text: `Hours at ${burn}% with under half of tasks done.` })
    }
    if (!items.length) {
      items.push({ type: 'ok', text: 'No critical AI alerts — project signals look stable.' })
    }
    return items
  }, [health, revisions, sentiment, burn, hours])

  if (loading) {
    return (
      <div className="sd-proj-analytics">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="sd-proj-analytics">
      <section className="sd-proj-ai-banner">
        <div className="sd-proj-ai-banner__head">
          <IconSparkles size={16} />
          <div>
            <p className="sd-proj-ai-banner__title">AI project intelligence</p>
            <p className="sd-proj-ai-banner__sub">
              Health, sentiment, and burn signals for this project
            </p>
          </div>
        </div>
        <ul className="sd-proj-ai-banner__list">
          {aiInsights.map((item, i) => (
            <li key={i}>
              {item.type === 'ok' ? <IconTrendingUp size={13} /> : <IconAlertTriangle size={13} />}
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="sd-proj-analytics__grid">
        <article className="sd-proj-analytic-card">
          <div className="sd-proj-analytic-card__head">
            <IconHeartRateMonitor size={15} />
            <span>Health score</span>
          </div>
          <div className="sd-proj-analytic-card__body sd-proj-analytic-card__body--center">
            <Ring
              value={health?.score ?? 0}
              max={100}
              tone={health?.flag === 'red' ? 'danger' : health?.flag === 'amber' ? 'warn' : 'ok'}
            />
            <p className={`sd-proj-analytic-card__status ${flagMeta?.className || ''}`}>
              {health?.flag ? `${health.flag} · ${health.flag === 'green' ? 'on track' : health.flag === 'amber' ? 'at risk' : 'critical'}` : 'Not computed'}
            </p>
          </div>
        </article>

        <article className="sd-proj-analytic-card">
          <div className="sd-proj-analytic-card__head">
            <IconClockHour4 size={15} />
            <span>Hours burn</span>
          </div>
          <div className="sd-proj-analytic-card__body">
            <p className="sd-proj-analytic-card__metric">
              {hours.actual}h <span>/ {hours.estimated || project?.estimated_hours || '—'}h</span>
            </p>
            <div className="sd-proj-progress">
              <div className="sd-proj-progress__bar" style={{ width: `${Math.min(burn, 100)}%` }} />
            </div>
            <p className="sd-proj-analytic-card__hint">{burn}% of estimated hours used</p>
            {project?.budget != null ? (
              <p className="sd-proj-analytic-card__hint">Budget {money(project.budget)}</p>
            ) : null}
          </div>
        </article>

        <article className="sd-proj-analytic-card">
          <div className="sd-proj-analytic-card__head">
            <IconSparkles size={15} />
            <span>Client sentiment</span>
          </div>
          <div className="sd-proj-analytic-card__body">
            {sentiment.length === 0 ? (
              <p className="sd-proj-analytic-card__hint">No client messages scored yet.</p>
            ) : (
              <>
                <p className={`sd-proj-analytic-card__metric ${sentimentTextClass(latestSent?.label)}`}>
                  {latestSent?.label || '—'}
                </p>
                <div className="sd-proj-spark">
                  {sentiment.slice(-16).map((p, i) => {
                    const h = Math.max(10, ((Number(p.score) + 1) / 2) * 100)
                    const tone = p.label === 'positive' ? 'ok' : p.label === 'negative' ? 'danger' : 'warn'
                    return (
                      <span
                        key={i}
                        className={`sd-proj-spark__bar sd-proj-spark__bar--${tone}`}
                        style={{ height: `${h}%` }}
                        title={`${p.score}`}
                      />
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </article>
      </div>

      <div className="sd-proj-analytics__split">
        <article className="sd-proj-analytic-card">
          <div className="sd-proj-analytic-card__head">
            <span>Delivery progress</span>
            <span className="sd-proj-analytic-card__muted">
              {hours.done}/{hours.total} tasks
            </span>
          </div>
          <div className="sd-proj-analytic-card__body">
            <div className="sd-proj-progress sd-proj-progress--lg">
              <div
                className="sd-proj-progress__bar"
                style={{ width: `${hours.total ? Math.round((hours.done / hours.total) * 100) : 0}%` }}
              />
            </div>
            <p className="sd-proj-analytic-card__hint mt-2">
              Revisions: {revisions[0] ? `R${revisions[0].round_number}` : 'none yet'}
              {health?.computed_at ? ` · Health updated ${formatDate(health.computed_at)}` : ''}
            </p>
          </div>
        </article>

        <article className="sd-proj-analytic-card">
          <div className="sd-proj-analytic-card__head">
            <IconAlertTriangle size={15} />
            <span>Risk feed</span>
          </div>
          <div className="sd-proj-analytic-card__body sd-proj-analytic-card__body--list">
            {risks.length === 0 ? (
              <p className="sd-proj-analytic-card__hint">No risk signals raised.</p>
            ) : (
              risks.slice(0, 6).map((r) => (
                <div key={r.id} className="sd-proj-risk-row">
                  <IconAlertTriangle size={13} />
                  <div>
                    <p>{String(r.event_type || 'risk').replace(/_/g, ' ')}</p>
                    <span>{formatDate(r.created_at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </div>
    </div>
  )
}
