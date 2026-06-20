import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconFolderPlus,
  IconShieldCheck,
  IconSparkles,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import TeamSelect from '../team/TeamSelect'
import TeamDatePicker from '../team/TeamDatePicker'
import Avatar from '../legacy-ui/Avatar'
import { clientsApi, projectsApi, teamApi, aiApi, agencyServicesApi } from '../../services/api'

// ── Config ─────────────────────────────────────────────────────────────────

const DEFAULT_PROJECT_COLOR = '#802AEE'

const PROJECT_TYPES = [
  'UI/UX Design',
  'Web Development',
  'Branding',
  'Marketing',
  'SEO Audit',
]

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started', bg: '#F0F0F0', color: '#888' },
  { value: 'started',     label: 'Started',     bg: '#F3E8FF', color: '#802AEE' },
  { value: 'active',      label: 'Ongoing',     bg: '#EBF5FF', color: '#2E74B5' },
  { value: 'on_hold',     label: 'On Hold',     bg: '#FFF8E8', color: '#D4A017' },
  { value: 'completed',   label: 'Completed',   bg: '#EAFAF1', color: '#1A8A4A' },
]

// TODO Session 5.x — replace with real team API
const MOCK_TEAM = [
  { id: 1, name: 'Morgan Lee', role: 'admin' },
  { id: 2, name: 'Jordan Kim', role: 'pm' },
  { id: 3, name: 'Alex Chen',  role: 'member' },
]

// TODO Session 5.x — mock brief for when AI call 404s
const MOCK_BRIEF = {
  milestones: [
    { title: 'Discovery & Research',       due_offset_days: 7 },
    { title: 'Wireframes & Prototyping',    due_offset_days: 14 },
    { title: 'Visual Design',               due_offset_days: 28 },
    { title: 'Development',                 due_offset_days: 56 },
    { title: 'QA & Launch',                 due_offset_days: 70 },
  ],
  estimated_hours: 120,
}

const EMPTY_FORM = {
  name:            '',
  client_id:       '',
  project_type:    '',
  status:          'started',
  budget:          '',
  estimated_hours: '',
  start_date:      '',
  due_date:        '',
  description:     '',
}

function FieldError({ message }) {
  if (!message) return null
  return <p className="sd-team-form__error">{message}</p>
}

// ── Component ───────────────────────────────────────────────────────────────

