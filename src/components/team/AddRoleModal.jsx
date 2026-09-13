import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

// New custom roles start from the Team Member's baseline (least-privilege) —
// the admin grants access via the permission toggles afterward.
const DEFAULT_BASE_ROLE = 'member'

export default function AddRoleModal({ open, onOpenChange, onCreate }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const reset = () => {
    setName('')
    setError('')
    setBusy(false)
  }

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Role name is required')
      return
    }
    setBusy(true)
    try {
      await onCreate({ name: trimmed, base_role: DEFAULT_BASE_ROLE })
      reset()
      onOpenChange(false)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create role')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent className="border-0">
        <DialogHeader>
          <DialogTitle>Add custom role</DialogTitle>
          <DialogDescription>
            Create a role for a specific job function, then customize what it can access.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Input
            placeholder="e.g. Finance Lead, Design Lead"
            value={name}
            disabled={busy}
            autoFocus
            onChange={(e) => { setName(e.target.value); setError('') }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="sd-btn-gradient border-0" disabled={busy} onClick={handleCreate}>
            {busy ? 'Creating…' : 'Create role'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
