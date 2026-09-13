import { useEffect, useState } from 'react'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FOLDER_ICONS } from '@/lib/assetFolders'
import { FolderGlyph } from './FolderCard'
import { cn } from '@/lib/utils'

export default function CreateFolderDialog({ open, onOpenChange, onCreate }) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('chart')

  useEffect(() => {
    if (!open) return
    setName('')
    setIcon('chart')
  }, [open])

  const selected = FOLDER_ICONS[icon] || FOLDER_ICONS.chart

  const submit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    const ok = onCreate?.({
      name: name.trim(),
      description: '',
      icon,
      visibility: 'only_me',
      roles: ['admin'],
      allowDownload: true,
      allowUpload: true,
    })
    if (ok !== false) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sd-folder-dialog border-0 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create folder</DialogTitle>
          <DialogDescription>Pick a color — the folder updates live.</DialogDescription>
        </DialogHeader>
        <form className="sd-folder-dialog__form" onSubmit={submit}>
          <div className="sd-folder-dialog__preview">
            <FolderGlyph color={selected.color} tab={selected.tab} />
          </div>

          <div className="sd-folder-dialog__field">
            <Label htmlFor="ff-name">Folder name</Label>
            <Input
              id="ff-name"
              className="sd-team-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Brand assets"
              autoFocus
            />
          </div>

          <div className="sd-folder-dialog__field">
            <Label>Color</Label>
            <div className="sd-folder-dialog__icons" role="listbox" aria-label="Folder color">
              {Object.values(FOLDER_ICONS).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={icon === item.id}
                  className={cn('sd-folder-dialog__icon-btn', icon === item.id && 'is-on')}
                  style={{ ['--ic']: item.color }}
                  onClick={() => setIcon(item.id)}
                  title={item.label}
                  aria-label={item.label}
                />
              ))}
            </div>
          </div>

          <div className="sd-folder-dialog__actions">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="sd-btn-gradient" disabled={!name.trim()}>Create</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
