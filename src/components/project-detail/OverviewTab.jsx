import { useEffect, useState } from 'react'
import {
  IconChevronDown, IconChevronRight, IconClockHour4, IconChecklist,
  IconRotate, IconThumbUp, IconAlertTriangle, IconSparkles, IconMessageCircle,
} from '@tabler/icons-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { tasksApi, revisionsApi, approvalsApi, risksApi, sentimentApi } from '../../services/api'
import { FLAG_META, formatDate, sentimentTextClass } from './shared'

const RISK_LABELS = {
  deadline_at_risk: 'Deadline at risk',
  revision_risk_detected: 'Revision risk detected',
  health_score_critical: 'Health score critical',
  client_sentiment_declining: 'Client sentiment declining',
}

function StatCard({ icon: Icon, label, value, sub, tone }) {
  return (
    <div className="sd-card p-3.5">
      <div className="flex items-center gap-2.5">
        <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${tone || 'bg-primary/10 text-primary'}`}>
          <Icon size={15} />
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold leading-tight tabular-nums">{value}</p>
          <p className="truncate text-[10.5px] text-muted-foreground">{label}</p>
        </div>
      </div>
      {sub && <p className="mt-1.5 text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  )
}

function HealthScoreHero({ project }) {
  const health = project.health_score
  const score = health?.score
  const flag = health?.flag
  const meta = flag ? FLAG_META[flag] : null
  const reasons = Array.isArray(health?.reasons) ? health.reasons : []
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="sd-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="sd-card-title flex items-center gap-1.5"><IconSparkles size={14} className="text-primary" /> Health score</p>
        {health?.computed_at && (
          <span className="text-[10px] text-muted-foreground">Updated {formatDate(health.computed_at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-4">
        <div className={`flex size-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-semibold ${meta?.className || 'bg-muted text-muted-foreground'}`}>
          {score ?? '—'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium capitalize">{flag ? `${flag} — ${flag === 'green' ? 'on track' : flag === 'amber' ? 'at risk' : 'critical'}` : 'Not computed yet'}</p>
          {reasons.length > 0 ? (
            <button onClick={() => setExpanded((v) => !v)} className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
              {expanded ? <IconChevronDown size={12} /> : <IconChevronRight size={12} />}
              {reasons.length} contributing factor{reasons.length > 1 ? 's' : ''}
            </button>
          ) : (
            <p className="mt-0.5 text-[11px] text-muted-foreground">No risk factors detected.</p>
          )}
        </div>
      </div>

      {expanded && reasons.length > 0 && (
        <ul className="mt-2.5 flex flex-col gap-1 border-t border-border pt-2.5">
          {reasons.map((reason, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[11.5px] text-muted-foreground">
              <span>·</span>{reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function MilestoneProgress({ project }) {
  const milestones = project.milestones || []
  const done = milestones.filter((m) => ['completed', 'done'].includes(m.status)).length
  const total = milestones.length

  const segments = milestones.map((m) => ({
    id: m.id,
    pct: total ? 100 / total : 0,
    color: ['completed', 'done'].includes(m.status) ? 'bg-emerald-500' : m.status === 'in_progress' ? 'bg-primary' : 'bg-muted',
  }))

  return (
    <div className="sd-card p-4">
      <div className="flex items-center justify-between">
        <p className="sd-card-title">Milestones</p>
        <span className="text-[11px] text-muted-foreground">{done}/{total} complete</span>
      </div>

      <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
        {segments.length === 0 ? null : segments.map((s, i) => (
          <div key={s.id} className={`h-full ${s.color} ${i !== 0 ? 'ml-0.5' : ''}`} style={{ width: `${s.pct}%` }} />
        ))}
      </div>

      {project.next_milestone ? (
        <p className="mt-2.5 text-[11px] text-muted-foreground">
          Next: <span className="font-medium text-foreground">{project.next_milestone.title}</span> · due {formatDate(project.next_milestone.due_date)}
        </p>
      ) : (
        <p className="mt-2.5 text-[11px] text-muted-foreground">No milestones yet.</p>
      )}
    </div>
  )
}

function SentimentSparkline({ points }) {
  if (!points || points.length === 0) {
    return (
      <div className="sd-card p-4">
        <p className="sd-card-title">Client sentiment</p>
        <p className="mt-2 text-[11px] text-muted-foreground">No client messages yet.</p>
      </div>
    )
  }

  const latest = points[points.length - 1]
  const recentNegatives = points.slice(-3).filter((p) => p.label === 'negative').length

  return (
    <div className="sd-card p-4">
      <div className="flex items-center justify-between">
        <p className="sd-card-title">Client sentiment</p>
        <span className={`text-[11px] font-medium ${sentimentTextClass(latest.label)}`}>{latest.label}</span>
      </div>
      <div className="mt-3 flex items-end gap-1 h-10">
        {points.slice(-14).map((p, i) => {
          const height = Math.max(8, ((p.score + 1) / 2) * 100)
          const color = p.label === 'positive' ? 'bg-emerald-500' : p.label === 'negative' ? 'bg-red-400' : 'bg-amber-400'
          return <div key={i} title={`${p.score}`} className={`w-1.5 rounded-t ${color}`} style={{ height: `${height}%` }} />
        })}
      </div>
      {recentNegatives >= 3 && (
        <p className="mt-2 flex items-center gap-1 text-[10.5px] text-red-500">
          <IconAlertTriangle size={11} /> Relationship at risk — 3+ consecutive negative signals
        </p>
      )}
    </div>
  )
}

function RisksFeed({ risks, loading }) {
  return (
    <div className="sd-card">
      <div className="sd-card-header">
        <p className="sd-card-title">Risk activity</p>
      </div>
      <div className="sd-card-body--flush sd-card-body">
        {loading ? (
          <div className="flex flex-col gap-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
        ) : risks.length === 0 ? (
          <p className="text-[11.5px] text-muted-foreground">No risk signals raised. Project is tracking cleanly.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {risks.slice(0, 8).map((r) => (
              <li key={r.id} className="flex items-start gap-2 text-[11.5px]">
                <IconAlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-500" />
                <div className="min-w-0">
                  <p className="text-foreground">{RISK_LABELS[r.event_type] || r.event_type}</p>
                  <p className="text-[10px] text-muted-foreground">{formatDate(r.created_at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function RecentFeedback({ revisions, loading }) {
  return (
    <div className="sd-card">
      <div className="sd-card-header">
        <p className="sd-card-title">Recent client feedback</p>
      </div>
      <div className="sd-card-body--flush sd-card-body">
        {loading ? (
          <div className="flex flex-col gap-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
        ) : revisions.length === 0 ? (
          <p className="text-[11.5px] text-muted-foreground">No feedback submitted yet.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {revisions.slice(0, 4).map((r) => (
              <li key={r.id} className="flex items-start gap-2 text-[11.5px]">
                <IconMessageCircle size={13} className="mt-0.5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-foreground">Round {r.round_number}</span>
                    <Badge variant={r.status === 'accepted' ? 'success' : r.status === 'rejected' ? 'destructive' : 'outline'} className="text-[9px]">{r.status}</Badge>
                  </div>
                  <p className="truncate text-muted-foreground">{r.feedback_text}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default function OverviewTab({ project, projectId }) {
  const [loading, setLoading] = useState(true)
  const [sentiment, setSentiment] = useState([])
  const [revisions, setRevisions] = useState([])
  const [approvals, setApprovals] = useState([])
  const [risks, setRisks] = useState([])
  const [hours, setHours] = useState({ actual: 0, estimated: 0 })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.allSettled([
      sentimentApi.project(projectId),
      revisionsApi.index(projectId),
      approvalsApi.index(projectId),
      risksApi.index(projectId),
      tasksApi.index(projectId),
    ]).then(([sentRes, revRes, apprRes, riskRes, taskRes]) => {
      if (cancelled) return
      if (sentRes.status === 'fulfilled') setSentiment(sentRes.value.data.data || [])
      if (revRes.status === 'fulfilled') setRevisions(revRes.value.data.data || [])
      if (apprRes.status === 'fulfilled') setApprovals(apprRes.value.data.data || [])
      if (riskRes.status === 'fulfilled') setRisks(riskRes.value.data.data || [])
      if (taskRes.status === 'fulfilled') {
        const tasks = taskRes.value.data.data?.tasks || []
        const actual = tasks.reduce((sum, t) => sum + (Number(t.actual_hours) || 0), 0)
        const estimated = tasks.reduce((sum, t) => sum + (Number(t.estimated_hours) || 0), 0)
        setHours({ actual, estimated })
      }
    }).finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [projectId])

  const taskCounts = project.task_counts || { total: 0, done: 0 }
  const latestRevision = revisions[0]
  const respondedApprovals = approvals.filter((a) => a.responded_at)
  const avgLagHours = respondedApprovals.length
    ? respondedApprovals.reduce((sum, a) => sum + (Number(a.approval_lag_hours) || 0), 0) / respondedApprovals.length
    : null
  const burnRatio = hours.estimated ? Math.round((hours.actual / hours.estimated) * 100) : null

  return (
    <div className="sd-proj-overview flex flex-col gap-3 overflow-y-auto pb-4">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
        <div className="lg:col-span-2"><HealthScoreHero project={project} /></div>
        <div className="lg:col-span-3 flex flex-col gap-3">
          <MilestoneProgress project={project} />
          <SentimentSparkline points={sentiment} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          icon={IconChecklist}
          label="Tasks complete"
          value={`${taskCounts.done}/${taskCounts.total}`}
        />
        <StatCard
          icon={IconClockHour4}
          label="Hours logged / estimated"
          value={hours.estimated ? `${hours.actual}h / ${hours.estimated}h` : `${hours.actual}h`}
          sub={burnRatio != null ? `${burnRatio}% burn` : null}
          tone={burnRatio != null && burnRatio > 85 ? 'bg-red-50 text-red-600' : undefined}
        />
        <StatCard
          icon={IconRotate}
          label="Revision round"
          value={latestRevision ? `R${latestRevision.round_number}` : '—'}
          tone={latestRevision?.round_number >= 3 ? 'bg-orange-50 text-orange-600' : undefined}
        />
        <StatCard
          icon={IconThumbUp}
          label="Avg approval lag"
          value={avgLagHours != null ? `${(avgLagHours / 24).toFixed(1)}d` : '—'}
          tone={avgLagHours != null && avgLagHours > 48 ? 'bg-orange-50 text-orange-600' : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <RisksFeed risks={risks} loading={loading} />
        <RecentFeedback revisions={revisions} loading={loading} />
      </div>
    </div>
  )
}
