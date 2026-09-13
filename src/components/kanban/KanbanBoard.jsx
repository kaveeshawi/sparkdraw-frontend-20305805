import { useEffect, useMemo, useState, useCallback } from 'react'
import { IconFilter, IconSearch, IconSparkles } from '@tabler/icons-react'
import { Input } from '@/components/ui/input'
import { tasksApi } from '../../services/api'
import KanbanColumn from './KanbanColumn'

const COLUMNS = [
  { id: 'todo',        label: 'To Do',       tone: 'rose' },
  { id: 'in_progress', label: 'In Progress', tone: 'peach' },
  { id: 'in_review',   label: 'In Review',   tone: 'sky' },
  { id: 'done',        label: 'Done',        tone: 'mint' },
]

const MOCK_TASKS = {
  todo: [
    {
      id: 1, title: 'Design notification banner', type: 'ui', priority: 'medium', status: 'todo',
      description: 'Ensure it adapts well across mobile breakpoints.',
      estimated_hours: 8,
      subtasks: [{ id: 1, title: 'Sketch', done: true }, { id: 2, title: 'Mock', done: false }, { id: 3, title: 'Review', done: false }],
      assignees: [{ name: 'Alex Chen', role: 'member' }], comment_count: 2, attachment_count: 1,
    },
    {
      id: 2, title: 'Set up project repository', type: 'dev', priority: 'low', status: 'todo',
      description: 'Init repo, branch strategy, and CI basics.',
      estimated_hours: 2, subtasks: [],
      assignees: [{ name: 'Jordan Kim', role: 'pm' }], comment_count: 0, attachment_count: 0,
    },
  ],
  in_progress: [
    {
      id: 3, title: 'API endpoint mapping', type: 'dev', priority: 'high', status: 'in_progress',
      description: 'Map auth and project routes for the client portal.',
      estimated_hours: 16,
      subtasks: [
        { id: 4, title: 'Auth routes', done: true },
        { id: 5, title: 'Token storage', done: true },
        { id: 6, title: 'Role middleware', done: false },
        { id: 7, title: 'Tests', done: false },
      ],
      assignees: [{ name: 'Alex Chen', role: 'member' }], comment_count: 5, attachment_count: 0,
    },
  ],
  in_review: [
    {
      id: 5, title: 'Color palette final approval', type: 'design', priority: 'medium', status: 'in_review',
      description: 'Review brand color choices with the client before production.',
      estimated_hours: 1,
      subtasks: [{ id: 8, title: 'Present options', done: true }],
      assignees: [{ name: 'Jordan Kim', role: 'pm' }], comment_count: 3, attachment_count: 4,
    },
  ],
  done: [
    {
      id: 6, title: 'Project kickoff meeting', type: 'research', priority: 'low', status: 'done',
      description: 'Initial team alignment and scope discussion.',
      estimated_hours: 2,
      subtasks: [{ id: 9, title: 'Agenda prep', done: true }, { id: 10, title: 'Notes published', done: true }],
      assignees: [{ name: 'Morgan Lee', role: 'admin' }, { name: 'Alex Chen', role: 'member' }],
      comment_count: 0, attachment_count: 1,
    },
  ],
}

const SORT_OPTIONS = [
  { id: 'stage', label: 'Stage' },
  { id: 'priority', label: 'Priority' },
  { id: 'title', label: 'Title' },
]

const PRIORITY_RANK = { high: 0, medium: 1, med: 1, low: 2 }

export default function KanbanBoard({ projectId, onTaskClick, onAddTask }) {
  const [tasksByStatus, setTasksByStatus] = useState(MOCK_TASKS)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('stage')
  const [priorityFilter, setPriorityFilter] = useState('all')

  const fetchTasks = useCallback(() => {
    if (!projectId) return
    setLoading(true)
    tasksApi
      .byStatus(projectId)
      .then((res) => {
        const data = res.data.data
        if (data && !Array.isArray(data)) {
          setTasksByStatus(data)
        } else if (Array.isArray(data)) {
          const grouped = COLUMNS.reduce((acc, col) => { acc[col.id] = []; return acc }, {})
          data.forEach((t) => { if (grouped[t.status]) grouped[t.status].push(t) })
          setTasksByStatus(grouped)
        }
      })
      .catch((err) => {
        if (err.response?.status === 404) setTasksByStatus(MOCK_TASKS)
      })
      .finally(() => setLoading(false))
  }, [projectId])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const handleStatusChange = (taskId, newStatus) => {
    setTasksByStatus((prev) => {
      const allTasks = COLUMNS.flatMap((col) => prev[col.id] || [])
      const task = allTasks.find((t) => t.id === taskId)
      if (!task) return prev
      const next = {}
      COLUMNS.forEach((col) => {
        next[col.id] = (prev[col.id] || []).filter((t) => t.id !== taskId)
      })
      next[newStatus] = [...(next[newStatus] || []), { ...task, status: newStatus }]
      return next
    })

    tasksApi.updateStatus(projectId, taskId, newStatus).catch(() => {
      fetchTasks()
    })
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    const next = {}
    COLUMNS.forEach((col) => {
      let list = [...(tasksByStatus[col.id] || [])]
      if (q) list = list.filter((t) => String(t.title || '').toLowerCase().includes(q)
        || String(t.description || '').toLowerCase().includes(q))
      if (priorityFilter !== 'all') {
        list = list.filter((t) => {
          const p = String(t.priority || '').toLowerCase()
          if (priorityFilter === 'medium') return p === 'medium' || p === 'med'
          return p === priorityFilter
        })
      }
      if (sortBy === 'priority') {
        list.sort((a, b) => (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9))
      } else if (sortBy === 'title') {
        list.sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')))
      }
      next[col.id] = list
    })
    return next
  }, [tasksByStatus, search, sortBy, priorityFilter])

  const aiHint = useMemo(() => {
    const review = (tasksByStatus.in_review || []).length
    const blockedHigh = (tasksByStatus.todo || []).filter((t) => t.priority === 'high').length
    if (review >= 3) return `${review} tasks waiting in review — consider unblocking the queue.`
    if (blockedHigh >= 2) return `${blockedHigh} high-priority items still in To Do.`
    return null
  }, [tasksByStatus])

  if (loading) {
    return (
      <div className="sd-kanban-loading">
        Loading board…
      </div>
    )
  }

  return (
    <div className="sd-kanban">
      <div className="sd-kanban-toolbar">
        <div className="sd-kanban-search">
          <IconSearch size={15} stroke={1.75} />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search task"
            className="sd-kanban-search__input"
          />
        </div>

        <div className="sd-kanban-toolbar__actions">
          <label className="sd-kanban-sort">
            <span>Sort by:</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </label>

          <label className="sd-kanban-filter">
            <IconFilter size={14} stroke={1.75} />
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="all">Filter</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
        </div>
      </div>

      {aiHint ? (
        <div className="sd-kanban-ai">
          <IconSparkles size={14} />
          <span>{aiHint}</span>
        </div>
      ) : null}

      <div className="sd-kanban-board">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            column={col}
            tasks={visible[col.id] || []}
            onTaskClick={onTaskClick}
            onAddTask={onAddTask}
            onStatusChange={handleStatusChange}
          />
        ))}
      </div>
    </div>
  )
}
