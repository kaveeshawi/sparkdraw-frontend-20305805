import { useEffect, useMemo, useState } from 'react'
import { IconTrash } from '@tabler/icons-react'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { calendarApi, projectsApi } from '@/services/api'
import { apiErrorMessage } from '@/lib/apiError'
import {
  EVENT_TYPE_OPTIONS,
  localInputToIso,
  toDateKey,
  toLocalInputValue,
} from './calendar-utils'

function defaultForm(focusDate, existing) {
  if (existing?.editable && existing.source === 'calendar') {
    return {
      title: existing.title || '',
      subtitle: existing.subtitle || '',
      description: existing.description || '',
      type: existing.type || 'meetings',
      project_id: existing.projectId ? String(existing.projectId) : '',
      starts_at: toLocalInputValue(existing.startsAt),
      ends_at: toLocalInputValue(existing.endsAt),
    }
  }

  const base = new Date(focusDate)
  base.setMinutes(0, 0, 0)
  if (base.getHours() < 9) base.setHours(9)
  const end = new Date(base)
  end.setHours(base.getHours() + 1)

  return {
    title: '',
    subtitle: '',
    description: '',
    type: 'meetings',
    project_id: '',
    starts_at: toLocalInputValue(base),
    ends_at: toLocalInputValue(end),
  }
}

export default function CalendarEventModal({
  open,
  onOpenChange,
  focusDate,
  event = null,
  onSaved,
  onDeleted,
}) {
  const isEdit = Boolean(event?.editable && event?.source === 'calendar')
  const [form, setForm] = useState(() => defaultForm(focusDate, event))
  const [projects, setProjects] = useState([])
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(defaultForm(focusDate, event))
  }, [open, focusDate, event])

  useEffect(() => {
    if (!open) return
    projectsApi
      .index()
      .then((res) => {
        const raw = res.data.data
        const list = Array.isArray(raw) ? raw : (raw?.projects ?? [])
        setProjects(list)
      })
      .catch(() => setProjects([]))
  }, [open])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const title = useMemo(
    () => (isEdit ? 'Edit event' : 'Create event'),
    [isEdit],
  )

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Title is required')
      return
    }
    const startsAt = localInputToIso(form.starts_at)
    const endsAt = localInputToIso(form.ends_at)
    if (!startsAt || !endsAt) {
      toast.error('Pick a valid start and end time')
      return
    }
    if (new Date(endsAt) <= new Date(startsAt)) {
      toast.error('End time must be after start time')
      return
    }

    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || null,
        description: form.description.trim() || null,
        type: form.type,
        project_id: form.project_id ? Number(form.project_id) : null,
        starts_at: startsAt,
        ends_at: endsAt,
        all_day: false,
      }

      const res = isEdit
        ? await calendarApi.update(event.id, payload)
        : await calendarApi.store(payload)

      toast.success(isEdit ? 'Event updated' : 'Event created')
      onSaved?.(res.data.data)
      onOpenChange(false)
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not save event'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!isEdit) return
    setDeleting(true)
    try {
      await calendarApi.destroy(event.id)
      toast.success('Event deleted')
      onDeleted?.(event.id)
      onOpenChange(false)
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not delete event'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-0">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update this calendar event.'
              : `Schedule something for ${toDateKey(focusDate)}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="cal-title">Title</Label>
            <Input
              id="cal-title"
              value={form.title}
              onChange={set('title')}
              placeholder="e.g. Client review call"
              className="rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cal-type">Type</Label>
              <select
                id="cal-type"
                value={form.type}
                onChange={set('type')}
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                {EVENT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cal-project">Project (optional)</Label>
              <select
                id="cal-project"
                value={form.project_id}
                onChange={set('project_id')}
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="">None</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cal-sub">Subtitle</Label>
            <Input
              id="cal-sub"
              value={form.subtitle}
              onChange={set('subtitle')}
              placeholder="Team or location"
              className="rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cal-start">Starts</Label>
              <Input
                id="cal-start"
                type="datetime-local"
                value={form.starts_at}
                onChange={set('starts_at')}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cal-end">Ends</Label>
              <Input
                id="cal-end"
                type="datetime-local"
                value={form.ends_at}
                onChange={set('ends_at')}
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cal-desc">Notes</Label>
            <textarea
              id="cal-desc"
              value={form.description}
              onChange={set('description')}
              rows={3}
              placeholder="Agenda or notes…"
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            {isEdit ? (
              <Button
                type="button"
                variant="ghost"
                className="text-red-500 hover:text-red-600"
                disabled={saving || deleting}
                onClick={handleDelete}
              >
                <IconTrash size={16} />
                {deleting ? 'Deleting…' : 'Delete'}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                disabled={saving || deleting}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="sd-btn-gradient rounded-full border-0"
                disabled={saving || deleting}
                onClick={handleSave}
              >
                {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create event'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
