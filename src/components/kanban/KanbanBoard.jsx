import { useEffect, useState, useCallback } from 'react'
import { tasksApi } from '../../services/api'
import KanbanColumn from './KanbanColumn'

const COLUMNS = [
  { id: 'todo',        label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'in_review',   label: 'In Review' },
  { id: 'done',        label: 'Done' },
]

// TODO Session 5.2 — replace mock with real API
const MOCK_TASKS = {
  todo: [
    {
      id: 1, title: 'Design homepage wireframes', type: 'ui', priority: 'high', status: 'todo',
      description: 'Create low-fidelity wireframes for the main landing page sections',
      estimated_hours: 8, subtasks: [{ id: 1, title: 'Create sketches', done: true }, { id: 2, title: 'Digital mockup', done: false }, { id: 3, title: 'Client review', done: false }],
      assignees: [{ name: 'Alex Chen', role: 'member' }], comment_count: 2, attachment_count: 1,
    },
    {
      id: 2, title: 'Set up project repository', type: 'dev', priority: 'med', status: 'todo',
      description: null, estimated_hours: 2, subtasks: [],
      assignees: [{ name: 'Jordan Kim', role: 'pm' }], comment_count: 0, attachment_count: 0,
    },
  ],
  in_progress: [
    {
      id: 3, title: 'Implement user authentication', type: 'dev', priority: 'high', status: 'in_progress',
      description: 'JWT-based auth with refresh tokens and role-based access checks',
      estimated_hours: 16, subtasks: [{ id: 4, title: 'Auth routes', done: true }, { id: 5, title: 'Token storage', done: true }, { id: 6, title: 'Role middleware', done: false }, { id: 7, title: 'Tests', done: false }],
      assignees: [{ name: 'Alex Chen', role: 'member' }], comment_count: 5, attachment_count: 0,
    },
    {
      id: 4, title: 'Typography and spacing review', type: 'ui', priority: 'low', status: 'in_progress',
      description: null, estimated_hours: 3, subtasks: [],
      assignees: [{ name: 'Morgan Lee', role: 'admin' }], comment_count: 1, attachment_count: 2,
    },
  ],
  in_review: [
    {
      id: 5, title: 'Color palette final approval', type: 'design', priority: 'med', status: 'in_review',
      description: 'Review brand color choices with the client before production',
      estimated_hours: 1, subtasks: [{ id: 8, title: 'Present options', done: true }],
      assignees: [{ name: 'Jordan Kim', role: 'pm' }], comment_count: 3, attachment_count: 4,
    },
  ],
  done: [
    {
      id: 6, title: 'Project kickoff meeting', type: 'research', priority: 'low', status: 'done',
      description: 'Initial team alignment and scope discussion',
      estimated_hours: 2, subtasks: [{ id: 9, title: 'Agenda prep', done: true }, { id: 10, title: 'Notes published', done: true }],
      assignees: [{ name: 'Morgan Lee', role: 'admin' }, { name: 'Alex Chen', role: 'member' }],
      comment_count: 0, attachment_count: 1,
    },
  ],
}

export default function KanbanBoard({ projectId, onTaskClick, onAddTask }) {
  const [tasksByStatus, setTasksByStatus] = useState(MOCK_TASKS)
  const [loading, setLoading]             = useState(false)

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
    // Optimistic update: move card between columns immediately
    setTasksByStatus((prev) => {
      const allTasks = COLUMNS.flatMap((col) => prev[col.id] || [])
      const task     = allTasks.find((t) => t.id === taskId)
      if (!task) return prev
      const next = {}
      COLUMNS.forEach((col) => {
        next[col.id] = (prev[col.id] || []).filter((t) => t.id !== taskId)
      })
      next[newStatus] = [...(next[newStatus] || []), { ...task, status: newStatus }]
      return next
    })

    tasksApi.updateStatus(projectId, taskId, newStatus).catch(() => {
      fetchTasks() // revert on failure
    })
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">
        Loading tasks…
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto overflow-y-hidden pb-2">
      {COLUMNS.map((col) => (
        <KanbanColumn
          key={col.id}
          column={col}
          tasks={tasksByStatus[col.id] || []}
          onTaskClick={onTaskClick}
          onAddTask={onAddTask}
          onStatusChange={handleStatusChange}
        />
      ))}
    </div>
  )
}
