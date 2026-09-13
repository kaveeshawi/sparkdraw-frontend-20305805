import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import TeamSelect from '../team/TeamSelect'
import TeamDatePicker from '../team/TeamDatePicker'
import { displayMemberName } from '../team/team-utils'
import { tasksApi } from '../../services/api'

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

const EMPTY = {
  title: '',
  project_id: '',
  assignee_id: '',
  priority: 'medium',
  deadline: '',
  estimated_hours: '',
}

export default function AddTaskModal({
  open,
  onClose,
  onCreated,
  projects = [],
  members = [],
  initialAssigneeId = '',
}) {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm({
      ...EMPTY,
      assignee_id: initialAssigneeId ? String(initialAssigneeId) : '',
    })
    setErrors({})
  }, [open, initialAssigneeId])

  const projectOptions = useMemo(
    () =>
      (projects || []).map((p) => ({
        value: String(p.id),
        label: p.name,
      })),
    [projects],
  )

  const memberOptions = useMemo(
    () =>
      (members || [])
        .filter((m) => m.role !== 'client')
        .map((m) => ({
          value: String(m.id),
          label: displayMemberName(m),
        })),
    [members],
  )

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const handleClose = (nextOpen) => {
    if (nextOpen === false) onClose?.()
  }

  const submit = async (e) => {
    e.preventDefault()
    const nextErrors = {}
    if (!form.title.trim()) nextErrors.title = ['Title is required.']
    if (!form.project_id) nextErrors.project_id = ['Project is required.']
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }

    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        priority: form.priority || 'medium',
        assignee_id: form.assignee_id ? Number(form.assignee_id) : null,
        deadline: form.deadline || null,
        estimated_hours: form.estimated_hours ? Number(form.estimated_hours) : null,
      }
      await tasksApi.store(Number(form.project_id), payload)
      toast.success('Task created')
      onCreated?.()
      onClose?.()
    } catch (err) {
      const apiErrors = err.response?.data?.errors
      if (apiErrors) setErrors(apiErrors)
      toast.error(err.response?.data?.message || 'Could not create task')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sd-team-form-dialog sm:max-w-lg border-0">
        <DialogHeader className="sd-team-form-dialog__header">
          <DialogTitle>Add task</DialogTitle>
          <DialogDescription>
            Assign work to a teammate on a shared project.
          </DialogDescription>
        </DialogHeader>

        <form className="sd-team-form" onSubmit={submit}>
          <div className="sd-team-form__field">
            <Label htmlFor="at-title">Title</Label>
            <Input
              id="at-title"
              className="sd-team-field"
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
              placeholder="What needs to be done?"
            />
            {errors.title?.[0] ? (
              <p className="text-xs text-destructive mt-1">{errors.title[0]}</p>
            ) : null}
          </div>

          <div className="sd-team-form__row sd-team-form__row--2">
            <div className="sd-team-form__field">
              <Label>Project</Label>
              <TeamSelect
                value={form.project_id}
                onValueChange={(v) => setField('project_id', v)}
                options={projectOptions}
                placeholder="Select project"
                aria-label="Project"
              />
              {errors.project_id?.[0] ? (
                <p className="text-xs text-destructive mt-1">{errors.project_id[0]}</p>
              ) : null}
            </div>
            <div className="sd-team-form__field">
              <Label>Assignee</Label>
              <TeamSelect
                value={form.assignee_id}
                onValueChange={(v) => setField('assignee_id', v)}
                options={memberOptions}
                placeholder="Unassigned"
                aria-label="Assignee"
              />
            </div>
          </div>

          <div className="sd-team-form__row sd-team-form__row--2">
            <div className="sd-team-form__field">
              <Label>Priority</Label>
              <TeamSelect
                value={form.priority}
                onValueChange={(v) => setField('priority', v)}
                options={PRIORITY_OPTIONS}
                aria-label="Priority"
              />
            </div>
            <div className="sd-team-form__field">
              <Label>Deadline</Label>
              <TeamDatePicker
                value={form.deadline}
                onValueChange={(v) => setField('deadline', v)}
                placeholder="Optional"
              />
              {errors.deadline?.[0] ? (
                <p className="text-xs text-destructive mt-1">{errors.deadline[0]}</p>
              ) : null}
            </div>
          </div>

          <div className="sd-team-form__field">
            <Label htmlFor="at-hours">Estimated hours</Label>
            <Input
              id="at-hours"
              type="number"
              min={1}
              className="sd-team-field"
              value={form.estimated_hours}
              onChange={(e) => setField('estimated_hours', e.target.value)}
              placeholder="Optional"
            />
            {errors.estimated_hours?.[0] ? (
              <p className="text-xs text-destructive mt-1">{errors.estimated_hours[0]}</p>
            ) : null}
          </div>

          <DialogFooter className="sd-team-form-dialog__footer gap-2 sm:gap-2">
            <Button type="button" variant="outline" className="rounded-full" onClick={() => onClose?.()}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="sd-header-new-project sd-btn-gradient rounded-full border-0 shadow-none"
            >
              {saving ? 'Creating…' : 'Create task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
