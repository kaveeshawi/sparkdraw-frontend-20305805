import { useEffect, useMemo, useState } from 'react'
import { IconPencil } from '@tabler/icons-react'
import { toast } from 'sonner'
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
import { useAgencyCurrency } from '@/hooks/useAgencyCurrency'
import { apiErrorMessage } from '@/lib/apiError'
import TeamSelect from '../team/TeamSelect'
import TeamDatePicker from '../team/TeamDatePicker'
import Avatar from '../legacy-ui/Avatar'
import { clientsApi, projectsApi, teamApi, agencyServicesApi } from '../../services/api'

const FALLBACK_TYPES = [
  'UI/UX Design',
  'Web Development',
  'Branding',
  'Marketing',
  'SEO Audit',
]

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not started' },
  { value: 'started', label: 'Started' },
  { value: 'active', label: 'In progress' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
]

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

const COLOR_PRESETS = ['#802AEE', '#ea580c', '#2563eb', '#059669', '#dc2626', '#64748b']

function FieldError({ message }) {
  if (!message) return null
  const text = Array.isArray(message) ? message[0] : message
  if (!text) return null
  return <p className="sd-team-form__error">{text}</p>
}

function toDateInput(value) {
  if (!value) return ''
  const raw = String(value)
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10)
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

function buildForm(project) {
  const team = project?.team_members || project?.assignees || []
  return {
    name: project?.name || '',
    client_id: project?.client_id ? String(project.client_id) : (project?.client?.id ? String(project.client.id) : ''),
    type: project?.type || '',
    description: project?.description || '',
    status: project?.status || 'active',
    priority: project?.priority || 'medium',
    budget: project?.budget != null ? String(project.budget) : '',
    estimated_hours: project?.estimated_hours != null ? String(project.estimated_hours) : '',
    start_date: toDateInput(project?.start_date),
    end_date: toDateInput(project?.end_date || project?.due_date),
    color: project?.color || COLOR_PRESETS[0],
    team_member_ids: team.map((m) => m.id).filter(Boolean),
  }
}

