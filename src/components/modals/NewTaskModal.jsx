import { useState, useEffect } from 'react'
import { IconCheck, IconSparkles } from '@tabler/icons-react'
import Modal from '../legacy-ui/Modal'
import { Input, Textarea, Select } from '../legacy-ui/Input'
import Avatar from '../legacy-ui/Avatar'
import { tasksApi, milestonesApi, aiApi } from '../../services/api'

// TODO Session 5.x — replace with real users API
const MOCK_TEAM = [
  { id: 1, name: 'Morgan Lee',  role: 'admin' },
  { id: 2, name: 'Jordan Kim',  role: 'pm' },
  { id: 3, name: 'Alex Chen',   role: 'member' },
]

// TODO Session 5.x — replace with real milestones API
const MOCK_MILESTONES = [
  { id: 1, title: 'Design Phase' },
  { id: 2, title: 'Development' },
  { id: 3, title: 'UAT & Launch' },
]

const EMPTY_FORM = {
  name:            '',
  description:     '',
  priority:        'med',
  status:          'todo',
  estimated_hours: '',
  deadline:        '',
  milestone_id:    '',
}

export default function NewTaskModal({ open, onClose, projectId, projectType = 'general', defaultStatus = 'todo', onCreated }) {
  const [form, setForm]           = useState({ ...EMPTY_FORM, status: defaultStatus })
  const [assignees, setAssignees] = useState([])
  const [milestones, setMilestones] = useState(MOCK_MILESTONES)
  const [estimating, setEstimating] = useState(false)
  const [estimateReasoning, setEstimateReasoning] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors]       = useState({})

  // Reset form when modal opens or defaultStatus changes
  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY_FORM, status: defaultStatus })
      setAssignees([])
      setErrors({})
      setEstimateReasoning('')
    }
  }, [open, defaultStatus])

  // Fetch milestones
  useEffect(() => {
    if (!open || !projectId) return
    milestonesApi
      .index(projectId)
      .then((res) => setMilestones(res.data.data || []))
      .catch(() => setMilestones(MOCK_MILESTONES))
  }, [open, projectId])

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const toggleAssignee = (userId) => {
    setAssignees((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const handleEstimate = async () => {
    if (!form.name) return
    setEstimating(true)
    setEstimateReasoning('')
    try {
      const res = await aiApi.estimateHours({
        task_title:       form.name,
        task_description: form.description || '',
        project_type:     projectType,
      })
      const data = res.data.data
      if (data?.hours) {
        setForm((f) => ({ ...f, estimated_hours: String(data.hours) }))
        if (data.reasoning) {
          setEstimateReasoning(`Estimated ${data.hours}h — ${data.reasoning}`)
        }
      }
    } catch {
      // silently fail — user can enter manually
    } finally {
      setEstimating(false)
    }
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Task name is required'
    return e
  }

  const handleSubmit = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSubmitting(true)
    try {
      await tasksApi.store(projectId, {
        title:           form.name,
        description:     form.description || null,
        priority:        form.priority,
        status:          form.status,
        estimated_hours: form.estimated_hours ? Number(form.estimated_hours) : null,
        deadline:        form.deadline || null,
        milestone_id:    form.milestone_id || null,
        assignee_ids:    assignees,
      })
      onCreated?.()
      onClose?.()
    } catch (err) {
      const apiErrors = err.response?.data?.errors || {}
      setErrors(apiErrors)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={IconCheck}
      title="Create new task"
      subtitle="Add a task to the project board"
      footer={
        <>
          <button
            onClick={onClose}
            style={{
              padding: '7px 14px',
              border: '1px solid var(--field-border)',
              borderRadius: 'var(--radius-lg)',
              fontSize: '12px',
              color: 'var(--text-muted)',
              background: '#fff',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              padding: '7px 16px',
              background: submitting ? 'var(--primary-mid)' : 'var(--primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-lg)',
              fontSize: '12px',
              fontWeight: 500,
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {submitting ? 'Creating…' : 'Create task'}
          </button>
        </>
      }
    >
      {/* Task name */}
      <Input
        label="Task name"
        required
        placeholder="e.g. Design homepage wireframes"
        value={form.name}
        onChange={set('name')}
        error={errors.name}
      />

      {/* Description */}
      <Textarea
        label="Description"
        placeholder="Optional — add context for the team"
        value={form.description}
        onChange={set('description')}
        style={{ minHeight: '64px' }}
      />

      {/* Priority + Status row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <Select label="Priority" value={form.priority} onChange={set('priority')}>
          <option value="low">Low</option>
          <option value="med">Medium</option>
          <option value="high">High</option>
        </Select>
        <Select label="Status" value={form.status} onChange={set('status')}>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="in_review">In Review</option>
          <option value="done">Done</option>
        </Select>
      </div>

      {/* Estimated hours + Deadline row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <Input
          label="Estimated hours"
          type="number"
          min="0"
          placeholder="e.g. 8"
          value={form.estimated_hours}
          onChange={set('estimated_hours')}
        />
        <Input
          label="Deadline"
          type="date"
          value={form.deadline}
          onChange={set('deadline')}
        />
      </div>

      {estimateReasoning && (
        <div style={{ fontSize: '10px', color: 'var(--primary)', marginTop: '-4px' }}>
          {estimateReasoning}
        </div>
      )}

      {/* Milestone */}
      <Select label="Milestone" value={form.milestone_id} onChange={set('milestone_id')}>
        <option value="">— No milestone —</option>
        {milestones.map((m) => (
          <option key={m.id} value={m.id}>{m.title}</option>
        ))}
      </Select>

      {/* Assignee avatar picker */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)' }}>
          Assignee
        </label>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {MOCK_TEAM.map((member) => {
            const selected = assignees.includes(member.id)
            return (
              <button
                key={member.id}
                onClick={() => toggleAssignee(member.id)}
                title={member.name}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '0',
                  cursor: 'pointer',
                  borderRadius: '50%',
                  outline: selected ? `2px solid var(--primary)` : '2px solid transparent',
                  outlineOffset: '2px',
                  opacity: assignees.length > 0 && !selected ? 0.45 : 1,
                  transition: 'opacity 0.12s, outline-color 0.12s',
                }}
              >
                <Avatar name={member.name} role={member.role} size="sm" />
              </button>
            )
          })}
          {assignees.length > 0 && (
            <span style={{ fontSize: '10px', color: 'var(--text-hint)' }}>
              {MOCK_TEAM.filter((m) => assignees.includes(m.id)).map((m) => m.name.split(' ')[0]).join(', ')}
            </span>
          )}
        </div>
      </div>

      {/* AI hour estimator strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '9px 12px',
          background: 'linear-gradient(135deg, #fdfcff, #f3e8ff)',
          border: '1px solid #e9d5ff',
          borderRadius: '9px',
        }}
      >
        <IconSparkles size={15} color="var(--primary)" style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, fontSize: '11px', color: '#374151', lineHeight: 1.4 }}>
          <span style={{ color: 'var(--primary)', fontWeight: 500 }}>AI hour estimator</span>
          {' '}— estimate hours based on task type automatically
        </div>
        <button
          onClick={handleEstimate}
          disabled={estimating || !form.name}
          style={{
            fontSize: '10px',
            padding: '4px 10px',
            borderRadius: 'var(--radius-lg)',
            background: estimating || !form.name ? 'var(--primary-mid)' : 'var(--primary)',
            color: '#fff',
            border: 'none',
            fontWeight: 500,
            cursor: estimating || !form.name ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-sans)',
            whiteSpace: 'nowrap',
          }}
        >
          {estimating ? 'Estimating…' : 'Estimate ✦'}
        </button>
      </div>
    </Modal>
  )
}
