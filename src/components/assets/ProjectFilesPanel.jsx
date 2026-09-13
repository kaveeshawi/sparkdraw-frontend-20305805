import { useEffect, useMemo, useRef, useState } from 'react'
import {
  IconArrowLeft, IconCheck, IconCopy, IconDownload, IconDownloadOff, IconDots, IconEye,
  IconFolder, IconLayoutGrid, IconList, IconPencil, IconPlus, IconSearch, IconShare2,
  IconTrash, IconRestore, IconRecycle, IconUpload, IconX,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import FolderCard, { FolderGlyph } from './FolderCard'
import FileFormatIcon from './FileFormatIcon'
import CreateFolderDialog from './CreateFolderDialog'
import ShareFolderDialog from './ShareFolderDialog'
import ConfirmDialog from './ConfirmDialog'
import FilePreviewDialog from './FilePreviewDialog'
import RenameFileDialog from './RenameFileDialog'
import {
  FOLDER_EVENT,
  RECYCLE_RETENTION_DAYS,
  addLocalFilesToFolder,
  addRootLocalFiles,
  canDownloadFolder,
  canUploadToFolder,
  canViewFolder,
  copyLocalFileInFolder,
  copyRootLocalFile,
  createAssetFolder,
  daysUntilPurge,
  deleteAssetFolder,
  folderFileCount,
  formatFolderDate,
  getTrashedFolders,
  fetchDriveState,
  purgeDriveFile,
  removeLocalFileFromFolder,
  removeRootLocalFile,
  renameLocalFileInFolder,
  renameRootLocalFile,
  resolveFolderIcon,
  restoreAssetFolder,
  restoreDriveFile,
  shareLabel,
  softDeleteAssetFolder,
  updateAssetFolder,
} from '@/lib/assetFolders'
import { formatFileSize, getFolderFileBlob } from '@/lib/folderLocalFiles'
import { getFileExtension } from '@/lib/fileFormat'
import { isSparkdrawRichText, richHtmlToMarkdown, richHtmlToPlainText } from './TextRichEditor'

function isDriveFile(asset) {
  return asset?.source === 'drive' || asset?.source === 'local' || asset?.location === 'root'
}

const SORT_OPTIONS = [
  { id: 'recent', label: 'Recently added' },
  { id: 'name_asc', label: 'Name A–Z' },
  { id: 'name_desc', label: 'Name Z–A' },
  { id: 'files', label: 'Most files' },
]

const FOLDER_FILTER_PILLS = [
  { id: 'all', label: 'All' },
  { id: 'only_me', label: 'Only me' },
  { id: 'shared', label: 'Shared' },
  { id: 'agency', label: 'Agency' },
  { id: 'restricted', label: 'Downloads off' },
]

function matchesFolderFilter(folder, filterId) {
  if (filterId === 'all') return true
  if (filterId === 'only_me') return folder.visibility === 'only_me'
  if (filterId === 'shared') return folder.visibility === 'roles'
  if (filterId === 'agency') return folder.visibility === 'agency'
  if (filterId === 'restricted') return folder.allowDownload === false
  return true
}

function sortFolders(list, sortBy) {
  const next = [...list]
  if (sortBy === 'name_asc') {
    next.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }))
  } else if (sortBy === 'name_desc') {
    next.sort((a, b) => String(b.name || '').localeCompare(String(a.name || ''), undefined, { sensitivity: 'base' }))
  } else if (sortBy === 'files') {
    next.sort((a, b) => (b.assetIds?.length || 0) - (a.assetIds?.length || 0))
  } else {
    next.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
  }
  return next
}

