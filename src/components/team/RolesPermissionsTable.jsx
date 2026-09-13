import { useEffect, useState } from 'react'
import { IconLock, IconPlus, IconTrash, IconUsers } from '@tabler/icons-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { rolesApi } from '@/services/api'
import { PERMISSION_COLUMNS } from './permissionCatalog'
import AddRoleModal from './AddRoleModal'

export default function RolesPermissionsTable({ open, canManage = true }) {
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [busyKey, setBusyKey] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')

  useEffect(() => {
    if (!open) return
    setLoading(true)
    rolesApi.index()
      .then((res) => setRoles(res.data.data || []))
      .catch(() => setRoles([]))
      .finally(() => setLoading(false))
  }, [open])

  const handleToggle = async (role, key, checked) => {
    if (role.is_locked) return
    const busyId = `${role.id}:${key}`
    setBusyKey(busyId)

    setRoles((prev) => prev.map((r) =>
      r.id === role.id ? { ...r, permissions: { ...r.permissions, [key]: checked } } : r
    ))

    try {
      await rolesApi.update(role.id, { permissions: { [key]: checked } })
    } catch (err) {
      setRoles((prev) => prev.map((r) =>
        r.id === role.id ? { ...r, permissions: { ...r.permissions, [key]: !checked } } : r
      ))
      toast.error(err.response?.data?.message || 'Could not update permission')
    } finally {
      setBusyKey(null)
    }
  }

  const startEdit = (role) => {
    setEditingId(role.id)
    setEditName(role.name)
  }

  const saveEdit = async (role) => {
    const trimmed = editName.trim()
    setEditingId(null)
    if (!trimmed || trimmed === role.name) return
    try {
      const res = await rolesApi.update(role.id, { name: trimmed })
      setRoles((prev) => prev.map((r) => (r.id === role.id ? res.data.data : r)))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not rename role')
    }
  }

  const handleCreate = async (payload) => {
    const res = await rolesApi.store(payload)
    setRoles((prev) => [...prev, res.data.data])
    toast.success('Role created')
  }

  const handleDelete = async () => {
    if (!pendingDelete) return
    try {
      await rolesApi.remove(pendingDelete.id)
      setRoles((prev) => prev.filter((r) => r.id !== pendingDelete.id))
      toast.success('Role removed')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not remove role')
    } finally {
      setPendingDelete(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11.5px] text-muted-foreground max-w-lg">
          Agency Admin always has full access. Use Relevant for assigned work only, or All for every project / client.
        </p>
        {canManage && (
          <Button type="button" size="sm" className="sd-btn-gradient shrink-0 border-0" onClick={() => setShowAdd(true)}>
            <IconPlus size={14} />
            Add role
          </Button>
        )}
      </div>

      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[980px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="sticky left-0 z-10 bg-muted/30 px-4 py-4 text-[12px] font-semibold text-muted-foreground">
                  Role
                </th>
                {PERMISSION_COLUMNS.map((col) => (
                  <th key={col.key} className="px-4 py-4 text-center text-[11.5px] font-semibold text-muted-foreground" title={col.description}>
                    {col.label}
                  </th>
                ))}
                {canManage && <th className="w-9" />}
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id} className="border-b border-border last:border-b-0 hover:bg-muted/20">
                  <td className="sticky left-0 z-10 min-w-[200px] bg-card-solid px-4 py-4">
                    <div className="flex items-center gap-1.5">
                      {editingId === role.id ? (
                        <input
                          autoFocus
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onBlur={() => saveEdit(role)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit(role)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          className="w-32 rounded-md border border-border bg-transparent px-1.5 py-0.5 text-[12.5px] font-medium outline-none focus:border-primary/50"
                        />
                      ) : (
                        <button
                          type="button"
                          disabled={role.is_locked || !canManage}
                          onClick={() => canManage && startEdit(role)}
                          className="truncate text-[13.5px] font-semibold text-foreground disabled:cursor-default"
                        >
                          {role.name}
                        </button>
                      )}
                      {role.is_locked && <IconLock size={12} className="shrink-0 text-muted-foreground" />}
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <IconUsers size={10} />
                        {role.member_count}
                      </span>
                    </div>
                  </td>
                  {PERMISSION_COLUMNS.map((col) => (
                    <td key={col.key} className="px-4 py-4 text-center">
                      <Switch
                        checked={role.is_locked ? true : role.permissions[col.key]}
                        disabled={role.is_locked || !canManage || busyKey === `${role.id}:${col.key}`}
                        onCheckedChange={(checked) => handleToggle(role, col.key, checked)}
                      />
                    </td>
                  ))}
                  {canManage && (
                    <td className="px-2 text-center">
                      {!role.is_locked && (
                        <button
                          type="button"
                          onClick={() => setPendingDelete(role)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-500 cursor-pointer"
                          title="Delete role"
                        >
                          <IconTrash size={14} />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddRoleModal open={showAdd} onOpenChange={setShowAdd} onCreate={handleCreate} />

      <Dialog open={!!pendingDelete} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <DialogContent className="border-0">
          <DialogHeader>
            <DialogTitle>Remove {pendingDelete?.name}?</DialogTitle>
            <DialogDescription>
              {pendingDelete?.member_count > 0
                ? `${pendingDelete.member_count} member${pendingDelete.member_count === 1 ? '' : 's'} currently on this role will have no permissions until reassigned to another role.`
                : 'This role will be removed from your agency workspace.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Remove role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
