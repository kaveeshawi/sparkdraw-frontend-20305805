import { useCallback, useEffect, useMemo, useState } from 'react'
import { healthScoresApi, invoicesApi, projectsApi } from '@/services/api'
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
  if (!due) return { daysLabel: 'No due date', daysTone: 'muted' }
  const dueDate = new Date(due)
  if (Number.isNaN(dueDate.getTime())) return { daysLabel: 'No due date', daysTone: 'muted' }
  const diff = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return { daysLabel: `${Math.abs(diff)}d overdue`, daysTone: 'danger' }
  if (diff <= 7) return { daysLabel: `${diff}d left`, daysTone: 'warn' }
  return { daysLabel: `${diff}d left`, daysTone: 'ok' }
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
  const { daysLabel, daysTone } = daysMeta(due)
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
    status: flagToStatus(flag, p.status),
    rawStatus: p.status,
    team,
    extraTeam: Math.max(0, team.length - 3),
  }
}

export default function useDashboardData() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [projects, setProjects] = useState([])
  const [summary, setSummary] = useState({ total: 0, active: 0, completed: 0, at_risk: 0 })
  const [health, setHealth] = useState(null)
  const [revenue, setRevenue] = useState(null)

  const refresh = useCallback(() => {
    setLoading(true)
    setError(null)
    return Promise.allSettled([
      projectsApi.index(),
      healthScoresApi.agencyAverage(),
      invoicesApi.revenue(),
    ]).then(([projRes, healthRes, revRes]) => {
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
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const tasksInProgress = useMemo(
    () => projects.reduce((sum, p) => sum + Number(p.inProgress || 0), 0),
    [projects],
  )

  return {
    loading,
    error,
    projects,
    summary,
    health,
    revenue,
    refresh,
    tasksInProgress,
  }
}
