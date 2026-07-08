import { useState } from 'react'
import { IconX, IconCalendar, IconListCheck, IconPaperclip, IconMessage, IconClock, IconChartBar, IconActivity, IconPlus } from '@tabler/icons-react'
import Badge from '../legacy-ui/Badge'
import Avatar from '../legacy-ui/Avatar'

const STATUS_VARIANT = {
  todo:        'muted',
  in_progress: 'active',
  in_review:   'warning',
  done:        'success',
}
const STATUS_LABEL = {
  todo:        'To Do',
  in_progress: 'In Progress',
  in_review:   'In Review',
  done:        'Done',
}
const PRIORITY_VARIANT = {
  high: 'priority-high', medium: 'priority-med', med: 'priority-med', low: 'priority-low',
}

// TODO Session 5.x — replace with real activity log from project_events
const MOCK_ACTIVITIES = [
  { type: 'status', from: 'todo', to: 'in_progress', user: { name: 'Alex Chen', role: 'member' }, time: '2 hours ago' },
  { type: 'subtask', subtask: 'Create sketches', user: { name: 'Alex Chen', role: 'member' }, time: '3 hours ago' },
  { type: 'comment', text: 'Starting on the wireframes now', user: { name: 'Jordan Kim', role: 'pm' }, time: 'Yesterday' },
]

const TABS = [
  { id: 'subtasks',    label: 'Subtasks',    icon: IconListCheck },
  { id: 'attachments', label: 'Attachments', icon: IconPaperclip },
  { id: 'comments',    label: 'Comments',    icon: IconMessage },
  { id: 'timelog',     label: 'Time log',    icon: IconClock },
]

function MetaRow({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
      <span
        style={{
          width: '100px',
          flexShrink: 0,
          fontSize: '11px',
          color: 'var(--text-hint)',
          paddingTop: '1px',
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, fontSize: '12px', color: 'var(--text-secondary)' }}>
        {children}
      </div>
    </div>
  )
}

function Divider() {
  return <div style={{ height: '0.5px', background: 'var(--border-inner)', margin: '10px 0' }} />
}

function SubtaskRow({ subtask, onToggle }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '5px 6px',
        borderRadius: 'var(--radius-md)',
        background: hovered ? 'var(--card-bg-soft)' : 'transparent',
        border: hovered ? '0.5px solid var(--border-inner)' : '0.5px solid transparent',
        cursor: 'pointer',
      }}
      onClick={() => onToggle(subtask.id)}
    >
      {/* Checkbox */}
      <div
        style={{
          width: '14px',
          height: '14px',
          borderRadius: '4px',
          border: subtask.done ? 'none' : '1.5px solid var(--border)',
          background: subtask.done ? 'var(--primary)' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'background 0.12s',
        }}
      >
        {subtask.done && (
          <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
            <path d="M2 5L4 7L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span
        style={{
          fontSize: '12px',
          color: subtask.done ? '#9ca3af' : 'var(--text-secondary)',
          textDecoration: subtask.done ? 'line-through' : 'none',
          flex: 1,
        }}
      >
        {subtask.title}
      </span>
    </div>
  )
}

