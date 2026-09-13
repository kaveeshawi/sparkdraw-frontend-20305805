import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  aiApi,
  alertsApi,
  healthScoresApi,
  invoicesApi,
  projectsApi,
  timeOverviewApi,
  upsellApi,
} from '@/services/api'
import { getProgressPct } from '@/components/projects/project-utils'

function unwrap(res) {
  return res?.data?.data ?? res?.data ?? null
}

function initials(name = '') {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('') || '?'
}

function flagToStatus(flag, projectStatus) {
  if (projectStatus === 'completed' || projectStatus === 'done') return 'completed'
  if (projectStatus === 'on_hold' || projectStatus === 'paused') return 'on_hold'
  if (flag === 'amber' || flag === 'red') return 'at_risk'
  return 'on_track'
}

function daysMeta(due) {
  if (!due) return { daysLabel: 'No due date', daysTone: 'muted', daysLeft: null }
  const dueDate = new Date(due)
  if (Number.isNaN(dueDate.getTime())) return { daysLabel: 'No due date', daysTone: 'muted', daysLeft: null }
  const diff = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return { daysLabel: `${Math.abs(diff)}d overdue`, daysTone: 'danger', daysLeft: diff }
  if (diff <= 7) return { daysLabel: `${diff}d left`, daysTone: 'warn', daysLeft: diff }
  return { daysLabel: `${diff}d left`, daysTone: 'ok', daysLeft: diff }
}

function mapProject(p) {
  const health = p.health_score?.score
  const flag = p.health_score?.flag
  const progress = getProgressPct(p)
  const milestone = p.next_milestone
  const teamMembers = p.team_members || []
  const team = teamMembers.map((m) => initials(m.name))
  const taskCounts = p.task_counts || {}
  const tasksLeft = Math.max(0, Number(taskCounts.total || 0) - Number(taskCounts.done || 0))
  const inProgress = Number(taskCounts.in_progress || 0)
  const due = milestone?.due_date || p.end_date
  const { daysLabel, daysTone, daysLeft } = daysMeta(due)
  const taskTotal = Number(taskCounts.total || 0)

  return {
    id: p.id,
    name: p.name,
    category: p.type || 'Project',
    client: p.client?.company_name || '—',
    color: p.color || '#802AEE',
    health: health == null ? null : Number(health),
    flag: flag || null,
    progress,
    hasTasks: taskTotal > 0,
    milestone: milestone?.title || null,
    tasksLeft,
    inProgress,
    dueDate: due
      ? new Date(due).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      : '—',
    daysLabel,
    daysTone,
    daysLeft,
    status: flagToStatus(flag, p.status),
    rawStatus: p.status,
    team,
    extraTeam: Math.max(0, team.length - 3),
  }
}

