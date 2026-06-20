import { useEffect, useMemo, useState } from 'react'
import {
  IconBriefcase,
  IconCheck,
  IconPencil,
  IconPlus,
  IconTrash,
  IconX,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { agencyServicesApi } from '@/services/api'
import { invalidateAgencyServicesCache } from '@/hooks/useAgencyServices'
import { toast } from 'sonner'

function projectsForService(projects, serviceName) {
  const needle = String(serviceName || '').trim().toLowerCase()
  if (!needle) return []
  return projects.filter((p) => String(p.type || '').trim().toLowerCase() === needle)
}

export default function ManageServicesModal({
  open,
  onOpenChange,
  projects = [],
  onServicesChange,
  onServiceRenamed,
}) {
  const [services, setServices] = useState([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [pendingRemoveId, setPendingRemoveId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editError, setEditError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setName('')
    setDescription('')
    setError('')
    setPendingRemoveId(null)
    setEditingId(null)
    setEditName('')
    setEditDescription('')
    setEditError('')
    agencyServicesApi
      .index()
      .then((res) => {
        const rows = res.data.data || []
        setServices(rows)
        onServicesChange?.(rows)
      })
      .catch(() => setServices([]))
  }, [open])

  const sorted = useMemo(
    () => [...services].sort((a, b) => a.name.localeCompare(b.name)),
    [services],
  )

  const handleAdd = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Service name is required')
      return
    }
    const exists = services.some(
      (s) => s.name.trim().toLowerCase() === trimmed.toLowerCase(),
    )
    if (exists) {
      setError('That service already exists')
      return
    }

    setBusy(true)
    try {
      const res = await agencyServicesApi.store({ name: trimmed, description: description.trim() || null })
      const created = res.data.data
      const next = [created, ...services]
      setServices(next)
      onServicesChange?.(next)
      setName('')
      setDescription('')
      setError('')
      invalidateAgencyServicesCache()
      toast.success('Service added')
    } catch (err) {
      setError(err.response?.data?.message || 'Could not add service')
    } finally {
      setBusy(false)
    }
  }

  const handleRemove = async (id) => {
    setBusy(true)
    try {
      await agencyServicesApi.remove(id)
      const next = services.filter((s) => s.id !== id)
      setServices(next)
      onServicesChange?.(next)
      setPendingRemoveId(null)
      invalidateAgencyServicesCache()
      toast.success('Service removed')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not remove service')
    } finally {
      setBusy(false)
    }
  }

  const startEdit = (service) => {
    setPendingRemoveId(null)
    setEditingId(service.id)
    setEditName(service.name)
    setEditDescription(service.description || '')
    setEditError('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditDescription('')
    setEditError('')
  }

  const handleSaveEdit = async (service) => {
    const trimmed = editName.trim()
    if (!trimmed) {
      setEditError('Service name is required')
      return
    }
    const exists = services.some(
      (s) =>
        s.id !== service.id &&
        s.name.trim().toLowerCase() === trimmed.toLowerCase(),
    )
    if (exists) {
      setEditError('That service already exists')
      return
    }

    const oldName = service.name
    setBusy(true)
    try {
      const res = await agencyServicesApi.update(service.id, {
        name: trimmed,
        description: editDescription.trim() || null,
      })
      const updated = res.data.data
      const next = services.map((s) => (s.id === service.id ? updated : s))
      setServices(next)
      onServicesChange?.(next)

      if (oldName.trim().toLowerCase() !== trimmed.toLowerCase()) {
        onServiceRenamed?.(oldName, trimmed)
      }

      cancelEdit()
      invalidateAgencyServicesCache()
      toast.success('Service updated')
    } catch (err) {
      setEditError(err.response?.data?.message || 'Could not update service')
    } finally {
      setBusy(false)
    }
  }

  const pendingRemove = pendingRemoveId
    ? services.find((s) => s.id === pendingRemoveId)
    : null

  const pendingLinked = pendingRemove
    ? projectsForService(projects, pendingRemove.name)
    : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sd-dept-dialog border-0">
        <DialogHeader className="sd-dept-dialog__header">
          <DialogTitle>Manage services</DialogTitle>
          <DialogDescription>
            Define the service categories your agency offers. These appear when creating projects and power upsell suggestions.
          </DialogDescription>
        </DialogHeader>

        <div className="sd-dept-dialog__add sd-dept-dialog__add--stacked">
          <div className="flex gap-2">
            <Input
              className="sd-team-field sd-dept-dialog__input"
              placeholder="e.g. Web Development, Social Media Marketing"
              value={name}
              disabled={busy}
              onChange={(e) => {
                setName(e.target.value)
                setError('')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAdd()
                }
              }}
            />
            <Button
              type="button"
              className="sd-btn-gradient sd-dept-dialog__add-btn shrink-0"
              onClick={handleAdd}
              disabled={busy}
            >
              <IconPlus size={16} />
              Add
            </Button>
          </div>
          <Textarea
            className="sd-team-field sd-team-field--textarea sd-dept-dialog__desc"
            placeholder="What does this service typically involve? (helps the AI predict tasks/milestones for this project type)"
            value={description}
            disabled={busy}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        {error ? <p className="sd-dept-dialog__error">{error}</p> : null}

        <div className="sd-dept-list-wrap">
          {pendingRemove ? (
            <div className="sd-dept-confirm">
              <div className="sd-dept-confirm__icon">
                <IconTrash size={22} stroke={1.5} />
              </div>
              <h3>Remove {pendingRemove.name}?</h3>
              <p>
                {pendingLinked.length > 0
                  ? `${pendingLinked.length} project${pendingLinked.length === 1 ? '' : 's'} use this service category. Reassign those projects before removing it.`
                  : 'This service category will be removed from your agency catalog.'}
              </p>
              <div className="sd-dept-confirm__actions">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-full px-5"
                  disabled={busy}
                  onClick={() => setPendingRemoveId(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="h-10 rounded-full px-5"
                  disabled={busy || pendingLinked.length > 0}
                  onClick={() => handleRemove(pendingRemove.id)}
                >
                  Remove service
                </Button>
              </div>
            </div>
          ) : sorted.length === 0 ? (
            <div className="sd-dept-empty">
              <div className="sd-dept-empty__icon">
                <IconBriefcase size={22} stroke={1.5} />
              </div>
              <p className="text-sm font-medium">No services yet</p>
              <p className="text-sm text-muted-foreground">
                Add your first service category to use it when creating projects.
              </p>
            </div>
          ) : (
            <ul className="sd-dept-list">
              {sorted.map((service) => {
                const linked = projectsForService(projects, service.name)
                const isEditing = editingId === service.id

                return (
                  <li
                    key={service.id}
                    className={`sd-dept-row sd-dept-row--no-avatars${isEditing ? ' sd-dept-row--editing' : ''}`}
                  >
                    <div className="sd-dept-row__meta min-w-0">
                      {isEditing ? (
                        <>
                          <Input
                            className="sd-team-field sd-dept-row__edit-input"
                            value={editName}
                            autoFocus
                            disabled={busy}
                            onChange={(e) => {
                              setEditName(e.target.value)
                              setEditError('')
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleSaveEdit(service)
                              }
                              if (e.key === 'Escape') {
                                e.preventDefault()
                                cancelEdit()
                              }
                            }}
                          />
                          <Textarea
                            className="sd-team-field sd-team-field--textarea sd-dept-row__edit-desc"
                            placeholder="What does this service typically involve?"
                            value={editDescription}
                            disabled={busy}
                            onChange={(e) => setEditDescription(e.target.value)}
                          />
                          {editError ? (
                            <p className="sd-dept-row__edit-error">{editError}</p>
                          ) : null}
                        </>
                      ) : (
                        <>
                          <p className="sd-dept-row__name">{service.name}</p>
                          {service.description ? (
                            <p className="sd-dept-row__desc">{service.description}</p>
                          ) : null}
                          <p className="sd-dept-row__count">
                            {linked.length === 0
                              ? 'No projects using this service'
                              : `${linked.length} project${linked.length === 1 ? '' : 's'}`}
                          </p>
                        </>
                      )}
                    </div>
                    <div className="sd-dept-row__actions">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            className="sd-dept-row__action sd-dept-row__action--save"
                            aria-label={`Save ${service.name}`}
                            title="Save"
                            disabled={busy}
                            onClick={() => handleSaveEdit(service)}
                          >
                            <IconCheck size={16} stroke={1.85} />
                          </button>
                          <button
                            type="button"
                            className="sd-dept-row__action"
                            aria-label="Cancel edit"
                            title="Cancel"
                            disabled={busy}
                            onClick={cancelEdit}
                          >
                            <IconX size={16} stroke={1.75} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="sd-dept-row__action"
                            aria-label={`Edit ${service.name}`}
                            title="Edit"
                            disabled={busy}
                            onClick={() => startEdit(service)}
                          >
                            <IconPencil size={16} stroke={1.75} />
                          </button>
                          <button
                            type="button"
                            className="sd-dept-row__action sd-dept-row__action--delete"
                            aria-label={`Delete ${service.name}`}
                            title="Delete"
                            disabled={busy}
                            onClick={() => {
                              cancelEdit()
                              setPendingRemoveId(service.id)
                            }}
                          >
                            <IconTrash size={16} stroke={1.75} />
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