export default function TaskDetailModal({ open, task, onClose }) {
  const [activeTab, setActiveTab]     = useState('subtasks')
  const [subtasks, setSubtasks]       = useState([])
  const [newSubtask, setNewSubtask]   = useState('')
  const [addingSubtask, setAddingSubtask] = useState(false)

  // Sync subtasks from task when task changes
  const resolvedSubtasks = subtasks.length > 0 || !task ? subtasks : (task?.subtasks || [])

  const toggleSubtask = (id) => {
    const list = resolvedSubtasks.map((s) =>
      s.id === id ? { ...s, done: !s.done } : s
    )
    setSubtasks(list)
    // TODO Session 5.x — call PATCH /projects/{id}/tasks/{taskId}/subtasks/{id}
  }

  const addSubtask = () => {
    if (!newSubtask.trim()) return
    const newItem = { id: Date.now(), title: newSubtask.trim(), done: false }
    setSubtasks([...resolvedSubtasks, newItem])
    setNewSubtask('')
    setAddingSubtask(false)
    // TODO Session 5.x — call POST /projects/{id}/tasks/{taskId}/subtasks
  }

  if (!open || !task) return null

  const doneSubs   = resolvedSubtasks.filter((s) => s.done).length
  const totalSubs  = resolvedSubtasks.length
  const progress   = totalSubs > 0 ? Math.round((doneSubs / totalSubs) * 100) : 0
  const logged     = task.logged_hours || 0
  const estimated  = task.estimated_hours || 0
  const remaining  = Math.max(0, estimated - logged)
  const burnRatio  = estimated > 0 ? logged / estimated : 0

  const healthVariant = burnRatio >= 0.9 ? 'danger' : burnRatio >= 0.7 ? 'warning' : 'success'
  const healthLabel   = burnRatio >= 0.9 ? 'High risk' : burnRatio >= 0.7 ? 'Medium risk' : 'Low risk'

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(17,17,42,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '20px',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 'var(--radius-2xl)',
          width: '100%',
          maxWidth: '780px',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-modal)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 40px)',
        }}
      >
        {/* Split body */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', flex: 1, overflow: 'hidden' }}>

          {/* ── LEFT PANEL ── */}
          <div
            style={{
              padding: '18px 20px',
              borderRight: '0.5px solid var(--border-inner)',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Close button + title row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ fontSize: '18px', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.2, flex: 1 }}>
                {task.title}
              </div>
              <button
                onClick={onClose}
                style={{
                  width: '28px', height: '28px',
                  borderRadius: 'var(--radius-md)',
                  border: '0.5px solid var(--field-border)',
                  background: 'var(--field-bg)',
                  color: 'var(--text-hint)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0, marginLeft: '12px',
                }}
              >
                <IconX size={14} />
              </button>
            </div>

            {/* Description */}
            {task.description && (
              <p
                style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  lineHeight: 1.6,
                  marginBottom: '14px',
                }}
              >
                {task.description}
              </p>
            )}

            <Divider />

            {/* Meta grid */}
            <div style={{ marginBottom: '14px' }}>
              <MetaRow label="Status">
                <Badge variant={STATUS_VARIANT[task.status] || 'muted'}>
                  {STATUS_LABEL[task.status] || task.status}
                </Badge>
              </MetaRow>
              <MetaRow label="Priority">
                <Badge variant={PRIORITY_VARIANT[task.priority] || 'priority-med'}>
                  {task.priority}
                </Badge>
              </MetaRow>
              <MetaRow label="Assigned to">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  {(task.assignees || []).map((a, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Avatar name={a.name} role={a.role} size="xs" />
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{a.name}</span>
                    </div>
                  ))}
                  {(!task.assignees || task.assignees.length === 0) && (
                    <span style={{ color: 'var(--text-hint)' }}>Unassigned</span>
                  )}
                </div>
              </MetaRow>
              {task.deadline && (
                <MetaRow label="Due date">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <IconCalendar size={12} color="var(--text-hint)" />
                    {task.deadline}
                  </span>
                </MetaRow>
              )}
              {estimated > 0 && (
                <MetaRow label="Hours">
                  <span
                    style={{
                      color: burnRatio > 0.85 ? '#d97706' : 'var(--text-secondary)',
                    }}
                  >
                    {estimated}h estimated · {logged}h logged
                    {burnRatio > 0.85 && ' ⚠ burn rate high'}
                  </span>
                </MetaRow>
              )}
              {task.type && (
                <MetaRow label="Type">
                  <Badge variant={`tag-${task.type}`}>{task.type}</Badge>
                </MetaRow>
              )}
            </div>

            <Divider />

            {/* Tab row */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
              {TABS.map((tab) => {
                const active = activeTab === tab.id
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      padding: '5px 9px',
                      borderRadius: 'var(--radius-md)',
                      border: 'none',
                      background: active ? 'var(--primary-light)' : 'none',
                      color: active ? 'var(--primary)' : '#6b7280',
                      fontSize: '11px',
                      fontWeight: active ? 500 : 400,
                      cursor: 'pointer',
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    <Icon size={13} />
                    {tab.label}
                  </button>
                )
              })}
            </div>

            {/* Tab content */}
            {activeTab === 'subtasks' && (
              <div>
                {/* Subtask header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <IconListCheck size={14} color="var(--text-hint)" />
                    <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>
                      Subtasks
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-hint)' }}>
                      {doneSubs}/{totalSubs}
                    </span>
                  </div>
                  <button
                    onClick={() => setAddingSubtask(true)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      fontSize: '10px', color: 'var(--primary)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    <IconPlus size={11} /> Add subtask
                  </button>
                </div>

                {/* Subtask list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {resolvedSubtasks.map((sub) => (
                    <SubtaskRow key={sub.id} subtask={sub} onToggle={toggleSubtask} />
                  ))}
                  {resolvedSubtasks.length === 0 && !addingSubtask && (
                    <div style={{ fontSize: '11px', color: 'var(--text-hint)', padding: '8px 0' }}>
                      No subtasks yet.
                    </div>
                  )}
                </div>

                {/* Add subtask input */}
                {addingSubtask && (
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                    <input
                      autoFocus
                      value={newSubtask}
                      onChange={(e) => setNewSubtask(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') addSubtask(); if (e.key === 'Escape') setAddingSubtask(false) }}
                      placeholder="Subtask title…"
                      style={{
                        flex: 1,
                        border: '1px solid var(--field-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '6px 10px',
                        fontSize: '12px',
                        background: 'var(--field-bg)',
                        color: 'var(--text-primary)',
                        outline: 'none',
                        fontFamily: 'var(--font-sans)',
                      }}
                    />
                    <button
                      onClick={addSubtask}
                      style={{
                        padding: '6px 12px',
                        background: 'var(--primary)',
                        color: '#fff', border: 'none',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '11px', cursor: 'pointer',
                        fontFamily: 'var(--font-sans)',
                      }}
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab !== 'subtasks' && (
              <div style={{ fontSize: '11px', color: 'var(--text-hint)', padding: '16px 0' }}>
                {activeTab === 'attachments' && 'No attachments yet.'}
                {activeTab === 'comments' && 'No comments yet.'}
                {activeTab === 'timelog' && 'No time logs recorded yet.'}
              </div>
            )}
          </div>

          {/* ── RIGHT PANEL ── */}
          <div
            style={{
              padding: '16px',
              background: 'var(--card-bg-soft)',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            {/* Task Stats card */}
            <div
              style={{
                background: '#fff',
                border: '0.5px solid var(--border)',
                borderRadius: '9px',
                padding: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <IconChartBar size={13} color="var(--primary)" />
                <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-primary)' }}>Task stats</span>
              </div>

              {/* Time remaining */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-hint)' }}>Time remaining</span>
                <span style={{ fontSize: '11px', fontWeight: 500, color: remaining < 2 ? '#d97706' : 'var(--text-primary)' }}>
                  {estimated > 0 ? `${remaining}h` : '—'}
                </span>
              </div>

              <Divider />

              {/* Progress */}
              <div style={{ marginBottom: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-hint)' }}>Progress</span>
                  <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--primary)' }}>{progress}%</span>
                </div>
                <div
                  style={{
                    height: '3px', background: 'var(--border-inner)',
                    borderRadius: '9999px', overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%', width: `${progress}%`,
                      background: 'var(--primary)', borderRadius: '9999px',
                    }}
                  />
                </div>
                <div style={{ fontSize: '9px', color: 'var(--text-hint)', marginTop: '3px' }}>
                  {doneSubs} of {totalSubs} subtasks done
                </div>
              </div>

              <Divider />

              {/* Health impact */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-hint)' }}>Health impact</span>
                <Badge variant={healthVariant}>{healthLabel}</Badge>
              </div>
            </div>

            {/* Activity log card */}
            <div
              style={{
                background: '#fff',
                border: '0.5px solid var(--border)',
                borderRadius: '9px',
                padding: '12px',
                flex: 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <IconActivity size={13} color="var(--primary)" />
                <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-primary)' }}>Activity</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {MOCK_ACTIVITIES.map((act, i) => (
                  <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                    <Avatar name={act.user.name} role={act.user.role} size="xs" style={{ marginTop: '1px', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        <span style={{ fontWeight: 500 }}>{act.user.name.split(' ')[0]}</span>
                        {act.type === 'status' && (
                          <>
                            {' '}moved from{' '}
                            <Badge variant={STATUS_VARIANT[act.from] || 'muted'} style={{ fontSize: '9px', padding: '1px 5px' }}>
                              {STATUS_LABEL[act.from]}
                            </Badge>
                            {' '}to{' '}
                            <Badge variant={STATUS_VARIANT[act.to] || 'muted'} style={{ fontSize: '9px', padding: '1px 5px' }}>
                              {STATUS_LABEL[act.to]}
                            </Badge>
                          </>
                        )}
                        {act.type === 'subtask' && (
                          <>
                            {' '}completed{' '}
                            <Badge variant="success" style={{ fontSize: '9px', padding: '1px 5px' }}>
                              {act.subtask}
                            </Badge>
                          </>
                        )}
                        {act.type === 'comment' && <> commented: &ldquo;{act.text}&rdquo;</>}
                      </div>
                      <div style={{ fontSize: '9px', color: 'var(--text-hint)', marginTop: '2px' }}>
                        {act.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Created by card */}
            <div
              style={{
                background: '#fff',
                border: '0.5px solid var(--border)',
                borderRadius: '9px',
                padding: '10px 12px',
              }}
            >
              <div style={{ fontSize: '10px', color: 'var(--text-hint)', marginBottom: '6px' }}>Created by</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Avatar
                  name={task.assignees?.[0]?.name || 'Unknown'}
                  role={task.assignees?.[0]?.role || 'member'}
                  size="sm"
                />
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {task.assignees?.[0]?.name || 'Unknown'}
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--text-hint)' }}>
                    {task.created_at || 'Recently'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
