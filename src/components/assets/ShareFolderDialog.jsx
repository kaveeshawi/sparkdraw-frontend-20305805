import { useEffect, useState } from 'react'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { SHARE_ROLES } from '@/lib/assetFolders'
import { cn } from '@/lib/utils'

const VISIBILITY = [
  { id: 'only_me', title: 'Only me', desc: 'Private — only you and admins can open this folder.' },
  { id: 'roles', title: 'Selected roles', desc: 'Share with specific agency roles.' },
  { id: 'agency', title: 'Whole agency', desc: 'Everyone in your agency can view this folder.' },
]

export default function ShareFolderDialog({ open, onOpenChange, folder, onSave }) {
  const [visibility, setVisibility] = useState('only_me')
  const [roles, setRoles] = useState(['admin'])
  const [allowDownload, setAllowDownload] = useState(true)
  const [allowUpload, setAllowUpload] = useState(true)

  useEffect(() => {
    if (!open || !folder) return
    setVisibility(folder.visibility || 'only_me')
    setRoles(folder.roles?.length ? [...folder.roles] : ['admin'])
    setAllowDownload(folder.allowDownload !== false)
    setAllowUpload(folder.allowUpload !== false)
  }, [open, folder])

  const toggleRole = (id) => {
    setRoles((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]))
  }

  const submit = (e) => {
    e.preventDefault()
    onSave?.({
      visibility,
      roles: visibility === 'roles' ? roles : SHARE_ROLES.map((r) => r.id),
      allowDownload,
      allowUpload,
    })
    onOpenChange(false)
  }

  if (!folder) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sd-folder-dialog border-0 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share “{folder.name}”</DialogTitle>
          <DialogDescription>Control who can open this folder and whether files can be downloaded.</DialogDescription>
        </DialogHeader>

        <form className="sd-folder-dialog__form" onSubmit={submit}>
          <div className="sd-folder-dialog__field">
            <Label>Who can access</Label>
            <div className="sd-folder-dialog__vis">
              {VISIBILITY.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={cn('sd-folder-dialog__vis-card', visibility === opt.id && 'is-on')}
                  onClick={() => setVisibility(opt.id)}
                >
                  <strong>{opt.title}</strong>
                  <span>{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {visibility === 'roles' ? (
            <div className="sd-folder-dialog__field">
              <Label>Roles</Label>
              <div className="sd-folder-dialog__roles">
                {SHARE_ROLES.map((role) => {
                  const on = roles.includes(role.id)
                  return (
                    <button
                      key={role.id}
                      type="button"
                      className={cn('sd-folder-dialog__role', on && 'is-on')}
                      onClick={() => toggleRole(role.id)}
                    >
                      {role.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}

          <div className="sd-folder-dialog__toggles">
            <div className="sd-folder-dialog__toggle">
              <div>
                <strong>Allow downloads</strong>
                <p>People with access can download files from this folder.</p>
              </div>
              <Switch checked={allowDownload} onCheckedChange={setAllowDownload} />
            </div>
            <div className="sd-folder-dialog__toggle">
              <div>
                <strong>Allow uploads</strong>
                <p>People with access can add new files into this folder.</p>
              </div>
              <Switch checked={allowUpload} onCheckedChange={setAllowUpload} />
            </div>
          </div>

          <div className="sd-folder-dialog__actions">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="sd-btn-gradient" disabled={visibility === 'roles' && roles.length === 0}>
              Save sharing
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
