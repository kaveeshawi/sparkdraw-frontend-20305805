import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  IconAlertTriangle, IconCalendarDue, IconCheck, IconChecklist, IconClock,
  IconFolderPlus, IconLayoutKanban, IconList, IconPlayerPlay, IconPlus,
  IconRefresh, IconSearch, IconUsers, IconUserOff, IconX,
} from '@tabler/icons-react'
import PageWrapper from '../components/layout/PageWrapper'
import PageHeader from '../components/layout/PageHeader'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import TeamSelect from '../components/team/TeamSelect'
import { displayMemberName, ROLE_LABELS } from '../components/team/team-utils'
import AddTaskModal from '../components/tasks/AddTaskModal'
import TasksProductivityPanel from '../components/tasks/TasksProductivityPanel'
import NewProjectModal from '../components/modals/NewProjectModal'
import { projectsApi, tasksApi, teamApi } from '../services/api'
import useAuthStore from '../store/authStore'
import { getInitials } from '@/lib/utils'
import { memberPhotoSrc } from '@/lib/media'

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'todo', label: 'To do' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'in_review', label: 'In review' },
  { id: 'done', label: 'Done' },
  { id: 'overdue', label: 'Overdue' },
]

const BOARD_COLUMNS = [
  { id: 'todo', label: 'To do' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'in_review', label: 'In review' },
  { id: 'done', label: 'Done' },
]

const SORT_OPTIONS = [
  { id: 'deadline', label: 'Deadline' },
  { id: 'priority', label: 'Priority' },
  { id: 'recent', label: 'Recently updated' },
  { id: 'name_asc', label: 'Name A–Z' },
]

const STATUS_BADGE = {
  todo: 'outline',
  in_progress: 'info',
  in_review: 'warning',
  done: 'success',
}

const PRIORITY_BADGE = {
  low: 'success',
  medium: 'warning',
  high: 'destructive',
}

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 }

function formatDue(task) {
  if (!task.deadline) return null
  const label = new Date(task.deadline).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
  if (task.is_overdue && task.status !== 'done') return `Overdue · ${label}`
  return `Due ${label}`
}

function isDueThisWeek(task) {
  if (!task.deadline) return false
  const due = new Date(task.deadline)
  const now = new Date()
  const end = new Date()
  end.setDate(now.getDate() + 7)
  return due >= now && due <= end
}

function sortTasks(list, sortBy) {
  const next = [...list]
  next.sort((a, b) => {
    if (sortBy === 'name_asc') {
      return String(a.title || '').localeCompare(String(b.title || ''))
    }
    if (sortBy === 'priority') {
      return (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9)
    }
    if (sortBy === 'recent') {
      return new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)
    }
    const ad = a.deadline ? new Date(a.deadline).getTime() : Number.POSITIVE_INFINITY
    const bd = b.deadline ? new Date(b.deadline).getTime() : Number.POSITIVE_INFINITY
    return ad - bd
  })
  return next
}

function TaskListRow({ task, showAssignee }) {
  const due = formatDue(task)
  return (
    <Link to={`/projects/${task.project_id}/kanban`} className="sd-tasks-row">
      <span
        className="sd-tasks-row__dot"
        style={{ background: task.project?.color || 'var(--primary)' }}
      />
      <div className="sd-tasks-row__body">
        <strong title={task.title}>{task.title}</strong>
        <p>
          {task.project?.name || 'Unknown project'}
          {showAssignee && task.assignee?.name ? ` · ${task.assignee.name}` : ''}
        </p>
      </div>
      {due ? (
        <span className={`sd-tasks-row__due${task.is_overdue && task.status !== 'done' ? ' is-late' : ''}`}>
          {due}
        </span>
      ) : (
        <span className="sd-tasks-row__due is-muted">No deadline</span>
      )}
      <Badge variant={PRIORITY_BADGE[task.priority] || 'outline'} className="shrink-0 capitalize">
        {task.priority || '—'}
      </Badge>
      <Badge variant={STATUS_BADGE[task.status] || 'outline'} className="shrink-0 capitalize">
        {String(task.status || '').replace('_', ' ')}
      </Badge>
    </Link>
  )
}

