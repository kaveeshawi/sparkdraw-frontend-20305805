export const FILTER_PILLS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'at_risk', label: 'At risk' },
  { id: 'on_hold', label: 'On hold' },
  { id: 'completed', label: 'Completed' },
]

export const STATUS_LABELS = {
  active: 'Active',
  completed: 'Completed',
  on_hold: 'On hold',
  cancelled: 'Cancelled',
}

export const HEALTH_FLAG_LABELS = {
  green: 'Good',
  amber: 'Fair',
  red: 'At risk',
}

export const TRACK_STATUS_LABELS = {
  green: 'On Track',
  amber: 'At Risk',
  red: 'Critical',
}

const TYPE_LABELS = {
  web: 'Web Development',
  branding: 'Branding',
  marketing: 'Marketing',
  mobile: 'Mobile App',
  design: 'Design',
  other: 'Other',
}

export function formatProjectType(type) {
  if (!type) return 'Project'
  const key = String(type).toLowerCase()
  return TYPE_LABELS[key] || String(type).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function getProjectHealth(project) {
  return project?.health_score || project?.latest_health_score || null
}

export function getProgressPct(project) {
  const raw = project?.progress_pct ?? project?.progress_percent ?? project?.progress ?? 0
  const n = Number(raw)
  if (Number.isNaN(n)) return 0
  return Math.min(100, Math.max(0, Math.round(n)))
}

export function getTaskCounts(project) {
  const counts = project?.task_counts
  if (counts && typeof counts === 'object') {
    const total = Number(counts.total ?? 0)
    const done = Number(counts.done ?? 0)
    return {
      total,
      done,
      open: Math.max(0, total - done),
    }
  }
  const total = Number(project?.tasks_count ?? project?.tasks_total ?? 0)
  const open = Number(project?.tasks_open ?? total)
  return { total, done: Math.max(0, total - open), open }
}

export function isProjectAtRisk(project) {
  const flag = getProjectHealth(project)?.flag
  return flag === 'amber' || flag === 'red'
}

export function matchesProjectFilter(project, filterId) {
  if (filterId === 'all') return true
  if (filterId === 'at_risk') return isProjectAtRisk(project)
  if (filterId === 'active') return project?.status === 'active'
  if (filterId === 'on_hold') return project?.status === 'on_hold'
  if (filterId === 'completed') return project?.status === 'completed'
  return true
}

export function formatProjectDue(dateStr) {
  if (!dateStr) return null
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return String(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function isPastDue(dateStr) {
  if (!dateStr) return false
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)
  return date < today
}

export function progressFillClass(progress) {
  if (progress >= 70) return 'bg-[#E85D26]'
  if (progress >= 40) return 'bg-amber-500'
  return 'bg-red-500'
}

export function statusPillClass(status) {
  switch (status) {
    case 'active':
      return 'bg-[var(--color-bg-success)] text-[var(--color-text-success)]'
    case 'on_hold':
      return 'bg-amber-50 text-amber-700'
    case 'completed':
      return 'border border-[var(--color-border)] bg-[var(--color-surface-1)] text-[var(--color-text-muted)]'
    case 'cancelled':
      return 'bg-[var(--color-bg-danger)] text-[var(--color-text-danger)]'
    default:
      return 'bg-[var(--color-surface-1)] text-[var(--color-text-muted)]'
  }
}

export function healthDotClass(flag) {
  if (flag === 'green') return 'bg-emerald-500'
  if (flag === 'amber') return 'bg-amber-500'
  if (flag === 'red') return 'bg-red-500'
  return 'bg-slate-300'
}

/** Map API project → ProjectsTab row shape */
export function toProjectsTabRow(project) {
  const health = getProjectHealth(project)
  const tasks = getTaskCounts(project)
  const flag = health?.flag
  let healthKey = 'good'
  if (flag === 'amber') healthKey = 'fair'
  if (flag === 'red') healthKey = 'at_risk'

  return {
    id: project.id,
    name: project.name,
    status: project.status === 'on_hold' ? 'delayed' : project.status,
    due_date: project.end_date,
    tasks_open: tasks.open,
    tasks_total: tasks.total,
    progress: getProgressPct(project),
    health: healthKey,
    health_label: HEALTH_FLAG_LABELS[flag] || health?.flag || '—',
  }
}

export function alertBadgeForProject(alertsByProjectId, projectId) {
  const list = alertsByProjectId?.[projectId] || []
  if (!list.length) return null
  const revision = list.find((a) => a.event_type === 'revision_risk_detected')
  if (revision) return { label: 'Scope risk', tone: 'amber' }
  const deadline = list.find((a) => a.event_type === 'deadline_at_risk')
  if (deadline) return { label: 'Deadline risk', tone: 'amber' }
  const critical = list.find((a) => a.event_type === 'health_score_critical')
  if (critical) return { label: 'Health alert', tone: 'red' }
  return { label: 'AI alert', tone: 'amber' }
}
