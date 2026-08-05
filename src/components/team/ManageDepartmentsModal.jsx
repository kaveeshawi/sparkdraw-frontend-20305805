import { useEffect, useMemo, useState } from 'react'
import {
  IconBuilding,
  IconCheck,
  IconPencil,
  IconPlus,
  IconTrash,
  IconX,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { departmentsApi } from '@/services/api'
import { toast } from 'sonner'
import AvatarStack from './AvatarStack'
import { membersForDepartment } from './departmentStorage'

export default function ManageDepartmentsModal({
  open,
  onOpenChange,
  agencyId,
  members = [],
  onDepartmentsChange,
  onDepartmentRenamed,
  onDepartmentRemoved,
}) {
  const [departments, setDepartments] = useState([])
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [pendingRemoveId, setPendingRemoveId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editError, setEditError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setName('')
    setError('')
    setPendingRemoveId(null)
    setEditingId(null)
    setEditName('')
    setEditError('')
    departmentsApi
      .index()
      .then((res) => {
        const rows = res.data.data || []
        setDepartments(rows)
        onDepartmentsChange?.(rows)
      })
      .catch(() => setDepartments([]))
  }, [open, agencyId])

  const sorted = useMemo(
    () => [...departments].sort((a, b) => a.name.localeCompare(b.name)),
    [departments],
  )

  const handleAdd = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Department name is required')
      return
    }
    const exists = departments.some(
      (d) => d.name.trim().toLowerCase() === trimmed.toLowerCase(),
    )
    if (exists) {
      setError('That department already exists')
      return
    }

    setBusy(true)
    try {
      const res = await departmentsApi.store({ name: trimmed })
      const created = res.data.data
      const next = [created, ...departments]
      setDepartments(next)
      onDepartmentsChange?.(next)
      setName('')
      setError('')
      toast.success('Department added')
    } catch (err) {
      setError(err.response?.data?.message || 'Could not add department')
    } finally {
      setBusy(false)
    }
  }

  const handleRemove = async (id) => {
    const removed = departments.find((d) => d.id === id)
    setBusy(true)
    try {
      await departmentsApi.remove(id)
      const next = departments.filter((d) => d.id !== id)
      setDepartments(next)
      onDepartmentsChange?.(next)
      onDepartmentRemoved?.(removed?.name)
      setPendingRemoveId(null)
      toast.success('Department removed')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not remove department')
    } finally {
      setBusy(false)
    }
  }

  const startEdit = (dept) => {
    setPendingRemoveId(null)
    setEditingId(dept.id)
    setEditName(dept.name)
    setEditError('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditError('')
  }

  const handleSaveEdit = async (dept) => {
    const trimmed = editName.trim()
    if (!trimmed) {
      setEditError('Department name is required')
      return
    }
    const exists = departments.some(
      (d) =>
        d.id !== dept.id &&
        d.name.trim().toLowerCase() === trimmed.toLowerCase(),
    )
    if (exists) {
      setEditError('That department already exists')
      return
    }

    const oldName = dept.name
    setBusy(true)
    try {
      const res = await departmentsApi.update(dept.id, { name: trimmed })
      const updated = res.data.data
      const next = departments.map((d) => (d.id === dept.id ? updated : d))
      setDepartments(next)
      onDepartmentsChange?.(next)

      if (oldName.trim().toLowerCase() !== trimmed.toLowerCase()) {
        onDepartmentRenamed?.(oldName, trimmed)
      }

      cancelEdit()
      toast.success('Department updated')
    } catch (err) {
      setEditError(err.response?.data?.message || 'Could not update department')
    } finally {
      setBusy(false)
    }
  }

  const pendingRemove = pendingRemoveId
    ? departments.find((d) => d.id === pendingRemoveId)
    : null

  const pendingAssigned = pendingRemove
    ? membersForDepartment(members, pendingRemove.name)
    : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sd-dept-dialog border-0">
        <DialogHeader className="sd-dept-dialog__header">
          <DialogTitle>Manage departments</DialogTitle>
          <DialogDescription>
            Create departments for your agency. Assigned members appear as an avatar stack.
          </DialogDescription>
        </DialogHeader>

        <div className="sd-dept-dialog__add">
          <Input
            className="sd-team-field sd-dept-dialog__input"
            placeholder="e.g. Design, Development"
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
        {error ? <p className="sd-dept-dialog__error">{error}</p> : null}

        <div className="sd-dept-list-wrap">
          {pendingRemove ? (
            <div className="sd-dept-confirm">
              <div className="sd-dept-confirm__icon">
                <IconTrash size={22} stroke={1.5} />
              </div>
              <h3>Remove {pendingRemove.name}?</h3>
              <p>
                {pendingAssigned.length > 0
                  ? `${pendingAssigned.length} member${pendingAssigned.length === 1 ? '' : 's'} ${pendingAssigned.length === 1 ? 'is' : 'are'} assigned to this department. Removing it will not delete members, but they will no longer be linked to this department.`
                  : 'This department will be removed from your agency workspace.'}
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
                  disabled={busy}
                  onClick={() => handleRemove(pendingRemove.id)}
                >
                  Remove department
                </Button>
              </div>
            </div>
          ) : sorted.length === 0 ? (
            <div className="sd-dept-empty">
              <div className="sd-dept-empty__icon">
                <IconBuilding size={22} stroke={1.5} />
              </div>
              <p className="text-sm font-medium">No departments yet</p>
              <p className="text-sm text-muted-foreground">
                Add your first department to use it in the invite form.
              </p>
            </div>
          ) : (
            <ul className="sd-dept-list">
              {sorted.map((dept) => {
                const assigned = membersForDepartment(members, dept.name)
                const isEditing = editingId === dept.id

                return (
                  <li
                    key={dept.id}
                    className={`sd-dept-row${isEditing ? ' sd-dept-row--editing' : ''}`}
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
                                handleSaveEdit(dept)
                              }
                              if (e.key === 'Escape') {
                                e.preventDefault()
                                cancelEdit()
                              }
                            }}
                          />
                          {editError ? (
                            <p className="sd-dept-row__edit-error">{editError}</p>
                          ) : null}
                        </>
                      ) : (
                        <>
                          <p className="sd-dept-row__name">{dept.name}</p>
                          <p className="sd-dept-row__count">
                            {assigned.length === 0
                              ? 'No members assigned'
                              : `${assigned.length} member${assigned.length === 1 ? '' : 's'}`}
                          </p>
                        </>
                      )}
                    </div>
                    <div className="sd-dept-row__avatars">
                      <AvatarStack members={assigned} size="sm" />
                    </div>
                    <div className="sd-dept-row__actions">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            className="sd-dept-row__action sd-dept-row__action--save"
                            aria-label={`Save ${dept.name}`}
                            title="Save"
                            disabled={busy}
                            onClick={() => handleSaveEdit(dept)}
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
                            aria-label={`Edit ${dept.name}`}
                            title="Edit"
                            disabled={busy}
                            onClick={() => startEdit(dept)}
                          >
                            <IconPencil size={16} stroke={1.75} />
                          </button>
                          <button
                            type="button"
                            className="sd-dept-row__action sd-dept-row__action--delete"
                            aria-label={`Delete ${dept.name}`}
                            title="Delete"
                            disabled={busy}
                            onClick={() => {
                              cancelEdit()
                              setPendingRemoveId(dept.id)
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