export default function EditProjectModal({ open, onOpenChange, project, onUpdated }) {
  const currency = useAgencyCurrency()
  const [form, setForm] = useState(() => buildForm(project))
  const [clients, setClients] = useState([])
  const [types, setTypes] = useState(FALLBACK_TYPES)
  const [team, setTeam] = useState([])
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !project) return
    setForm(buildForm(project))
    setErrors({})
    setSaving(false)
  }, [open, project])

  useEffect(() => {
    if (!open) return
    clientsApi.index()
      .then((res) => setClients(res.data.data || []))
      .catch(() => setClients([]))
    agencyServicesApi.index()
      .then((res) => {
        const names = (res.data.data || []).map((s) => s.name).filter(Boolean)
        setTypes(names.length ? names : FALLBACK_TYPES)
      })
      .catch(() => setTypes(FALLBACK_TYPES))
    teamApi.index()
      .then((res) => setTeam(res.data.data || []))
      .catch(() => setTeam([]))
  }, [open])

  const clientOptions = useMemo(
    () => (clients || []).map((c) => ({
      value: String(c.id),
      label: c.company_name || c.name || `Client #${c.id}`,
    })),
    [clients],
  )

  const typeOptions = useMemo(() => {
    const list = [...types]
    if (form.type && !list.includes(form.type)) list.unshift(form.type)
    return list.map((t) => ({ value: t, label: t }))
  }, [types, form.type])

  const setField = (key) => (value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next[key]
      delete next.general
      return next
    })
  }

  const setInputField = (key) => (e) => setField(key)(e.target.value)

  const toggleMember = (id) => {
    setForm((prev) => {
      const ids = prev.team_member_ids.includes(id)
        ? prev.team_member_ids.filter((x) => x !== id)
        : [...prev.team_member_ids, id]
      return { ...prev, team_member_ids: ids }
    })
  }

  const handleSave = async () => {
    if (!project?.id) return

    const local = {}
    if (!form.name.trim() || form.name.trim().length < 2) {
      local.name = ['Project name is required (min 2 characters)']
    }
    if (!form.client_id) local.client_id = ['Client is required']
    if (!form.type.trim()) local.type = ['Service is required']
    if (!form.end_date) local.end_date = ['End date is required']
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      local.end_date = ['End date must be on or after start date']
    }
    if (Object.keys(local).length) {
      setErrors(local)
      return
    }

    const payload = {
      name: form.name.trim(),
      client_id: Number(form.client_id),
      type: form.type.trim(),
      description: form.description.trim() || null,
      status: form.status,
      priority: form.priority,
      budget: form.budget === '' ? null : Number(form.budget),
      estimated_hours: form.estimated_hours === '' ? null : Number(form.estimated_hours),
      start_date: form.start_date || undefined,
      end_date: form.end_date,
      color: form.color || COLOR_PRESETS[0],
      team_member_ids: form.team_member_ids,
    }

    setSaving(true)
    try {
      const res = await projectsApi.update(project.id, payload)
      const updated = res.data?.data
      toast.success('Project updated')
      onUpdated?.(updated || { ...project, ...payload })
      onOpenChange?.(false)
    } catch (err) {
      const apiErrors = err.response?.data?.errors || {}
      if (Object.keys(apiErrors).length) {
        setErrors(apiErrors)
      } else {
        setErrors({ general: [apiErrorMessage(err, 'Could not update project')] })
        toast.error(apiErrorMessage(err, 'Could not update project'))
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sd-team-form-dialog sm:max-w-2xl border-0">
        <DialogHeader className="sd-team-form-dialog__header">
          <DialogTitle className="inline-flex items-center gap-2">
            <IconPencil size={18} stroke={1.75} />
            Edit project
          </DialogTitle>
          <DialogDescription>
            Update the project name, client, dates, budget, team, and other details.
          </DialogDescription>
        </DialogHeader>

        <div className="sd-team-form">
          <div className="sd-team-form__row">
            <div className="sd-team-form__field">
              <Label htmlFor="ep-name">Project name</Label>
              <Input
                id="ep-name"
                className="sd-team-field"
                value={form.name}
                onChange={setInputField('name')}
                disabled={saving}
              />
              <FieldError message={errors.name} />
            </div>
          </div>

          <div className="sd-team-form__row sd-team-form__row--2">
            <div className="sd-team-form__field">
              <Label htmlFor="ep-client">Client</Label>
              <TeamSelect
                id="ep-client"
                value={form.client_id}
                onValueChange={setField('client_id')}
                options={clientOptions}
                placeholder="Select client"
                disabled={saving}
              />
              <FieldError message={errors.client_id} />
            </div>
            <div className="sd-team-form__field">
              <Label htmlFor="ep-type">Service</Label>
              <TeamSelect
                id="ep-type"
                value={form.type}
                onValueChange={setField('type')}
                options={typeOptions}
                placeholder="Select service"
                disabled={saving}
              />
              <FieldError message={errors.type} />
            </div>
          </div>

          <div className="sd-team-form__row">
            <div className="sd-team-form__field">
              <Label htmlFor="ep-description">Description</Label>
              <Textarea
                id="ep-description"
                className="sd-team-field sd-team-field--textarea"
                value={form.description}
                onChange={setInputField('description')}
                disabled={saving}
              />
              <FieldError message={errors.description} />
            </div>
          </div>

          <div className="sd-team-form__row sd-team-form__row--2">
            <div className="sd-team-form__field">
              <Label htmlFor="ep-status">Status</Label>
              <TeamSelect
                id="ep-status"
                value={form.status}
                onValueChange={setField('status')}
                options={STATUS_OPTIONS}
                disabled={saving}
              />
              <FieldError message={errors.status} />
            </div>
            <div className="sd-team-form__field">
              <Label htmlFor="ep-priority">Priority</Label>
              <TeamSelect
                id="ep-priority"
                value={form.priority}
                onValueChange={setField('priority')}
                options={PRIORITY_OPTIONS}
                disabled={saving}
              />
              <FieldError message={errors.priority} />
            </div>
          </div>

          <div className="sd-team-form__row sd-team-form__row--2">
            <div className="sd-team-form__field">
              <Label htmlFor="ep-start">Start date</Label>
              <TeamDatePicker
                id="ep-start"
                value={form.start_date}
                onValueChange={setField('start_date')}
                placeholder="Select start date"
                disabled={saving}
              />
              <FieldError message={errors.start_date} />
            </div>
            <div className="sd-team-form__field">
              <Label htmlFor="ep-end">End date</Label>
              <TeamDatePicker
                id="ep-end"
                value={form.end_date}
                onValueChange={setField('end_date')}
                placeholder="Select end date"
                disabled={saving}
              />
              <FieldError message={errors.end_date} />
            </div>
          </div>

          <div className="sd-team-form__row sd-team-form__row--2">
            <div className="sd-team-form__field">
              <Label htmlFor="ep-budget">Budget ({currency})</Label>
              <Input
                id="ep-budget"
                type="number"
                min="0"
                step="0.01"
                className="sd-team-field"
                value={form.budget}
                onChange={setInputField('budget')}
                disabled={saving}
              />
              <FieldError message={errors.budget} />
            </div>
            <div className="sd-team-form__field">
              <Label htmlFor="ep-hours">Estimated hours</Label>
              <Input
                id="ep-hours"
                type="number"
                min="1"
                className="sd-team-field"
                value={form.estimated_hours}
                onChange={setInputField('estimated_hours')}
                disabled={saving}
              />
              <FieldError message={errors.estimated_hours} />
            </div>
          </div>

          <div className="sd-team-form__row">
            <div className="sd-team-form__field">
              <Label>Accent color</Label>
              <div className="flex flex-wrap items-center gap-2">
                {COLOR_PRESETS.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    className={cn(
                      'size-7 rounded-full border-2 transition-transform',
                      form.color === hex ? 'scale-110 border-foreground' : 'border-transparent',
                    )}
                    style={{ background: hex }}
                    aria-label={`Color ${hex}`}
                    disabled={saving}
                    onClick={() => setField('color')(hex)}
                  />
                ))}
                <Input
                  className="sd-team-field h-9 max-w-[7.5rem] font-mono text-[12px]"
                  value={form.color}
                  onChange={setInputField('color')}
                  disabled={saving}
                  aria-label="Custom color hex"
                />
              </div>
              <FieldError message={errors.color} />
            </div>
          </div>

          <div className="sd-team-form__row">
            <div className="sd-team-form__field">
              <div className="sd-team-form__label-row">
                <Label>Team members</Label>
                {form.team_member_ids.length > 0 ? (
                  <span className="text-xs text-muted-foreground">
                    {form.team_member_ids.length} selected
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {team.map((member) => {
                  const selected = form.team_member_ids.includes(member.id)
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => toggleMember(member.id)}
                      title={member.name}
                      disabled={saving}
                      className={cn(
                        'rounded-full p-0 outline outline-2 outline-offset-2 transition-opacity',
                        selected ? 'outline-primary' : 'outline-transparent opacity-50',
                      )}
                    >
                      <Avatar name={member.name} role={member.role} size="sm" />
                    </button>
                  )
                })}
                {team.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground">No team members found.</p>
                ) : null}
              </div>
            </div>
          </div>

          <FieldError message={errors.general} />
        </div>

        <DialogFooter className="sd-team-form-dialog__footer">
          <Button
            type="button"
            variant="secondary"
            className="border-0"
            disabled={saving}
            onClick={() => onOpenChange?.(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="sd-btn-gradient border-0"
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
