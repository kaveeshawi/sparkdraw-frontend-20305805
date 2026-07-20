import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  IconAlertTriangle, IconBrain, IconClock, IconHeartRateMonitor,
  IconMoodSad, IconSparkles, IconTicket,
} from '@tabler/icons-react'
import PageWrapper from '../components/layout/PageWrapper'
import PageHeader from '../components/layout/PageHeader'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import useAuthStore from '../store/authStore'
import { healthScoresApi, upsellApi, alertsApi, clientsApi } from '../services/api'
import { getInitials } from '@/lib/utils'

const FLAG_ORDER = { red: 0, amber: 1, green: 2 }

const FLAG_BOX = {
  green: 'bg-green-50 text-green-700 dark:bg-green-900/70 dark:text-white/80',
  amber: 'bg-orange-50 text-orange-700 dark:bg-orange-900/70 dark:text-white/80',
  red: 'bg-red-50 text-red-700 dark:bg-red-900/70 dark:text-white/80',
}

const ALERT_CONFIG = {
  health_score_critical: { className: 'bg-red-50 text-red-700 dark:bg-red-900/70 dark:text-white/80', label: 'Health critical', Icon: IconHeartRateMonitor },
  revision_risk_detected: { className: 'bg-orange-50 text-orange-700 dark:bg-orange-900/70 dark:text-white/80', label: 'Revision risk', Icon: IconAlertTriangle },
  client_sentiment_declining: { className: 'bg-red-50 text-red-700 dark:bg-red-900/70 dark:text-white/80', label: 'Sentiment declining', Icon: IconMoodSad },
  deadline_at_risk: { className: 'bg-orange-50 text-orange-700 dark:bg-orange-900/70 dark:text-white/80', label: 'Deadline at risk', Icon: IconClock },
  ai_ticket_generated: { className: 'bg-primary/10 text-primary', label: 'AI ticket generated', Icon: IconTicket },
}