export default function NewProjectModal({ open, onClose, onCreated }) {
  const navigate = useNavigate()

  const [form, setForm]             = useState({ ...EMPTY_FORM })
  const [assignees, setAssignees]   = useState([])
  const [suggestedMilestones, setSuggestedMilestones] = useState([])
  const [suggestedPhases, setSuggestedPhases] = useState([])
  const [suggestedRisks, setSuggestedRisks] = useState([])
  const [milestones, setMilestones] = useState([])

  const [clients, setClients]       = useState([])
  const [projectTypes, setProjectTypes] = useState(PROJECT_TYPES)
  const [services, setServices]     = useState([])
  const [team, setTeam]             = useState(MOCK_TEAM)

  const [generating, setGenerating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors]         = useState({})

  // Reset on open
  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY_FORM })
      setAssignees([])
      setSuggestedMilestones([])
      setSuggestedPhases([])
      setSuggestedRisks([])
      setMilestones([])
      setErrors({})
    }
  }, [open])

  // Fetch clients
  useEffect(() => {
    if (!open) return
    clientsApi.index()
      .then((res) => setClients(res.data.data || []))
      .catch(() => {})
  }, [open])

  // Fetch agency service categories — descriptions give the AI brief
  // generator context on what each service type typically involves.
  useEffect(() => {
    if (!open) return
    agencyServicesApi.index()
      .then((res) => {
        const rows = res.data.data || []
        setServices(rows)
        const names = rows.map((s) => s.name).filter(Boolean)
        if (names.length > 0) setProjectTypes(names)
      })
      .catch(() => setProjectTypes(PROJECT_TYPES))
  }, [open])

  // Fetch team members
  useEffect(() => {
    if (!open) return
    teamApi.index()
      .then((res) => setTeam(res.data.data || MOCK_TEAM))
      .catch(() => setTeam(MOCK_TEAM))
  }, [open])

  const setField = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const setInputField = (key) => (e) => setField(key)(e.target.value)

  const toggleAssignee = (id) =>
    setAssignees((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const matchedService = services.find(
        (s) => s.name.trim().toLowerCase() === form.project_type.trim().toLowerCase(),
      )
      const res = await aiApi.generateBrief({
        project_name:        form.name,
        project_type:        form.project_type,
        service_description: matchedService?.description || '',
        budget:              form.budget ? Number(form.budget) : 0,
        duration_weeks:      form.start_date && form.due_date
          ? Math.max(1, Math.round((new Date(form.due_date) - new Date(form.start_date)) / (7 * 86400000)))
          : 4,
      })
      const data = res.data.data
      setSuggestedMilestones(data.milestones || [])
      setSuggestedPhases(data.suggested_phases || [])
      setSuggestedRisks(data.risks || [])
      if (data.estimated_hours) {
        setForm((f) => ({ ...f, estimated_hours: String(data.estimated_hours) }))
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setSuggestedMilestones(MOCK_BRIEF.milestones)
        setForm((f) => ({ ...f, estimated_hours: String(MOCK_BRIEF.estimated_hours) }))
      }
    } finally {
      setGenerating(false)
    }
  }

  const handleAcceptMilestones = () => {
    setMilestones(suggestedMilestones)
    setSuggestedMilestones([])
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim())    e.name       = 'Project name is required'
    if (!form.client_id)      e.client_id  = 'Client is required'
    if (!form.project_type)   e.project_type = 'Project type is required'
    if (!form.start_date)     e.start_date = 'Start date is required'
    if (!form.due_date)       e.due_date   = 'Due date is required'
    return e
  }

  const handleClose = (nextOpen) => {
    if (!nextOpen) onClose?.()
  }

  const handleSubmit = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSubmitting(true)
    try {
      const res = await projectsApi.store({
        name:            form.name,
        client_id:       form.client_id,
        type:            form.project_type,
        status:          form.status,
        budget:          form.budget || null,
        estimated_hours: form.estimated_hours ? Number(form.estimated_hours) : null,
        start_date:      form.start_date,
        end_date:        form.due_date,
        description:     form.description || null,
        color:           DEFAULT_PROJECT_COLOR,
        team_member_ids: assignees,
        milestones,
      })
      const newProject = res.data.data
      onCreated?.()
      onClose?.()
      navigate(`/projects/${newProject.id}/kanban`)
    } catch (err) {
      const apiErrors = err.response?.data?.errors || {}
      setErrors(apiErrors)
    } finally {
      setSubmitting(false)
    }
  }

  const clientOptions = [
    ...clients.map((c) => ({ value: String(c.id), label: c.company_name })),
    { value: '__new__', label: '+ Add new client' },
  ]

  const typeOptions = projectTypes.map((t) => ({ value: t, label: t }))

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sd-team-form-dialog sm:max-w-5xl border-0">
        <DialogHeader className="sd-team-form-dialog__header">
          <DialogTitle>Create new project</DialogTitle>
          <DialogDescription>
            Fill in the details below to get started.
          </DialogDescription>
        </DialogHeader>

        <div className="sd-team-form">
          {/* Project name */}
          <div className="sd-team-form__row">
            <div className="sd-team-form__field">
              <Label htmlFor="np-name">Project name</Label>
              <Input
                id="np-name"
                className="sd-team-field"
                placeholder="e.g. NovaTech Brand Refresh"
                value={form.name}
                onChange={setInputField('name')}
              />
              <FieldError message={errors.name} />
            </div>
          </div>

          {/* Client + Type */}
          <div className="sd-team-form__row sd-team-form__row--2">
            <div className="sd-team-form__field">
              <Label htmlFor="np-client">Client</Label>
              <TeamSelect
                id="np-client"
                value={form.client_id}
                onValueChange={setField('client_id')}
                options={clientOptions}
                placeholder="Select client"
              />
              <FieldError message={errors.client_id} />
            </div>
            <div className="sd-team-form__field">
              <Label htmlFor="np-type">Project type</Label>
              <TeamSelect
                id="np-type"
                value={form.project_type}
                onValueChange={setField('project_type')}
                options={typeOptions}
                placeholder="Select type"
              />
              <FieldError message={errors.project_type} />
            </div>
          </div>

          {/* Budget + Estimated hours */}
          <div className="sd-team-form__row sd-team-form__row--2">
            <div className="sd-team-form__field">
              <Label htmlFor="np-budget">Budget (USD)</Label>
              <Input
                id="np-budget"
                className="sd-team-field"
                placeholder="e.g. 5,000"
                value={form.budget}
                onChange={setInputField('budget')}
              />
            </div>
            <div className="sd-team-form__field">
              <Label htmlFor="np-hours">Estimated hours</Label>
              <Input
                id="np-hours"
                type="number"
                min="0"
                className="sd-team-field"
                placeholder="e.g. 80"
                value={form.estimated_hours}
                onChange={setInputField('estimated_hours')}
              />
            </div>
          </div>

          {/* Start + Due date */}
          <div className="sd-team-form__row sd-team-form__row--2">
            <div className="sd-team-form__field">
              <Label htmlFor="np-start">Start date</Label>
              <TeamDatePicker
                id="np-start"
                value={form.start_date}
                onValueChange={setField('start_date')}
                placeholder="Select start date"
              />
              <FieldError message={errors.start_date} />
            </div>
            <div className="sd-team-form__field">
              <Label htmlFor="np-due">Due date</Label>
              <TeamDatePicker
                id="np-due"
                value={form.due_date}
                onValueChange={setField('due_date')}
                placeholder="Select due date"
              />
              <FieldError message={errors.due_date} />
            </div>
          </div>

          {/* Description */}
          <div className="sd-team-form__row">
            <div className="sd-team-form__field">
              <Label htmlFor="np-description">Description</Label>
              <Textarea
                id="np-description"
                className="sd-team-field sd-team-field--textarea"
                placeholder="Optional — add project goals or context"
                value={form.description}
                onChange={setInputField('description')}
              />
            </div>
          </div>

          {/* Assignee avatar picker + status */}
          <div className="sd-team-form__row">
            <div className="sd-team-form__field">
              <div className="sd-team-form__label-row">
                <Label>Assign team members</Label>
                {assignees.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {assignees.length} selected
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {team.map((member) => {
                    const selected = assignees.includes(member.id)
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => toggleAssignee(member.id)}
                        title={member.name}
                        className={cn(
                          'rounded-full p-0 outline outline-2 outline-offset-2 transition-opacity',
                          selected ? 'outline-primary' : 'outline-transparent',
                          assignees.length > 0 && !selected && 'opacity-45',
                        )}
                      >
                        <Avatar name={member.name} role={member.role} size="sm" />
                      </button>
                    )
                  })}
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  {STATUS_OPTIONS.map((opt) => {
                    const active = form.status === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setField('status')(opt.value)}
                        className="rounded-full px-3 py-1.5 text-[12px] font-medium transition-[box-shadow,transform] active:scale-[0.97]"
                        style={{
                          background: opt.bg,
                          color: opt.color,
                          boxShadow: active ? `0 0 0 2px ${opt.color}` : '0 0 0 1px transparent',
                        }}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* AI brief generator strip */}
          <div className="flex items-center gap-2.5 rounded-xl border border-[#e9d5ff] bg-gradient-to-br from-[#fdfcff] to-[#f3e8ff] px-3.5 py-2.5">
            <IconSparkles size={15} className="shrink-0 text-primary" />
            <div className="flex-1 text-[11px] leading-relaxed text-[#374151]">
              <span className="font-medium text-primary">AI brief generator</span>
              {' '}— auto-create milestones + hour estimates based on project type and client history
            </div>
            <Button
              type="button"
              size="sm"
              className="sd-btn-gradient h-7 shrink-0 rounded-full px-3 text-[11px]"
              onClick={handleGenerate}
              disabled={generating || !form.name}
            >
              {generating ? 'Generating…' : 'Generate ✦'}
            </Button>
          </div>

          {/* AI-generated milestones preview — awaiting explicit accept */}
          {suggestedMilestones.length > 0 && (
            <div className="rounded-xl border border-border bg-[var(--color-surface-1)] px-3.5 py-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[11px] font-medium text-primary">
                  ✦ AI-suggested milestones
                </span>
                <Button
                  type="button"
                  size="sm"
                  className="sd-btn-gradient h-6 rounded-full px-2.5 text-[10px]"
                  onClick={handleAcceptMilestones}
                >
                  Accept milestones
                </Button>
              </div>
              {suggestedMilestones.map((m, i) => (
                <div key={i} className="flex items-center gap-2 py-1 text-[12px] text-muted-foreground">
                  <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
                    {i + 1}
                  </span>
                  <span className="flex-1">{m.title}</span>
                  {typeof m.due_offset_days === 'number' && (
                    <span className="text-[11px] text-muted-foreground">
                      Week {Math.max(1, Math.round(m.due_offset_days / 7))}
                    </span>
                  )}
                </div>
              ))}
              {suggestedPhases.length > 0 && (
                <div className="mt-2 text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground">Suggested phases: </span>
                  {suggestedPhases.join(' → ')}
                </div>
              )}
              {suggestedRisks.length > 0 && (
                <div className="mt-1 text-[11px] text-amber-600">
                  <span className="font-medium">Risks: </span>
                  {suggestedRisks.join(' · ')}
                </div>
              )}
            </div>
          )}

          {/* Accepted milestones — will be created with the project */}
          {milestones.length > 0 && (
            <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/60 px-3.5 py-3">
              <div className="mb-1.5 text-[11px] font-medium text-emerald-700">
                ✓ {milestones.length} milestone{milestones.length !== 1 ? 's' : ''} will be created
              </div>
              {milestones.map((m, i) => (
                <div key={i} className="flex items-center gap-2 py-0.5 text-[12px] text-muted-foreground">
                  <span className="flex-1">{m.title}</span>
                  {typeof m.due_offset_days === 'number' && (
                    <span className="text-[11px] text-muted-foreground">
                      Week {Math.max(1, Math.round(m.due_offset_days / 7))}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="sd-team-form-dialog__footer gap-2 sm:gap-2 sm:justify-between">
          <div className="hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:flex">
            <IconShieldCheck size={13} className="text-emerald-600" />
            Isolated to your agency workspace
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-full px-5"
              onClick={() => handleClose(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="sd-btn-gradient h-10 rounded-full px-6"
              onClick={handleSubmit}
              disabled={submitting}
            >
              <IconFolderPlus size={16} />
              {submitting ? 'Creating…' : 'Create project'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