function FileCard({
  asset,
  canDownload,
  canManageFile,
  onDownload,
  onRemove,
  onPreview,
  onRename,
  onCopy,
}) {
  return (
    <article className="sd-folder-tile">
      <div className="sd-folder-tile__card sd-folder-tile__card--file">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="sd-folder-tile__menu"
              aria-label={`Options for ${asset.original_name}`}
              onClick={(e) => e.stopPropagation()}
            >
              <IconDots size={18} stroke={1.75} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[11rem]">
            <DropdownMenuItem className="cursor-pointer gap-2" onSelect={() => onPreview?.(asset)}>
              <IconEye size={15} />
              Preview
            </DropdownMenuItem>
            {canDownload ? (
              <DropdownMenuItem className="cursor-pointer gap-2" onSelect={() => onDownload?.(asset)}>
                <IconDownload size={15} />
                Download
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem disabled className="gap-2">
                <IconDownloadOff size={15} />
                Downloads off
              </DropdownMenuItem>
            )}
            {canManageFile ? (
              <>
                <DropdownMenuItem className="cursor-pointer gap-2" onSelect={() => onRename?.(asset)}>
                  <IconPencil size={15} />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer gap-2" onSelect={() => onCopy?.(asset)}>
                  <IconCopy size={15} />
                  Make a copy
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                  onSelect={() => onRemove?.(asset)}
                >
                  <IconTrash size={15} />
                  Delete
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          type="button"
          className="sd-folder-tile__hit"
          onClick={() => onPreview?.(asset)}
          aria-label={`Preview ${asset.original_name}`}
        >
          <FileFormatIcon name={asset.original_name} size="md" />
          <span className="sd-folder-tile__name" title={asset.original_name}>
            <span className="sd-folder-tile__name-text">{asset.original_name}</span>
          </span>
        </button>

        <div className="sd-ffile-card__actions">
          <button
            type="button"
            className="sd-ffile-card__icon-btn"
            onClick={() => onPreview?.(asset)}
            aria-label={`Preview ${asset.original_name}`}
            title="Preview"
          >
            <IconEye size={16} stroke={1.75} />
          </button>
          {canDownload ? (
            <button
              type="button"
              className="sd-ffile-card__icon-btn"
              onClick={() => onDownload?.(asset)}
              aria-label={`Download ${asset.original_name}`}
              title="Download"
            >
              <IconDownload size={16} stroke={1.75} />
            </button>
          ) : (
            <button type="button" className="sd-ffile-card__icon-btn is-disabled" disabled title="Downloads off">
              <IconDownloadOff size={16} stroke={1.75} />
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

/**
 * Project files — folders with share / recycle bin (30-day purge).
 */
export default function ProjectFilesPanel({
  agencyId,
  user,
  canManage = false,
  assets = [],
  loading: _loading = false,
  error: _error = false,
  onRequestCreate,
  createSignal = 0,
  recycleSignal = 0,
  addFilesSignal = 0,
  navResetSignal = 0,
}) {
  const [folders, setFolders] = useState([])
  const [rootFiles, setRootFiles] = useState([])
  const [trashedFiles, setTrashedFiles] = useState([])
  const [driveLoading, setDriveLoading] = useState(true)
  const [activeFolderId, setActiveFolderId] = useState(null)
  const [showRecycle, setShowRecycle] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [shareFolder, setShareFolder] = useState(null)
  const [uploadTargetId, setUploadTargetId] = useState(null)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('recent')
  const [filterId, setFilterId] = useState('all')
  const [viewMode, setViewMode] = useState('thumbnail')
  const [uploading, setUploading] = useState(false)
  const [confirmState, setConfirmState] = useState(null)
  const [previewFile, setPreviewFile] = useState(null)
  const [renameFile, setRenameFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)
  const dragDepthRef = useRef(0)

  const pushFilesNav = (next = {}) => {
    const state = {
      sdAssets: true,
      tab: 'files',
      folderId: next.folderId !== undefined ? next.folderId : activeFolderId,
      recycle: next.recycle !== undefined ? next.recycle : showRecycle,
    }
    window.history.pushState(state, '')
  }

  const openFolder = (folderId) => {
    pushFilesNav({ folderId, recycle: false })
    setShowRecycle(false)
    setActiveFolderId(folderId)
  }

  const goToAllFolders = () => {
    window.history.pushState({ sdAssets: true, tab: 'files', folderId: null, recycle: false }, '')
    setActiveFolderId(null)
    setShowRecycle(false)
  }

  const openRecycle = () => {
    pushFilesNav({ folderId: null, recycle: true })
    setActiveFolderId(null)
    setShowRecycle(true)
  }

  const refresh = async () => {
    if (!agencyId) {
      setFolders([])
      setRootFiles([])
      setTrashedFiles([])
      setDriveLoading(false)
      return
    }
    try {
      const state = await fetchDriveState()
      setFolders(state.folders)
      setRootFiles(state.rootFiles)
      setTrashedFiles(state.trashedFiles || [])
    } catch {
      toast.error('Could not load drive files')
      setFolders([])
      setRootFiles([])
      setTrashedFiles([])
    } finally {
      setDriveLoading(false)
    }
  }

  useEffect(() => {
    setDriveLoading(true)
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId, user?.id])

  useEffect(() => {
    const onEvt = () => { refresh() }
    window.addEventListener(FOLDER_EVENT, onEvt)
    return () => window.removeEventListener(FOLDER_EVENT, onEvt)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId, user?.id])

  useEffect(() => {
    if (createSignal > 0) setCreateOpen(true)
  }, [createSignal])

  useEffect(() => {
    if (recycleSignal > 0) openRecycle()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recycleSignal])

  useEffect(() => {
    if (navResetSignal > 0) {
      setActiveFolderId(null)
      setShowRecycle(false)
    }
  }, [navResetSignal])

  useEffect(() => {
    const onPop = (event) => {
      const state = event.state
      if (!state?.sdAssets) return
      if (state.tab && state.tab !== 'files') {
        setActiveFolderId(null)
        setShowRecycle(false)
        return
      }
      setActiveFolderId(state.folderId || null)
      setShowRecycle(Boolean(state.recycle))
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    if (addFilesSignal <= 0) return
    setShowRecycle(false)
    const current = folders.find((f) => f.id === activeFolderId && !f.deletedAt)
    if (current && canUploadToFolder(current, user)) {
      setUploadTargetId(current.id)
    } else {
      setUploadTargetId('root')
    }
    queueMicrotask(() => fileInputRef.current?.click())
  }, [addFilesSignal])

  useEffect(() => {
    onRequestCreate?.(() => setCreateOpen(true))
  }, [onRequestCreate])

  const visibleFolders = useMemo(
    () => folders.filter((f) => !f.deletedAt && canViewFolder(f, user)),
    [folders, user],
  )

  const filteredFolders = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = visibleFolders.filter((f) => {
      if (!matchesFolderFilter(f, filterId)) return false
      if (!q) return true
      const hay = `${f.name || ''} ${f.description || ''} ${shareLabel(f)}`.toLowerCase()
      return hay.includes(q)
    })
    return sortFolders(filtered, sortBy)
  }, [visibleFolders, search, filterId, sortBy])

  const filteredRootFiles = useMemo(() => {
    // Root files sit beside folders; folder-permission filters hide them
    if (filterId !== 'all') return []
    const q = search.trim().toLowerCase()
    let list = [...rootFiles]
    if (q) list = list.filter((f) => String(f.original_name || '').toLowerCase().includes(q))
    if (sortBy === 'name_asc') {
      list.sort((a, b) => String(a.original_name || '').localeCompare(String(b.original_name || ''), undefined, { sensitivity: 'base' }))
    } else if (sortBy === 'name_desc') {
      list.sort((a, b) => String(b.original_name || '').localeCompare(String(a.original_name || ''), undefined, { sensitivity: 'base' }))
    } else {
      list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    }
    return list
  }, [rootFiles, search, filterId, sortBy])

  const sortLabel = SORT_OPTIONS.find((o) => o.id === sortBy)?.label || 'Recently added'

  const trashed = useMemo(
    () => getTrashedFolders(folders),
    [folders],
  )

  const recycleEmpty = trashed.length === 0 && trashedFiles.length === 0

  const activeFolder = visibleFolders.find((f) => f.id === activeFolderId) || null

  const folderFiles = useMemo(() => {
    if (!activeFolder) return []
    const linked = activeFolder.assetIds?.length
      ? assets.filter((a) => activeFolder.assetIds.includes(a.id))
      : []
    const local = (activeFolder.localFiles || []).map((f) => ({
      ...f,
      source: 'local',
      project: null,
      version: 1,
      is_deliverable: false,
    }))
    if (linked.length || local.length) {
      return [...local, ...linked].sort(
        (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
      )
    }
    const key = String(activeFolder.name || '').toLowerCase()
    return assets.filter((a) => {
      const hay = `${a.original_name || ''} ${a.project?.name || ''}`.toLowerCase()
      return key && hay.includes(key.slice(0, 6))
    })
  }, [activeFolder, assets])

  const handleCreate = async (payload) => {
    try {
      await createAssetFolder(agencyId, payload, user)
      await refresh()
      toast.success('Folder created')
      return true
    } catch (err) {
      toast.error(err?.message || 'Could not create folder')
      return false
    }
  }

  const handleShareSave = async (patch) => {
    if (!shareFolder) return
    try {
      await updateAssetFolder(agencyId, shareFolder.id, patch)
      await refresh()
      toast.success('Sharing updated')
    } catch (err) {
      toast.error(err?.message || 'Could not update sharing')
    }
  }

  const handleDelete = (folder) => {
    if (!canManage && folder.ownerId !== user?.id) return
    setConfirmState({
      title: 'Move to Recycle bin?',
      description: `“${folder.name}” will be moved to the Recycle bin. You can restore it within ${RECYCLE_RETENTION_DAYS} days.`,
      confirmLabel: 'Move to Recycle bin',
      onConfirm: async () => {
        try {
          await softDeleteAssetFolder(agencyId, folder.id)
          await refresh()
          if (activeFolderId === folder.id) setActiveFolderId(null)
          toast.success(`“${folder.name}” moved to Recycle bin`, {
            description: `Permanently deleted after ${RECYCLE_RETENTION_DAYS} days.`,
          })
        } catch (err) {
          toast.error(err?.message || 'Could not move folder')
        }
      },
    })
  }

  const handleRestore = async (folder) => {
    try {
      await restoreAssetFolder(agencyId, folder.id)
      await refresh()
      toast.success(`“${folder.name}” restored`)
    } catch (err) {
      toast.error(err?.message || 'Could not restore folder')
    }
  }

  const handlePurge = (folder) => {
    setConfirmState({
      title: 'Delete forever?',
      description: `“${folder.name}” will be permanently deleted. This cannot be undone.`,
      confirmLabel: 'Delete forever',
      onConfirm: async () => {
        try {
          await deleteAssetFolder(agencyId, folder.id)
          await refresh()
          toast.success('Folder permanently deleted')
        } catch (err) {
          toast.error(err?.message || 'Could not delete folder')
        }
      },
    })
  }

  const ingestFiles = async (fileList, targetOverride = null) => {
    const files = Array.from(fileList || []).filter((f) => f instanceof File)
    if (!files.length) return

    let targetId = targetOverride || uploadTargetId || activeFolderId || 'root'
    if (targetId !== 'root') {
      const folder = folders.find((f) => f.id === targetId && !f.deletedAt)
      if (!folder || !canUploadToFolder(folder, user)) {
        toast.message('You cannot upload to this folder')
        return
      }
    }

    setUploading(true)
    try {
      const result = targetId === 'root'
        ? await addRootLocalFiles(agencyId, files, user)
        : await addLocalFilesToFolder(agencyId, targetId, files, user)
      if (targetId !== 'root') setActiveFolderId(targetId)
      await refresh()
      if (result.added.length) {
        toast.success(result.added.length === 1 ? 'File added' : `${result.added.length} files added`)
      }
      if (result.skipped.length) {
        toast.message('Some files were skipped', {
          description: result.skipped.map((s) => `${s.name}: ${s.reason}`).join(' · '),
        })
      }
    } catch (err) {
      toast.error(err?.message || 'Could not add files')
    } finally {
      setUploading(false)
      setUploadTargetId(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleFilesPicked = async (e) => {
    await ingestFiles(e.target.files)
  }

  /** Ctrl/Cmd+V — paste files from clipboard into current folder / root */
  useEffect(() => {
    const onPaste = async (event) => {
      const target = event.target
      if (target?.closest?.('input, textarea, [contenteditable="true"]')) return
      if (showRecycle) return

      const files = [...(event.clipboardData?.files || [])]
      if (!files.length) return

      event.preventDefault()
      toast.message(`Pasting ${files.length} file${files.length === 1 ? '' : 's'}…`)
      await ingestFiles(files)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRecycle, activeFolderId, agencyId, user, folders])

  const onDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (showRecycle) return
    if (![...e.dataTransfer.types].includes('Files')) return
    dragDepthRef.current += 1
    setDragOver(true)
  }

  const onDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
    if (dragDepthRef.current === 0) setDragOver(false)
  }

  const onDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
  }

  const onDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    dragDepthRef.current = 0
    setDragOver(false)
    if (showRecycle) return
    const files = e.dataTransfer?.files
    if (!files?.length) return

    const current = folders.find((f) => f.id === activeFolderId && !f.deletedAt)
    if (current) {
      if (!canUploadToFolder(current, user)) {
        toast.message('You cannot upload to this folder')
        return
      }
      await ingestFiles(files, current.id)
      return
    }
    await ingestFiles(files, 'root')
  }

  const dropZoneProps = showRecycle
    ? {}
    : {
        onDragEnter,
        onDragLeave,
        onDragOver,
        onDrop,
      }

  const dropOverlay = dragOver && !showRecycle ? (
    <div className="sd-assets-drop" aria-hidden>
      <div className="sd-assets-drop__card">
        <IconUpload size={28} stroke={1.6} />
        <strong>{uploading ? 'Adding files…' : 'Drop files to upload'}</strong>
        <span>
          {activeFolder
            ? `Into “${activeFolder.name}”`
            : 'Into Project files'}
        </span>
      </div>
    </div>
  ) : null

  const handleDownloadFile = async (asset, folder = activeFolder) => {
    if (folder && !canDownloadFolder(folder, user)) return
    if (isDriveFile(asset)) {
      try {
        const blob = await getFolderFileBlob(asset.id)
        if (!blob) {
          toast.error('File data missing')
          return
        }
        const name = asset.original_name || 'download'
        const ext = getFileExtension(name)
        let outBlob = blob

        // Rich editor stores HTML internally — export readable text (keep .txt)
        if (['txt', 'md', 'log'].includes(ext)) {
          const raw = await blob.text()
          if (isSparkdrawRichText(raw)) {
            if (ext === 'md') {
              outBlob = new Blob([richHtmlToMarkdown(raw)], { type: 'text/markdown;charset=utf-8' })
            } else {
              outBlob = new Blob([richHtmlToPlainText(raw)], { type: 'text/plain;charset=utf-8' })
            }
          }
        }

        // Legacy Edge/IE: offers Open with default app
        if (typeof window.navigator.msSaveOrOpenBlob === 'function') {
          window.navigator.msSaveOrOpenBlob(outBlob, name)
          toast.success('Downloaded', { description: name })
          return
        }
        const url = URL.createObjectURL(outBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = name
        a.rel = 'noopener'
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(url), 1500)
        toast.success('Downloaded', { description: name })
      } catch {
        toast.error('Download failed')
      }
      return
    }
    toast.message('Open this file from the project Files tab to download server assets.')
  }

  /** Word / PowerPoint etc. — download so OS default app can open it. Excel/CSV open in-app. */
  const handleOpenWithDefaultApp = async (asset, folder = activeFolder) => {
    if (folder && !canDownloadFolder(folder, user)) {
      toast.message('Downloads are restricted for this folder')
      return
    }
    await handleDownloadFile(asset, folder)
    toast.message('Opening with your default app', {
      description: 'If it doesn’t open automatically, use the file in Downloads (Word / PowerPoint / etc.).',
    })
  }

  const handlePreviewFile = (asset) => {
    setPreviewFile(asset)
  }

  const handleRemoveFile = (asset) => {
    const inRoot = asset.location === 'root' || (!activeFolder && isDriveFile(asset))
    setConfirmState({
      title: 'Move to Recycle bin?',
      description: `“${asset.original_name}” will be moved to the Recycle bin. You can restore it within ${RECYCLE_RETENTION_DAYS} days.`,
      confirmLabel: 'Move to Recycle bin',
      onConfirm: async () => {
        try {
          if (inRoot) {
            await removeRootLocalFile(agencyId, asset.id)
          } else if (activeFolder && isDriveFile(asset)) {
            await removeLocalFileFromFolder(agencyId, activeFolder.id, asset.id)
          } else {
            toast.message('Server assets are managed from the project Files tab.')
            return
          }
          await refresh()
          toast.success(`“${asset.original_name}” moved to Recycle bin`, {
            description: `Permanently deleted after ${RECYCLE_RETENTION_DAYS} days.`,
          })
        } catch (err) {
          toast.error(err?.message || 'Could not move file')
        }
      },
    })
  }

  const handleRestoreFile = async (file) => {
    try {
      await restoreDriveFile(agencyId, file.id)
      await refresh()
      toast.success(`“${file.original_name}” restored`)
    } catch (err) {
      toast.error(err?.message || 'Could not restore file')
    }
  }

  const handlePurgeFile = (file) => {
    setConfirmState({
      title: 'Delete forever?',
      description: `“${file.original_name}” will be permanently deleted. This cannot be undone.`,
      confirmLabel: 'Delete forever',
      onConfirm: async () => {
        try {
          await purgeDriveFile(agencyId, file.id)
          await refresh()
          toast.success('File permanently deleted')
        } catch (err) {
          toast.error(err?.message || 'Could not delete file')
        }
      },
    })
  }

  const handleRenameFile = async (asset, nextName) => {
    try {
      const inRoot = asset.location === 'root' || (!activeFolder && isDriveFile(asset))
      if (inRoot) {
        await renameRootLocalFile(agencyId, asset.id, nextName)
      } else if (activeFolder && isDriveFile(asset)) {
        await renameLocalFileInFolder(agencyId, activeFolder.id, asset.id, nextName)
      } else {
        toast.message('Only uploaded files can be renamed here.')
        return false
      }
      await refresh()
      toast.success('File renamed')
      return true
    } catch (err) {
      toast.error(err?.message || 'Could not rename file')
      return false
    }
  }

  const handleCopyFile = async (asset) => {
    try {
      const inRoot = asset.location === 'root' || (!activeFolder && isDriveFile(asset))
      let result = null
      if (inRoot) {
        result = await copyRootLocalFile(agencyId, asset.id, user)
      } else if (activeFolder && isDriveFile(asset)) {
        result = await copyLocalFileInFolder(agencyId, activeFolder.id, asset.id, user)
      } else {
        toast.message('Only uploaded files can be copied here.')
        return
      }
      await refresh()
      const copyName = result?.copied?.original_name
      toast.success('Copy created', {
        description: copyName ? `Saved as “${copyName}”` : undefined,
      })
    } catch (err) {
      toast.error(err?.message || 'Could not copy file')
    }
  }

  const uploadOverlays = (
    <>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        onChange={handleFilesPicked}
      />
      <ConfirmDialog
        open={Boolean(confirmState)}
        onOpenChange={(open) => { if (!open) setConfirmState(null) }}
        title={confirmState?.title}
        description={confirmState?.description}
        confirmLabel={confirmState?.confirmLabel}
        onConfirm={confirmState?.onConfirm}
      />
      <FilePreviewDialog
        open={Boolean(previewFile)}
        onOpenChange={(open) => { if (!open) setPreviewFile(null) }}
        asset={previewFile}
        agencyId={agencyId}
        folderId={activeFolder?.id || null}
        onSaved={refresh}
        onDownload={(file) => handleDownloadFile(file, activeFolder)}
        onOpenExternal={(file) => handleOpenWithDefaultApp(file, activeFolder)}
      />
      <RenameFileDialog
        open={Boolean(renameFile)}
        onOpenChange={(open) => { if (!open) setRenameFile(null) }}
        asset={renameFile}
        onRename={handleRenameFile}
      />
    </>
  )

  if (showRecycle) {
    return (
      <div className="sd-assets-files">
        <div className="sd-assets-files__toolbar">
          <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={goToAllFolders}>
            <IconArrowLeft size={14} />
            Back to folders
          </Button>
          <div className="sd-assets-files__toolbar-meta">
            <strong>Recycle bin</strong>
            <span>Items are permanently deleted after {RECYCLE_RETENTION_DAYS} days</span>
          </div>
        </div>

        {recycleEmpty ? (
          <div className="sd-card">
            <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <IconRecycle size={22} stroke={1.5} />
              </div>
              <p className="text-sm font-medium">Recycle bin is empty</p>
              <p className="max-w-xs text-sm text-muted-foreground">Deleted folders and files appear here for {RECYCLE_RETENTION_DAYS} days.</p>
            </div>
          </div>
        ) : (
          <div className="sd-card divide-y divide-border">
            {trashed.map((folder) => {
              const style = resolveFolderIcon(folder)
              const daysLeft = daysUntilPurge(folder)
              return (
                <div key={`folder-${folder.id}`} className="sd-recycle-row">
                  <FolderGlyph color={style.color} tab={style.tab} className="sd-recycle-row__glyph" />
                  <div className="sd-recycle-row__body">
                    <strong>{folder.name}</strong>
                    <p>
                      Folder · Deleted {formatFolderDate(folder.deletedAt)}
                      {daysLeft != null ? ` · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : ''}
                    </p>
                  </div>
                  {canManage || folder.ownerId === user?.id ? (
                    <div className="sd-recycle-row__actions">
                      <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => handleRestore(folder)}>
                        <IconRestore size={14} />
                        Restore
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="rounded-full text-destructive" onClick={() => handlePurge(folder)}>
                        <IconTrash size={14} />
                        Delete forever
                      </Button>
                    </div>
                  ) : null}
                </div>
              )
            })}
            {trashedFiles.map((file) => {
              const daysLeft = daysUntilPurge(file)
              return (
                <div key={`file-${file.id}`} className="sd-recycle-row">
                  <div className="sd-recycle-row__glyph flex items-center justify-center">
                    <FileFormatIcon name={file.original_name} size="sm" />
                  </div>
                  <div className="sd-recycle-row__body">
                    <strong>{file.original_name}</strong>
                    <p>
                      File{file.size != null ? ` · ${formatFileSize(file.size)}` : ''} · Deleted {formatFolderDate(file.deletedAt)}
                      {daysLeft != null ? ` · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : ''}
                    </p>
                  </div>
                  <div className="sd-recycle-row__actions">
                    <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => handleRestoreFile(file)}>
                      <IconRestore size={14} />
                      Restore
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="rounded-full text-destructive" onClick={() => handlePurgeFile(file)}>
                      <IconTrash size={14} />
                      Delete forever
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {uploadOverlays}
      </div>
    )
  }

  if (activeFolder) {
    const canDl = canDownloadFolder(activeFolder, user)
    const canRemove = canManage || activeFolder.ownerId === user?.id
    return (
      <div className={`sd-assets-files${dragOver ? ' is-dragover' : ''}`} {...dropZoneProps}>
        {dropOverlay}
        <div className="sd-assets-files__toolbar">
          <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={goToAllFolders}>
            <IconArrowLeft size={14} />
            All folders
          </Button>
          <div className="sd-assets-files__toolbar-meta">
            <strong>{activeFolder.name}</strong>
            <span>{shareLabel(activeFolder)}</span>
            {canDl ? (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><IconDownload size={12} /> Downloads on</span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-amber-700"><IconDownloadOff size={12} /> Downloads restricted</span>
            )}
          </div>
          <div className="sd-assets-files__toolbar-actions">
            {(canManage || activeFolder.ownerId === user?.id) ? (
              <>
                <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => setShareFolder(activeFolder)}>
                  <IconShare2 size={14} />
                  Share
                </Button>
                <Button type="button" variant="ghost" size="sm" className="rounded-full text-destructive" onClick={() => handleDelete(activeFolder)}>
                  <IconTrash size={14} />
                </Button>
              </>
            ) : null}
          </div>
        </div>

        {folderFiles.length === 0 ? (
          <div className="sd-assets-dropzone-empty">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <IconFolder size={22} stroke={1.5} />
            </div>
            <p className="text-sm font-medium">Empty folder</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Drag and drop files here, or use Add files in the header.
            </p>
          </div>
        ) : (
          <div className="sd-ffolder-grid">
            {folderFiles.map((a) => (
              <FileCard
                key={a.id}
                asset={a}
                canDownload={canDl}
                canManageFile={canRemove && isDriveFile(a)}
                onPreview={(file) => handlePreviewFile(file, activeFolder)}
                onDownload={(file) => handleDownloadFile(file, activeFolder)}
                onRename={setRenameFile}
                onCopy={handleCopyFile}
                onRemove={handleRemoveFile}
              />
            ))}
          </div>
        )}

        <ShareFolderDialog
          open={Boolean(shareFolder)}
          onOpenChange={(v) => !v && setShareFolder(null)}
          folder={shareFolder}
          onSave={handleShareSave}
        />
        {uploadOverlays}
      </div>
    )
  }

  return (
    <div className={`sd-assets-files${dragOver ? ' is-dragover' : ''}`} {...dropZoneProps}>
      {dropOverlay}
      <div className="sd-team-toolbar sd-team-toolbar--clients">
        <div className="sd-team-toolbar__search">
          <IconSearch size={16} stroke={1.75} className="sd-team-toolbar__search-icon" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search folders..."
            className="sd-team-toolbar__input"
          />
          {search ? (
            <button
              type="button"
              className="sd-team-toolbar__clear"
              aria-label="Clear search"
              onClick={() => setSearch('')}
            >
              <IconX size={14} stroke={2} />
            </button>
          ) : null}
        </div>

        <div className="sd-client-filters" role="group" aria-label="Filter folders">
          {FOLDER_FILTER_PILLS.map((pill) => (
            <button
              key={pill.id}
              type="button"
              className={`sd-client-filter${filterId === pill.id ? ' is-active' : ''}`}
              onClick={() => setFilterId(pill.id)}
            >
              {pill.label}
            </button>
          ))}
        </div>

        <div className="sd-team-toolbar__right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="sd-team-toolbar__sort">
                Sort by: <strong>{sortLabel}</strong>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="sd-soft-dropdown w-48 p-1.5 border-0">
              {SORT_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.id}
                  className="cursor-pointer gap-2 rounded-lg"
                  onClick={() => setSortBy(opt.id)}
                >
                  <span className="flex-1">{opt.label}</span>
                  {sortBy === opt.id && <IconCheck size={14} className="text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="sd-team-view-toggle" role="group" aria-label="View mode">
            <button
              type="button"
              className={viewMode === 'thumbnail' ? 'is-active' : undefined}
              aria-label="Grid view"
              onClick={() => setViewMode('thumbnail')}
            >
              <IconLayoutGrid size={16} stroke={1.75} />
            </button>
            <button
              type="button"
              className={viewMode === 'list' ? 'is-active' : undefined}
              aria-label="List view"
              onClick={() => setViewMode('list')}
            >
              <IconList size={16} stroke={1.75} />
            </button>
          </div>
        </div>
      </div>

      {driveLoading ? (
        <div className="sd-card">
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <p className="text-sm text-muted-foreground">Loading drive…</p>
          </div>
        </div>
      ) : filteredFolders.length === 0 && filteredRootFiles.length === 0 ? (
        <div className="sd-card">
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <IconFolder size={22} stroke={1.5} />
            </div>
            <p className="text-sm font-medium">
              {search || filterId !== 'all' ? 'No items match your filters' : 'No folders or files yet'}
            </p>
            <p className="max-w-xs text-sm text-muted-foreground">
              {search || filterId !== 'all'
                ? 'Try another search or filter.'
                : 'Create a folder or use Add files to upload from your PC.'}
            </p>
            {canManage && !search && filterId === 'all' ? (
              <Button type="button" className="sd-btn-gradient rounded-full" onClick={() => setCreateOpen(true)}>
                <IconPlus size={16} />
                New folder
              </Button>
            ) : null}
          </div>
        </div>
      ) : viewMode === 'thumbnail' ? (
        <div className="sd-ffolder-grid">
          {filteredFolders.map((folder) => (
            <FolderCard
              key={folder.id}
              folder={folder}
              fileCount={folderFileCount(folder)}
              canManage={canManage || folder.ownerId === user?.id}
              onOpen={(f) => openFolder(f.id)}
              onShare={setShareFolder}
              onDelete={handleDelete}
            />
          ))}
          {filteredRootFiles.map((file) => (
            <FileCard
              key={file.id}
              asset={file}
              canDownload
              canManageFile={canManage}
              onPreview={(f) => handlePreviewFile(f, null)}
              onDownload={(f) => handleDownloadFile(f, null)}
              onRename={setRenameFile}
              onCopy={handleCopyFile}
              onRemove={handleRemoveFile}
            />
          ))}
        </div>
      ) : (
        <div className="sd-ffolder-list">
          {filteredFolders.map((folder) => {
            const style = resolveFolderIcon(folder)
            const fileCount = folderFileCount(folder)
            return (
              <button
                key={folder.id}
                type="button"
                className="sd-ffolder-row"
                onClick={() => openFolder(folder.id)}
              >
                <FolderGlyph color={style.color} tab={style.tab} className="sd-ffolder-row__glyph" />
                <div className="sd-ffolder-row__body">
                  <strong>{folder.name}</strong>
                  <p>
                    {shareLabel(folder)}
                    {' · '}
                    {fileCount} file{fileCount === 1 ? '' : 's'}
                    {' · '}
                    {formatFolderDate(folder.createdAt)}
                  </p>
                </div>
                {folder.allowDownload === false ? (
                  <Badge variant="secondary" className="shrink-0 gap-1">
                    <IconDownloadOff size={11} />
                    Downloads off
                  </Badge>
                ) : null}
              </button>
            )
          })}
          {filteredRootFiles.map((file) => (
            <div key={file.id} className="sd-ffolder-row sd-ffolder-row--file">
              <FileFormatIcon name={file.original_name} size="sm" className="sd-ffolder-row__format" />
              <button
                type="button"
                className="sd-ffolder-row__body sd-ffolder-row__body-btn"
                onClick={() => handlePreviewFile(file, null)}
              >
                <strong>{file.original_name}</strong>
                <p>
                  {formatFileSize(file.size)}
                  {' · '}
                  {formatFolderDate(file.created_at)}
                </p>
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="sd-folder-tile__menu"
                    aria-label={`Options for ${file.original_name}`}
                  >
                    <IconDots size={18} stroke={1.75} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[11rem]">
                  <DropdownMenuItem className="cursor-pointer gap-2" onSelect={() => handlePreviewFile(file, null)}>
                    <IconEye size={15} />
                    Preview
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer gap-2" onSelect={() => handleDownloadFile(file, null)}>
                    <IconDownload size={15} />
                    Download
                  </DropdownMenuItem>
                  {canManage ? (
                    <>
                      <DropdownMenuItem className="cursor-pointer gap-2" onSelect={() => setRenameFile(file)}>
                        <IconPencil size={15} />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer gap-2" onSelect={() => handleCopyFile(file)}>
                        <IconCopy size={15} />
                        Make a copy
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                        onSelect={() => handleRemoveFile(file)}
                      >
                        <IconTrash size={15} />
                        Delete
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      <CreateFolderDialog open={createOpen} onOpenChange={setCreateOpen} onCreate={handleCreate} />
      <ShareFolderDialog
        open={Boolean(shareFolder)}
        onOpenChange={(v) => !v && setShareFolder(null)}
        folder={shareFolder}
        onSave={handleShareSave}
      />
      {uploadOverlays}
    </div>
  )
}
