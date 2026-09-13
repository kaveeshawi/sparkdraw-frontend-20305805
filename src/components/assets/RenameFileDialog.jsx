import { useEffect, useState } from 'react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function RenameFileDialog({ open, onOpenChange, asset, onRename }) {
  const [name, setName] = useState('')

  useEffect(() => {
    if (!open) return
    setName(asset?.original_name || '')
  }, [open, asset?.id, asset?.original_name])

  const submit = (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || !asset) return
    const ok = onRename?.(asset, trimmed)
    if (ok !== false) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sd-folder-dialog border-0 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename file</DialogTitle>
          <DialogDescription>Change the display name. The extension is kept if you omit it.</DialogDescription>
        </DialogHeader>
        <form className="sd-folder-dialog__form" onSubmit={submit}>
          <div className="sd-folder-dialog__field">
            <Label htmlFor="rename-file">File name</Label>
            <Input
              id="rename-file"
              className="sd-team-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter className="sd-folder-dialog__actions gap-2 sm:justify-end">
            <Button type="button" variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="sd-btn-gradient rounded-full" disabled={!name.trim()}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