function relativeTime(iso) {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diff = Date.now() - t
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${Math.max(1, mins)}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function useDashboardData({
  includeAgencyFeed = true,
  includeFinance = true,
} = {}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [projects, setProjects] = useState([])
  const [summary, setSummary] = useState({ total: 0, active: 0, completed: 0, at_risk: 0 })
  const [health, setHealth] = useState(null)
  const [revenue, setRevenue] = useState(null)
  const [presence, setPresence] = useState(null)
  const [timeOverview, setTimeOverview] = useState(null)
  const [upsells, setUpsells] = useState([])
  const [alerts, setAlerts] = useState([])
  const [credits, setCredits] = useState(null)

  const refresh = useCallback(() => {
    setLoading(true)
    setError(null)

    const requests = [
      projectsApi.index(),
      includeAgencyFeed ? healthScoresApi.agencyAverage() : Promise.reject(new Error('skip')),
      includeFinance ? invoicesApi.revenue() : Promise.reject(new Error('skip')),
      includeAgencyFeed ? timeOverviewApi.teamPresence() : Promise.reject(new Error('skip')),
      timeOverviewApi.get(),
      includeAgencyFeed ? upsellApi.index() : Promise.reject(new Error('skip')),
      includeAgencyFeed ? alertsApi.index(12) : Promise.reject(new Error('skip')),
      includeAgencyFeed || includeFinance ? aiApi.credits() : Promise.reject(new Error('skip')),
    ]

    return Promise.allSettled(requests).then(([
      projRes, healthRes, revRes, presenceRes, timeRes, upsellRes, alertRes, creditRes,
    ]) => {
      if (projRes.status === 'fulfilled') {
        const data = unwrap(projRes.value) || {}
        const list = Array.isArray(data) ? data : data.projects || []
        setProjects(list.map(mapProject))
        setSummary(
          data.summary || {
            total: list.length,
            active: list.filter((p) => ['active', 'started'].includes(p.status)).length,
            completed: list.filter((p) => p.status === 'completed').length,
            at_risk: 0,
          },
        )
      } else {
        setProjects([])
        setError('Could not load projects')
      }

      setHealth(healthRes.status === 'fulfilled' ? unwrap(healthRes.value) : null)
      setRevenue(revRes.status === 'fulfilled' ? unwrap(revRes.value) : null)
      setPresence(presenceRes.status === 'fulfilled' ? unwrap(presenceRes.value) : null)
      setTimeOverview(timeRes.status === 'fulfilled' ? unwrap(timeRes.value) : null)
      setUpsells(
        upsellRes.status === 'fulfilled'
          ? (unwrap(upsellRes.value) || [])
          : [],
      )
      setAlerts(
        alertRes.status === 'fulfilled'
          ? (unwrap(alertRes.value) || [])
          : [],
      )
      setCredits(creditRes.status === 'fulfilled' ? unwrap(creditRes.value) : null)
    }).finally(() => setLoading(false))
  }, [includeAgencyFeed, includeFinance])

  useEffect(() => {
    refresh()
  }, [refresh])

  const tasksInProgress = useMemo(
    () => projects.reduce((sum, p) => sum + Number(p.inProgress || 0), 0),
    [projects],
  )

  const focusItems = useMemo(() => {
    const dueSoon = [...projects]
      .filter((p) => p.daysLeft != null && p.daysLeft <= 7 && p.status !== 'completed')
      .sort((a, b) => (a.daysLeft ?? 99) - (b.daysLeft ?? 99))
      .slice(0, 3)
      .map((p) => ({
        id: `due-${p.id}`,
        label: `${p.name} — ${p.daysLabel}`,
        href: `/projects/${p.id}/kanban`,
        done: false,
        tone: p.daysTone,
      }))

    const risks = includeAgencyFeed
      ? (health?.at_risk_projects || []).slice(0, 2).map((p) => ({
          id: `risk-${p.id}`,
          label: `Review health: ${p.name} (${p.flag})`,
          href: '/ai-studio?section=health',
          done: false,
          tone: p.flag === 'red' ? 'danger' : 'warn',
        }))
      : []

    return [...dueSoon, ...risks].slice(0, 4)
  }, [projects, health, includeAgencyFeed])

  const activityItems = useMemo(() => {
    if (!includeAgencyFeed) return []

    const alertLabels = {
      health_score_critical: 'Health critical',
      revision_risk_detected: 'Revision risk',
      client_sentiment_declining: 'Sentiment declining',
      deadline_at_risk: 'Deadline at risk',
      ai_ticket_generated: 'AI ticket generated',
    }
    const alertTones = {
      health_score_critical: 'danger',
      revision_risk_detected: 'warn',
      client_sentiment_declining: 'danger',
      deadline_at_risk: 'warn',
      ai_ticket_generated: 'info',
    }

    const fromAlerts = (Array.isArray(alerts) ? alerts : []).slice(0, 8).map((a, i) => {
      const label = alertLabels[a.event_type] || String(a.event_type || 'Alert').replace(/_/g, ' ')
      const project = a.project_name ? ` · ${a.project_name}` : ''
      const meta = a.metadata || {}
      const detail =
        meta.score != null
          ? ` (score ${meta.score})`
          : meta.message
            ? ` — ${meta.message}`
            : meta.task
              ? ` — ${meta.task}`
              : ''
      return {
        id: a.id || `alert-${i}`,
        text: `${label}${project}${detail}`,
        time: relativeTime(a.created_at),
        tone: alertTones[a.event_type] || 'info',
      }
    })

    if (fromAlerts.length) return fromAlerts

    return projects.slice(0, 5).map((p) => ({
      id: `proj-${p.id}`,
      text: `${p.name} · ${p.progress}% complete · ${p.daysLabel}`,
      time: String(p.status || '').replace('_', ' '),
      tone: p.status === 'at_risk' ? 'warn' : 'info',
    }))
  }, [alerts, projects, includeAgencyFeed])

  const pendingUpsells = useMemo(
    () => (Array.isArray(upsells) ? upsells : []).filter(
      (u) => !u.admin_status || u.admin_status === 'pending',
    ),
    [upsells],
  )

  return {
    loading,
    error,
    projects,
    summary,
    health,
    revenue,
    presence,
    timeOverview,
    upsells,
    pendingUpsells,
    alerts,
    credits,
    focusItems,
    activityItems,
    refresh,
    tasksInProgress,
  }
}