function TaskBoardCard({ task, showAssignee }) {
  const due = formatDue(task)
  return (
    <Link to={`/projects/${task.project_id}/kanban`} className="sd-tasks-card">
      <div className="sd-tasks-card__top">
        <span
          className="sd-tasks-row__dot"
          style={{ background: task.project?.color || 'var(--primary)' }}
        />
        <Badge variant={PRIORITY_BADGE[task.priority] || 'outline'} className="capitalize">
          {task.priority || '—'}
        </Badge>
      </div>
      <strong title={task.title}>{task.title}</strong>
      <p>
        {task.project?.name || 'Unknown project'}
        {showAssignee && task.assignee?.name ? ` · ${task.assignee.name}` : ''}
      </p>
      {due ? (
        <span className={`sd-tasks-card__due${task.is_overdue && task.status !== 'done' ? ' is-late' : ''}`}>
          {due}
        </span>
      ) : null}
    </Link>
  )
}

function TaskResults({
  loading,
  error,
  filtered,
  viewMode,
  showAssignee,
  canManage,
  filterId,
  search,
  onAddTask,
  groupedByMember,
}) {
  if (loading) {
    return (
      <div className="sd-card p-4 flex flex-col gap-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="sd-card px-6 py-14 text-center text-sm text-muted-foreground">
        Failed to load tasks.
      </div>
    )
  }

  if (filtered.length === 0) {
    return (
      <div className="sd-card">
        <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <IconClock size={22} stroke={1.5} />
          </div>
          <p className="text-sm font-medium">Nothing here</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            {filterId === 'all' && !search
              ? canManage
                ? 'No tasks for this team member or project filter.'
                : "You don't have any tasks assigned yet."
              : 'No tasks match this filter.'}
          </p>
          {canManage ? (
            <Button
              type="button"
              className="sd-header-new-project sd-btn-gradient mt-1 rounded-full border-0 shadow-none"
              onClick={onAddTask}
            >
              <IconPlus size={16} />
              Add task
            </Button>
          ) : null}
        </div>
      </div>
    )
  }

  if (viewMode === 'board') {
    return (
      <div className="sd-tasks-board">
        {BOARD_COLUMNS.map((col) => {
          const colTasks = filtered.filter((t) => t.status === col.id)
          return (
            <section key={col.id} className="sd-tasks-board__col">
              <header className="sd-tasks-board__head">
                <strong>{col.label}</strong>
                <span>{colTasks.length}</span>
              </header>
              <div className="sd-tasks-board__list">
                {colTasks.map((task) => (
                  <TaskBoardCard key={task.id} task={task} showAssignee={showAssignee} />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    )
  }

  if (groupedByMember?.length) {
    return (
      <div className="sd-tasks-member-groups">
        {groupedByMember.map((group) => (
          <section key={group.key} className="sd-card p-0 overflow-hidden sd-tasks-member-group">
            <header className="sd-tasks-member-group__head">
              <div className="sd-tasks-member-group__who">
                {group.photo ? (
                  <Avatar className="size-8">
                    <AvatarImage src={group.photo} alt={group.name} />
                    <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                      {getInitials(group.name)}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <span className="sd-tasks-member-group__icon">
                    {group.key === 'unassigned' ? <IconUserOff size={16} /> : <IconUsers size={16} />}
                  </span>
                )}
                <div className="min-w-0">
                  <strong>{group.name}</strong>
                  {group.role ? <p>{group.role}</p> : null}
                </div>
              </div>
              <span className="sd-tasks-member-group__count">{group.tasks.length}</span>
            </header>
            {group.tasks.map((task) => (
              <TaskListRow key={task.id} task={task} showAssignee={false} />
            ))}
          </section>
        ))}
      </div>
    )
  }

  return (
    <div className="sd-card p-0 overflow-hidden">
      {filtered.map((task) => (
        <TaskListRow key={task.id} task={task} showAssignee={showAssignee} />
      ))}
    </div>
  )
}

export default function TasksPage() {
  const user = useAuthStore((s) => s.user)
  const canManage = user?.role === 'admin' || user?.role === 'pm'

  const [tasks, setTasks] = useState([])
  const [members, setMembers] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [filterId, setFilterId] = useState('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('deadline')
  const [viewMode, setViewMode] = useState('list')
  const [assigneeId, setAssigneeId] = useState('') // '' = everyone, 'unassigned', or member id
  const [projectId, setProjectId] = useState('')
  const [memberSearch, setMemberSearch] = useState('')
  const [showAddTask, setShowAddTask] = useState(false)
  const [showNewProject, setShowNewProject] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const loadTasks = () => {
    setLoading(true)
    setError(false)
    const params = {
      // Admin/PM: always load full team list; member filter is client-side (Clockify-style)
      mine_only: canManage ? 0 : 1,
    }
    if (projectId) params.project_id = projectId

    tasksApi
      .mine(params)
      .then((res) => {
        const raw = res.data.data
        setTasks(Array.isArray(raw) ? raw : (raw?.data ?? []))
      })
      .catch(() => {
        setError(true)
        setTasks([])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadTasks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage, projectId, refreshKey])

  useEffect(() => {
    if (!canManage) return
    teamApi
      .index()
      .then((res) => setMembers((res.data.data || []).filter((m) => m.role !== 'client')))
      .catch(() => setMembers([]))
  }, [canManage])

  useEffect(() => {
    projectsApi
      .index()
      .then((res) => {
        const raw = res.data.data
        setProjects(Array.isArray(raw) ? raw : (raw?.projects ?? []))
      })
      .catch(() => setProjects([]))
  }, [refreshKey])

  const projectOptions = useMemo(
    () => [
      { value: '', label: 'All projects' },
      ...projects.map((p) => ({
        value: String(p.id),
        label: p.name,
      })),
    ],
    [projects],
  )

  const taskCountByMember = useMemo(() => {
    const map = new Map()
    let unassigned = 0
    for (const t of tasks) {
      const id = t.assignee?.id ?? t.assignee_id
      if (!id) {
        unassigned += 1
        continue
      }
      map.set(Number(id), (map.get(Number(id)) || 0) + 1)
    }
    return { map, unassigned }
  }, [tasks])

  const teamSidebar = useMemo(() => {
    const q = memberSearch.trim().toLowerCase()
    const rows = members
      .map((m) => ({
        id: String(m.id),
        name: displayMemberName(m),
        role: ROLE_LABELS[m.role] || m.role || 'Team',
        photo: memberPhotoSrc(m),
        count: taskCountByMember.map.get(Number(m.id)) || 0,
        member: m,
      }))
      .filter((row) => !q || row.name.toLowerCase().includes(q) || row.role.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))

    return rows
  }, [members, memberSearch, taskCountByMember])

  const scopedTasks = useMemo(() => {
    if (!canManage || !assigneeId) return tasks
    if (assigneeId === 'unassigned') {
      return tasks.filter((t) => !(t.assignee?.id ?? t.assignee_id))
    }
    const id = Number(assigneeId)
    return tasks.filter((t) => Number(t.assignee?.id ?? t.assignee_id) === id)
  }, [tasks, canManage, assigneeId])

  const counts = useMemo(() => {
    const c = {
      all: scopedTasks.length,
      todo: 0,
      in_progress: 0,
      in_review: 0,
      done: 0,
      overdue: 0,
    }
    for (const t of scopedTasks) {
      if (c[t.status] != null) c[t.status] += 1
      if (t.is_overdue && t.status !== 'done') c.overdue += 1
    }
    return c
  }, [scopedTasks])

  const dueThisWeek = useMemo(
    () => scopedTasks.filter((t) => t.status !== 'done' && isDueThisWeek(t)).length,
    [scopedTasks],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = [...scopedTasks]

    if (filterId === 'overdue') {
      list = list.filter((t) => t.is_overdue && t.status !== 'done')
    } else if (filterId !== 'all') {
      list = list.filter((t) => t.status === filterId)
    }

    if (q) {
      list = list.filter((t) => {
        const hay = `${t.title || ''} ${t.project?.name || ''} ${t.assignee?.name || ''}`.toLowerCase()
        return hay.includes(q)
      })
    }

    return sortTasks(list, sortBy)
  }, [scopedTasks, filterId, search, sortBy])

  const groupedByMember = useMemo(() => {
    if (!canManage || assigneeId || viewMode !== 'list') return null

    const byId = new Map()
    const unassigned = []

    for (const task of filtered) {
      const id = task.assignee?.id ?? task.assignee_id
      if (!id) {
        unassigned.push(task)
        continue
      }
      const key = String(id)
      if (!byId.has(key)) byId.set(key, [])
      byId.get(key).push(task)
    }

    const groups = []
    for (const member of members) {
      const key = String(member.id)
      const list = byId.get(key)
      if (!list?.length) continue
      groups.push({
        key,
        name: displayMemberName(member),
        role: ROLE_LABELS[member.role] || member.role || 'Team',
        photo: memberPhotoSrc(member),
        tasks: list,
      })
      byId.delete(key)
    }

    // Assignees not in current team list (edge case)
    for (const [key, list] of byId.entries()) {
      groups.push({
        key,
        name: list[0]?.assignee?.name || `Member #${key}`,
        role: list[0]?.assignee?.role || '',
        photo: '',
        tasks: list,
      })
    }

    if (unassigned.length) {
      groups.push({
        key: 'unassigned',
        name: 'Unassigned',
        role: 'No owner yet',
        photo: '',
        tasks: unassigned,
      })
    }

    return groups
  }, [canManage, assigneeId, viewMode, filtered, members])

  const selectedMember = useMemo(() => {
    if (!assigneeId || assigneeId === 'unassigned') return null
    return members.find((m) => String(m.id) === String(assigneeId)) || null
  }, [assigneeId, members])

  const sortLabel = SORT_OPTIONS.find((o) => o.id === sortBy)?.label || 'Deadline'
  const showAssignee = canManage && !assigneeId && viewMode === 'board'
  const bump = () => setRefreshKey((n) => n + 1)

  const viewTitle = !canManage
    ? 'Your tasks'
    : assigneeId === 'unassigned'
      ? 'Unassigned'
      : selectedMember
        ? displayMemberName(selectedMember)
        : 'Everyone'

  return (
    <PageWrapper
      pageActions={
        <div className="sd-float-page-header__bar sd-page-toolbar sd-page-toolbar--team">
          <PageHeader
            title="Tasks"
            subtitle={
              canManage
                ? 'Browse work by team member — Clockify-style team view'
                : 'Everything assigned to you across projects'
            }
          />
          <div className="sd-page-actions">
            <Button type="button" variant="outline" className="rounded-full" onClick={bump}>
              <IconRefresh size={16} />
              Refresh
            </Button>
            {canManage ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setShowNewProject(true)}
                >
                  <IconFolderPlus size={16} />
                  New project
                </Button>
                <Button
                  type="button"
                  className="sd-header-new-project sd-btn-gradient inline-flex shrink-0 border-0 shadow-none"
                  onClick={() => setShowAddTask(true)}
                >
                  <IconPlus size={16} />
                  Add task
                </Button>
              </>
            ) : (
              <Button
                asChild
                variant="default"
                className="sd-header-new-project sd-btn-gradient inline-flex shrink-0 border-0 shadow-none"
              >
                <Link to="/projects">
                  <IconLayoutKanban size={16} />
                  Open projects
                </Link>
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="sd-page sd-page--team sd-tasks-page sd-animate-in">
        <div className="sd-team-kpi">
          <div className="sd-stat-tile sd-team-kpi__card">
            <div className="sd-team-kpi__top">
              <div>
                <p className="sd-stat-tile__label">Total tasks</p>
                <p className="sd-stat-tile__value">{counts.all}</p>
                <p className="sd-team-kpi__hint">{viewTitle}</p>
              </div>
              <span className="sd-team-kpi__icon sd-team-kpi__icon--blue">
                <IconChecklist size={18} stroke={1.75} />
              </span>
            </div>
          </div>
          <div className="sd-stat-tile sd-team-kpi__card">
            <div className="sd-team-kpi__top">
              <div>
                <p className="sd-stat-tile__label">In progress</p>
                <p className="sd-stat-tile__value">{counts.in_progress}</p>
                <p className="sd-team-kpi__hint">Actively being worked</p>
              </div>
              <span className="sd-team-kpi__icon sd-team-kpi__icon--indigo">
                <IconPlayerPlay size={18} stroke={1.75} />
              </span>
            </div>
          </div>
          <div className="sd-stat-tile sd-team-kpi__card">
            <div className="sd-team-kpi__top">
              <div>
                <p className="sd-stat-tile__label">Overdue</p>
                <p className="sd-stat-tile__value">{counts.overdue}</p>
                <p className="sd-team-kpi__hint">Needs attention</p>
              </div>
              <span className="sd-team-kpi__icon sd-team-kpi__icon--rose">
                <IconAlertTriangle size={18} stroke={1.75} />
              </span>
            </div>
          </div>
          <div className="sd-stat-tile sd-team-kpi__card">
            <div className="sd-team-kpi__top">
              <div>
                <p className="sd-stat-tile__label">Due this week</p>
                <p className="sd-stat-tile__value">{dueThisWeek}</p>
                <p className="sd-team-kpi__hint">Next 7 days</p>
              </div>
              <span className="sd-team-kpi__icon sd-team-kpi__icon--amber">
                <IconCalendarDue size={18} stroke={1.75} />
              </span>
            </div>
          </div>
        </div>

        <TasksProductivityPanel refreshKey={refreshKey} />

        <div className={`sd-tasks-layout${canManage ? ' sd-tasks-layout--team' : ''}`}>
          {canManage ? (
            <aside className="sd-card sd-tasks-team-rail">
              <div className="sd-tasks-team-rail__head">
                <h2>Team</h2>
                <p>Select a member to view their tasks</p>
                <div className="sd-tasks-team-rail__search">
                  <IconSearch size={14} stroke={1.75} />
                  <input
                    type="search"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search members…"
                    aria-label="Search team members"
                  />
                </div>
              </div>

              <div className="sd-tasks-team-rail__list" role="listbox" aria-label="Team members">
                <button
                  type="button"
                  role="option"
                  aria-selected={!assigneeId}
                  className={`sd-tasks-team-rail__item${!assigneeId ? ' is-active' : ''}`}
                  onClick={() => setAssigneeId('')}
                >
                  <span className="sd-tasks-team-rail__avatar sd-tasks-team-rail__avatar--all">
                    <IconUsers size={16} stroke={1.75} />
                  </span>
                  <span className="sd-tasks-team-rail__meta">
                    <strong>Everyone</strong>
                    <span>All team tasks</span>
                  </span>
                  <span className="sd-tasks-team-rail__count">{tasks.length}</span>
                </button>

                {taskCountByMember.unassigned > 0 ? (
                  <button
                    type="button"
                    role="option"
                    aria-selected={assigneeId === 'unassigned'}
                    className={`sd-tasks-team-rail__item${assigneeId === 'unassigned' ? ' is-active' : ''}`}
                    onClick={() => setAssigneeId('unassigned')}
                  >
                    <span className="sd-tasks-team-rail__avatar sd-tasks-team-rail__avatar--none">
                      <IconUserOff size={16} stroke={1.75} />
                    </span>
                    <span className="sd-tasks-team-rail__meta">
                      <strong>Unassigned</strong>
                      <span>Needs an owner</span>
                    </span>
                    <span className="sd-tasks-team-rail__count">{taskCountByMember.unassigned}</span>
                  </button>
                ) : null}

                {teamSidebar.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    role="option"
                    aria-selected={assigneeId === row.id}
                    className={`sd-tasks-team-rail__item${assigneeId === row.id ? ' is-active' : ''}`}
                    onClick={() => setAssigneeId(row.id)}
                  >
                    <Avatar className="size-9 shrink-0">
                      {row.photo ? <AvatarImage src={row.photo} alt={row.name} /> : null}
                      <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                        {getInitials(row.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="sd-tasks-team-rail__meta">
                      <strong>{row.name}</strong>
                      <span>{row.role}</span>
                    </span>
                    <span className="sd-tasks-team-rail__count">{row.count}</span>
                  </button>
                ))}

                {teamSidebar.length === 0 ? (
                  <p className="sd-tasks-team-rail__empty">No members match this search.</p>
                ) : null}
              </div>
            </aside>
          ) : null}

          <div className="sd-tasks-main">
            <div className="sd-tasks-main__title">
              <div className="min-w-0">
                <h2>{viewTitle}</h2>
                <p>
                  {canManage
                    ? assigneeId
                      ? `${filtered.length} task${filtered.length === 1 ? '' : 's'} for this person`
                      : 'Tasks grouped by team member'
                    : 'Your assigned work'}
                </p>
              </div>
            </div>

            <div className="sd-team-toolbar sd-tasks-toolbar">
              <div className="sd-team-search">
                <IconSearch size={16} stroke={1.75} className="sd-team-search__icon" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search tasks or projects…"
                  className="sd-team-search__input"
                />
                {search ? (
                  <button
                    type="button"
                    className="sd-team-search__clear"
                    onClick={() => setSearch('')}
                    aria-label="Clear search"
                  >
                    <IconX size={14} />
                  </button>
                ) : null}
              </div>

              <div className="sd-tasks-filters">
                <TeamSelect
                  value={projectId}
                  onValueChange={setProjectId}
                  options={projectOptions}
                  placeholder="All projects"
                  aria-label="Filter by project"
                  className="sd-tasks-filter-select"
                />
              </div>

              <div className="sd-client-filters" role="group" aria-label="Filter tasks">
                {STATUS_FILTERS.map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    className={`sd-client-filter${filterId === pill.id ? ' is-active' : ''}`}
                    onClick={() => setFilterId(pill.id)}
                  >
                    {pill.label}
                    {counts[pill.id] ? ` · ${counts[pill.id]}` : ''}
                  </button>
                ))}
              </div>

              <div className="sd-team-toolbar__right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className="sd-team-toolbar__sort">
                      Sort by: <strong>{sortLabel}</strong>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="sd-soft-dropdown w-48 p-1.5 border-0">
                    {SORT_OPTIONS.map((opt) => (
                      <DropdownMenuItem
                        key={opt.id}
                        className="cursor-pointer gap-2 rounded-lg"
                        onClick={() => setSortBy(opt.id)}
                      >
                        <span className="flex-1">{opt.label}</span>
                        {sortBy === opt.id ? <IconCheck size={14} className="text-primary" /> : null}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="sd-team-view-toggle" role="group" aria-label="View mode">
                  <button
                    type="button"
                    className={viewMode === 'list' ? 'is-active' : undefined}
                    aria-pressed={viewMode === 'list'}
                    onClick={() => setViewMode('list')}
                    title="List view"
                  >
                    <IconList size={16} />
                  </button>
                  <button
                    type="button"
                    className={viewMode === 'board' ? 'is-active' : undefined}
                    aria-pressed={viewMode === 'board'}
                    onClick={() => setViewMode('board')}
                    title="Board view"
                  >
                    <IconLayoutKanban size={16} />
                  </button>
                </div>
              </div>
            </div>

            <TaskResults
              loading={loading}
              error={error}
              filtered={filtered}
              viewMode={viewMode}
              showAssignee={showAssignee}
              canManage={canManage}
              filterId={filterId}
              search={search}
              onAddTask={() => setShowAddTask(true)}
              groupedByMember={groupedByMember}
            />
          </div>
        </div>
      </div>

      {canManage ? (
        <>
          <AddTaskModal
            open={showAddTask}
            onClose={() => setShowAddTask(false)}
            projects={projects}
            members={members}
            initialAssigneeId={
              assigneeId && assigneeId !== 'unassigned' ? assigneeId : ''
            }
            onCreated={bump}
          />
          <NewProjectModal
            open={showNewProject}
            onClose={() => setShowNewProject(false)}
            onCreated={() => {
              bump()
              setShowNewProject(false)
            }}
          />
        </>
      ) : null}
    </PageWrapper>
  )
}
