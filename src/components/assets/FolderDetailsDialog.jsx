import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { formatFolderDate, shareLabel, SHARE_ROLES, resolveFolderIcon } from '@/lib/assetFolders'
import { FolderGlyph } from './FolderCard'

function Row({ label, children }) {
  return (
    <div className="sd-folder-details__row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function accessSummary(folder) {
  if (folder.visibility === 'only_me') return 'Only me'
  if (folder.visibility === 'agency') return 'Whole agency'
  const roles = (folder.roles || [])
    .map((id) => SHARE_ROLES.find((r) => r.id === id)?.label || id)
  return roles.length ? roles.join(', ') : 'Selected roles'
}

export default function FolderDetailsDialog({ open, onOpenChange, folder, fileCount = 0, onShare }) {
  if (!folder) return null
  const style = resolveFolderIcon(folder)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sd-folder-dialog border-0 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Folder details</DialogTitle>
          <DialogDescription>Overview and sharing permissions for this folder.</DialogDescription>
        </DialogHeader>

        <div className="sd-folder-details">
          <div className="sd-folder-details__hero">
            <FolderGlyph color={style.color} tab={style.tab} />
            <strong>{folder.name}</strong>
            {folder.description ? <p>{folder.description}</p> : null}
          </div>

          <dl className="sd-folder-details__list">
            <Row label="Files">
              {fileCount} file{fileCount === 1 ? '' : 's'}
            </Row>
            <Row label="Created">
              {formatFolderDate(folder.createdAt)}
            </Row>
            <Row label="Access">
              {accessSummary(folder)}
            </Row>
            <Row label="Visibility">
              {shareLabel(folder)}
            </Row>
            <Row label="Downloads">
              {folder.allowDownload === false ? 'Restricted' : 'Allowed'}
            </Row>
            <Row label="Uploads">
              {folder.allowUpload === false ? 'Restricted' : 'Allowed'}
            </Row>
          </dl>

          <div className="sd-folder-dialog__actions">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {onShare ? (
              <Button
                type="button"
                className="sd-btn-gradient"
                onClick={() => {
                  onOpenChange(false)
                  onShare(folder)
                }}
              >
                Edit sharing
              </Button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
