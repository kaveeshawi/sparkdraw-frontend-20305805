import { useCallback, useEffect, useState } from 'react'
import {
  IconChevronDown,
  IconChevronRight,
  IconCircleCheck,
  IconAlertTriangle,
  IconAlertCircle,
  IconRefresh,
} from '@tabler/icons-react'
import PageWrapper from '../components/layout/PageWrapper'
import PageHeader from '../components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import SentimentRow from '../components/dashboard/SentimentRow'
import useAuthStore from '../store/authStore'
import { healthScoresApi, clientsApi, projectsApi, messagesApi } from '../services/api'

const FLAG_META = {
  green: { icon: IconCircleCheck, className: 'bg-green-50 text-green-700 dark:bg-green-900/70 dark:text-white/80' },
  amber: { icon: IconAlertTriangle, className: 'bg-orange-50 text-orange-700 dark:bg-orange-900/70 dark:text-white/80' },
  red: { icon: IconAlertCircle, className: 'bg-red-50 text-red-700 dark:bg-red-900/70 dark:text-white/80' },
}

function SummaryCard({ label, count, flag }) {
  const { icon: Icon, className } = FLAG_META[flag]
  return (
    <div className="sd-card flex items-center gap-3 p-4">
      <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${className}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xl font-semibold tabular-nums">{count}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

function HealthScoreBox({ score, flag }) {
  const meta = FLAG_META[flag] || { className: 'bg-primary/10 text-primary' }
  return (
    <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-medium ${meta.className}`}>
      {score ?? '—'}
    </div>
  )
}

function HealthScoreProjectRow({ item, isAdmin, onRecompute, recomputing }) {
  const [expanded, setExpanded] = useState(false)
  const reasons = Array.isArray(item.reasons) ? item.reasons : []
  const computedStr = item.computed_at
    ? new Date(item.computed_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : 'Not computed yet'

  return (
    <div className="border-t border-border px-4 py-3 first:border-t-0">
      <div className="flex items-center gap-3">
        <HealthScoreBox score={item.score} flag={item.flag || 'none'} />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{item.project_name || '—'}</p>
          <p className="truncate text-xs text-muted-foreground">{item.client_name || 'No client'} · {computedStr}</p>
        </div>

        {reasons.length > 0 && (
          <button onClick={() => setExpanded((v) => !v)} className="shrink-0 p-1 text-muted-foreground hover:text-foreground">
            {expanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
          </button>
        )}

        {isAdmin && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 px-2 text-xs"
            disabled={recomputing}
            onClick={() => onRecompute(item.project_id)}
          >
            <IconRefresh size={12} className={recomputing ? 'animate-spin' : ''} />
            Recompute
          </Button>
        )}
      </div>

      {expanded && reasons.length > 0 && (
        <ul className="ml-12 mt-2 flex flex-col gap-1">
          {reasons.map((reason, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <span>·</span>
              {reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function HealthScoresPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const [scores, setScores] = useState([])
  const [summary, setSummary] = useState({ green_count: 0, amber_count: 0, red_count: 0 })
  const [sentiment, setSentiment] = useState([])
  const [loading, setLoading] = useState(true)
  const [recomputingId, setRecomputingId] = useState(null)
  const [expandedClient, setExpandedClient] = useState(null)
  const [clientMessages, setClientMessages] = useState([])
  const [messagesLoading, setMessagesLoading] = useState(false)

  const fetchData = useCallback(() => {
    setLoading(true)
    Promise.allSettled([
      healthScoresApi.list(),
      healthScoresApi.agencyAverage(),
      clientsApi.sentiment(),
    ])
      .then(([listRes, avgRes, sentRes]) => {
        if (listRes.status === 'fulfilled') setScores(listRes.value.data.data || [])
        if (avgRes.status === 'fulfilled') setSummary(avgRes.value.data.data || { green_count: 0, amber_count: 0, red_count: 0 })
        if (sentRes.status === 'fulfilled') setSentiment(sentRes.value.data.data || [])
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  const handleRecompute = async (projectId) => {
    setRecomputingId(projectId)
    try {
      await healthScoresApi.compute(projectId)
      fetchData()
    } catch {
      // ignore
    } finally {
      setRecomputingId(null)
    }
  }

  const handleClientClick = async (client) => {
    if (expandedClient === client.client_id) {
      setExpandedClient(null)
      setClientMessages([])
      return
    }

    setExpandedClient(client.client_id)
    setMessagesLoading(true)

    try {
      const projectsRes = await projectsApi.index()
      const projects = (projectsRes.data.data?.projects || projectsRes.data.data || []).filter(
        (p) => p.client?.company_name === client.client_name || p.client_id === client.client_id
      )

      const allMessages = []
      for (const project of projects.slice(0, 3)) {
        try {
          const msgRes = await messagesApi.index(project.id)
          const msgs = (msgRes.data.data || []).map((m) => ({ ...m, project_name: project.name }))
          allMessages.push(...msgs)
        } catch {
          // skip
        }
      }

      allMessages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      setClientMessages(allMessages)
    } catch {
      setClientMessages([])
    } finally {
      setMessagesLoading(false)
    }
  }

  const sentimentTextClass = (label) => {
    if (label === 'positive') return 'text-emerald-600'
    if (label === 'negative') return 'text-red-500'
    return 'text-amber-600'
  }

  return (
    <PageWrapper>
      <div className="sd-page">
        <PageHeader title="Health Scores" subtitle="Rule-based project risk scoring, recomputed every 6 hours." />

        <div className="grid grid-cols-3 gap-3">
          {loading ? (
            <>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </>
          ) : (
            <>
              <SummaryCard label="Green — on track" count={summary.green_count} flag="green" />
              <SummaryCard label="Amber — at risk" count={summary.amber_count} flag="amber" />
              <SummaryCard label="Red — critical" count={summary.red_count} flag="red" />
            </>
          )}
        </div>

        <div className="sd-card">
          <div className="sd-card-header">
            <p className="sd-card-title">Project health scores</p>
          </div>
          <div className="sd-card-body--flush">
            {loading ? (
              <div className="flex flex-col gap-2 p-4">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : scores.length === 0 ? (
              <div className="px-4 pb-4 text-sm text-muted-foreground">No active projects found.</div>
            ) : (
              scores.map((item) => (
                <HealthScoreProjectRow
                  key={item.project_id}
                  item={item}
                  isAdmin={isAdmin}
                  onRecompute={handleRecompute}
                  recomputing={recomputingId === item.project_id}
                />
              ))
            )}
          </div>
        </div>

        <div className="sd-card">
          <div className="sd-card-header">
            <p className="sd-card-title">Client sentiment timeline</p>
          </div>
          <div className="sd-card-body--flush">
            {loading ? (
              <div className="flex flex-col gap-2 p-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : sentiment.length === 0 ? (
              <div className="px-4 pb-4 text-sm text-muted-foreground">No clients found.</div>
            ) : (
              sentiment.map((item, i) => (
                <div key={item.client_id}>
                  <div
                    onClick={() => item.latest_score !== null && handleClientClick(item)}
                    className={item.latest_score !== null ? 'cursor-pointer px-4' : 'px-4'}
                  >
                    <SentimentRow
                      item={{
                        client: { id: item.client_id, company_name: item.client_name },
                        score: item.latest_score ?? 0,
                        label: item.label || 'neutral',
                        last_message_date: item.last_message_at,
                        at_risk: item.at_risk,
                        no_messages: item.latest_score === null,
                      }}
                      isLast={i === sentiment.length - 1 && expandedClient !== item.client_id}
                    />
                  </div>

                  {expandedClient === item.client_id && (
                    <div className="px-4 pb-3 pl-14">
                      {messagesLoading ? (
                        <Skeleton className="h-10 w-full" />
                      ) : clientMessages.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No messages yet.</p>
                      ) : (
                        clientMessages.map((msg) => (
                          <div key={msg.id} className="border-b border-border py-1.5 text-xs last:border-b-0">
                            <div className="mb-0.5 flex justify-between">
                              <span className="text-muted-foreground">{msg.project_name}</span>
                              <span className={`font-medium ${sentimentTextClass(msg.sentiment_label)}`}>
                                {msg.sentiment_score != null
                                  ? `${msg.sentiment_score >= 0 ? '+' : ''}${Number(msg.sentiment_score).toFixed(2)} ${msg.sentiment_label}`
                                  : 'Pending'}
                              </span>
                            </div>
                            <p>{msg.body}</p>
                            <p className="mt-0.5 text-muted-foreground">
                              {new Date(msg.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