function timeAgo(dateStr) {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function SectionCard({ title, action, children }) {
  return (
    <div className="sd-card">
      <div className="sd-card-header">
        <p className="sd-card-title">{title}</p>
        {action}
      </div>
      <div className="sd-card-body--flush px-2 pb-2">{children}</div>
    </div>
  )
}

export default function AIStudioPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const [agencyAvg, setAgencyAvg] = useState(null)
  const [healthList, setHealthList] = useState([])
  const [upsells, setUpsells] = useState([])
  const [sentiment, setSentiment] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [recomputing, setRecomputing] = useState(false)
  const [actionId, setActionId] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    Promise.allSettled([
      healthScoresApi.agencyAverage(),
      healthScoresApi.list(),
      upsellApi.index({ status: 'pending' }),
      clientsApi.sentiment(),
      alertsApi.index(15),
    ]).then(([avgRes, listRes, upsellRes, sentRes, alertRes]) => {
      if (avgRes.status === 'fulfilled') setAgencyAvg(avgRes.value.data.data)
      if (listRes.status === 'fulfilled') {
        const sorted = [...(listRes.value.data.data || [])].sort((a, b) => {
          const fa = FLAG_ORDER[a.flag] ?? 3
          const fb = FLAG_ORDER[b.flag] ?? 3
          return fa - fb || (a.score ?? 0) - (b.score ?? 0)
        })
        setHealthList(sorted)
      }
      if (upsellRes.status === 'fulfilled') setUpsells(upsellRes.value.data.data || [])
      if (sentRes.status === 'fulfilled') setSentiment(sentRes.value.data.data || [])
      if (alertRes.status === 'fulfilled') setAlerts(alertRes.value.data.data || [])
      setLoading(false)
    })
  }, [])

  useEffect(() => { load() }, [load])

  const handleRecomputeAll = async () => {
    setRecomputing(true)
    try {
      await healthScoresApi.computeAll()
      load()
    } finally {
      setRecomputing(false)
    }
  }

  const handleUpsell = async (id, action) => {
    setActionId(id)
    try {
      if (action === 'approve') await upsellApi.approve(id)
      else await upsellApi.reject(id)
      setUpsells((prev) => prev.filter((u) => u.id !== id))
    } finally {
      setActionId(null)
    }
  }

  const alertCount = alerts.length
  const atRiskClients = sentiment.filter((c) => c.at_risk)

  return (
    <PageWrapper>
      <div className="sd-page">
        <PageHeader title="AI Insights" subtitle="Predictive intelligence across all agency projects." />

        {/* Top overview cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-primary p-4 text-primary-foreground shadow-[var(--sd-shadow-card)]">
            {loading ? <Skeleton className="h-12 w-full bg-primary-foreground/20" /> : (
              <>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-semibold">{agencyAvg?.average_score ?? '—'}</span>
                  <span className="text-xs opacity-80">/100</span>
                </div>
                <p className="mt-1 text-xs opacity-80">Agency health avg</p>
              </>
            )}
          </div>

          <div className="sd-card p-4">
            {loading ? <Skeleton className="h-12 w-full" /> : (
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-lg font-semibold text-green-600">{agencyAvg?.green_count ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground">Green</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-orange-600">{agencyAvg?.amber_count ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground">Amber</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-red-500">{agencyAvg?.red_count ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground">Red</p>
                </div>
              </div>
            )}
            <p className="mt-2 text-xs text-muted-foreground">Projects by flag</p>
          </div>

          <div className="sd-card p-4">
            {loading ? <Skeleton className="h-12 w-full" /> : (
              <div className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-900/70 dark:text-white/80">
                  <IconBrain size={18} />
                </div>
                <div>
                  <p className="text-xl font-semibold">{alertCount}</p>
                  <p className="text-[10px] text-muted-foreground">Active AI alerts</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Middle row */}
        <div className="grid gap-3 lg:grid-cols-2">
          <SectionCard
            title="Projects by Health"
            action={
              isAdmin && (
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled={recomputing} onClick={handleRecomputeAll}>
                  {recomputing ? '…' : 'Recompute all'}
                </Button>
              )
            }
          >
            {loading ? (
              <div className="flex flex-col gap-2 p-2">
                <Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" />
              </div>
            ) : healthList.length === 0 ? (
              <p className="p-2 text-sm text-muted-foreground">No health scores yet.</p>
            ) : (
              healthList.map((hs) => (
                <div
                  key={hs.project_id}
                  className={`flex items-center gap-2.5 rounded-lg p-2 ${hs.flag === 'red' ? 'bg-red-50 dark:bg-red-950/40' : ''}`}
                >
                  <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-medium ${FLAG_BOX[hs.flag] || 'bg-primary/10 text-primary'}`}>
                    {hs.score ?? '—'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{hs.project_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {hs.client_name}{hs.reasons?.[0] ? ` · ${hs.reasons[0]}` : ''}
                    </p>
                  </div>
                  <Link to={`/projects/${hs.project_id}/kanban`} className="shrink-0 text-xs font-medium text-primary hover:underline">
                    View
                  </Link>
                </div>
              ))
            )}
          </SectionCard>

          <SectionCard title="Pending AI Actions">
            {loading ? (
              <Skeleton className="h-16 w-full" />
            ) : upsells.length === 0 ? (
              <p className="p-2 text-sm text-muted-foreground">No pending upsell suggestions.</p>
            ) : (
              upsells.map((u) => (
                <div key={u.id} className="mb-2 rounded-lg border border-border bg-muted/30 p-2.5 last:mb-0">
                  <div className="mb-1 flex items-center gap-1.5">
                    <IconSparkles size={14} className="text-primary" />
                    <span className="text-sm font-medium">{u.client_name}</span>
                    <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                      {Math.round(u.confidence * 100)}%
                    </Badge>
                  </div>
                  <p className="mb-2 text-xs text-muted-foreground capitalize">Recommend: {u.service_type?.replace('_', ' ')}</p>
                  {isAdmin && (
                    <div className="flex gap-1.5">
                      <Button size="sm" className="h-7 px-2.5 text-xs" disabled={actionId === u.id} onClick={() => handleUpsell(u.id, 'approve')}>
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs" disabled={actionId === u.id} onClick={() => handleUpsell(u.id, 'reject')}>
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </SectionCard>
        </div>

        {/* Bottom row */}
        <div className="grid gap-3 lg:grid-cols-2">
          <SectionCard title="At-Risk Clients (Sentiment)">
            {loading ? (
              <Skeleton className="h-10 w-full" />
            ) : atRiskClients.length === 0 ? (
              <p className="p-2 text-sm text-muted-foreground">All clients showing positive sentiment.</p>
            ) : (
              atRiskClients.map((c) => (
                <div key={c.client_id} className="flex items-center gap-2.5 border-t border-border px-2 py-2 first:border-t-0">
                  <Avatar className="size-9 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                      {getInitials(c.client_name || 'Client')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.client_name}</p>
                    <p className="truncate text-xs text-muted-foreground">Last message {timeAgo(c.last_message_at)}</p>
                  </div>
                  <div className="h-1 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-red-500"
                      style={{ width: `${Math.max(0, ((c.latest_score ?? 0) + 1) / 2) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </SectionCard>

          <SectionCard title="Recent AI Alerts Feed">
            {loading ? (
              <Skeleton className="h-16 w-full" />
            ) : alerts.length === 0 ? (
              <p className="p-2 text-sm text-muted-foreground">No recent alerts.</p>
            ) : (
              alerts.map((a) => {
                const cfg = ALERT_CONFIG[a.event_type] || ALERT_CONFIG.ai_ticket_generated
                const AlertIcon = cfg.Icon
                return (
                  <div key={a.id} className="flex items-start gap-2.5 border-t border-border px-2 py-2 first:border-t-0">
                    <div className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${cfg.className}`}>
                      <AlertIcon size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{cfg.label}</p>
                      <p className="truncate text-xs text-muted-foreground">{a.project_name || 'Agency'} · {timeAgo(a.created_at)}</p>
                    </div>
                  </div>
                )
              })
            )}
          </SectionCard>
        </div>
      </div>
    </PageWrapper>
  )
}
