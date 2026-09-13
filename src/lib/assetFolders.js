/**
 * Agency Drive helpers for Assets → Project files.
 * Metadata + file bytes live on the Laravel server (not browser cache / IndexedDB).
 */
import { getAgencyId } from '@/lib/media'
import { driveApi } from '@/services/api'

export const FOLDER_EVENT = 'sparkdraw:asset-folders'
/** Soft-deleted folders stay in recycle bin for this many days. */
export const RECYCLE_RETENTION_DAYS = 30
export const FOLDER_LOCAL_MAX_BYTES = 100 * 1024 * 1024

const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Folder color presets (stored as `icon` id for backwards compatibility). */
export const FOLDER_ICONS = {
  chart: { id: 'chart', label: 'Sky', color: '#7dd3fc', tab: '#38bdf8', ink: '#0c4a6e' },
  atom: { id: 'atom', label: 'Gold', color: '#fcd53f', tab: '#ffb02e', ink: '#713f12' },
  moon: { id: 'moon', label: 'Pink', color: '#f9a8d4', tab: '#ec4899', ink: '#831843' },
  quantum: { id: 'quantum', label: 'Charcoal', color: '#6b7280', tab: '#374151', ink: '#e5e7eb' },
  flask: { id: 'flask', label: 'Green', color: '#86efac', tab: '#22c55e', ink: '#14532d' },
  gear: { id: 'gear', label: 'Orange', color: '#fdba74', tab: '#f97316', ink: '#7c2d12' },
  files: { id: 'files', label: 'Blue', color: '#93c5fd', tab: '#3b82f6', ink: '#1e3a8a' },
  palette: { id: 'palette', label: 'Rose', color: '#fbcfe8', tab: '#db2777', ink: '#831843' },
  camera: { id: 'camera', label: 'Cyan', color: '#a5f3fc', tab: '#06b6d4', ink: '#164e63' },
  rocket: { id: 'rocket', label: 'Amber', color: '#fde68a', tab: '#d97706', ink: '#7c2d12' },
  violet: { id: 'violet', label: 'Violet', color: '#c4b5fd', tab: '#8b5cf6', ink: '#4c1d95' },
  coral: { id: 'coral', label: 'Coral', color: '#fda4af', tab: '#f43f5e', ink: '#881337' },
  lime: { id: 'lime', label: 'Lime', color: '#bef264', tab: '#84cc16', ink: '#365314' },
  indigo: { id: 'indigo', label: 'Indigo', color: '#a5b4fc', tab: '#6366f1', ink: '#312e81' },
  teal: { id: 'teal', label: 'Teal', color: '#5eead4', tab: '#14b8a6', ink: '#134e4a' },
  lavender: { id: 'lavender', label: 'Lavender', color: '#e9d5ff', tab: '#a855f7', ink: '#581c87' },
}

/** @deprecated kept for older saved folders */
export const FOLDER_THEMES = {
  orange: FOLDER_ICONS.gear,
  blue: FOLDER_ICONS.files,
  purple: FOLDER_ICONS.moon,
  coral: FOLDER_ICONS.rocket,
  teal: FOLDER_ICONS.camera,
}

export const SHARE_ROLES = [
  { id: 'admin', label: 'Admin' },
  { id: 'pm', label: 'Project Manager' },
  { id: 'member', label: 'Team Member' },
  { id: 'client', label: 'Client' },
]

function notify(agencyId) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(FOLDER_EVENT, { detail: { agencyId } }))
  }
}

function apiMessage(err, fallback) {
  const data = err?.response?.data
  const fileErr = data?.errors?.file?.[0]
  if (fileErr) {
    const lower = String(fileErr).toLowerCase()
    if (lower.includes('failed to upload') || lower.includes('required')) {
      return 'Server rejected upload (file may be too large — restart Laravel after PHP limit change)'
    }
    return fileErr
  }
  return data?.message || err?.message || fallback
}

export function resolveFolderIcon(folder) {
  if (folder?.icon && FOLDER_ICONS[folder.icon]) return FOLDER_ICONS[folder.icon]
  if (folder?.theme && FOLDER_THEMES[folder.theme]) return FOLDER_THEMES[folder.theme]
  return FOLDER_ICONS.files
}

export async function fetchDriveState() {
  const res = await driveApi.index()
  const data = res.data?.data || {}
  return {
    folders: Array.isArray(data.folders) ? data.folders : [],
    rootFiles: Array.isArray(data.root_files) ? data.root_files : [],
    trashedFiles: Array.isArray(data.trashed_files) ? data.trashed_files : [],
  }
}

/** @deprecated sync stub — use fetchDriveState */
export function loadAssetFolders() {
  return []
}

/** @deprecated sync stub — use fetchDriveState */
export function loadRootFiles() {
  return []
}

export function getActiveFolders(folders = []) {
  return (folders || []).filter((f) => !f.deletedAt)
}

export function getTrashedFolders(folders = []) {
  return (folders || [])
    .filter((f) => f.deletedAt)
    .sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt))
}

export async function createAssetFolder(_agencyId, payload) {
  try {
    const res = await driveApi.createFolder({
      name: payload.name,
      description: payload.description,
      icon: payload.icon,
      visibility: payload.visibility,
      roles: payload.roles,
      allow_download: payload.allowDownload !== false,
      allow_upload: payload.allowUpload !== false,
    })
    notify(_agencyId)
    return res.data?.data
  } catch (err) {
    throw new Error(apiMessage(err, 'Could not create folder'))
  }
}

export async function updateAssetFolder(_agencyId, folderId, patch) {
  try {
    const body = {}
    if (patch.name !== undefined) body.name = patch.name
    if (patch.description !== undefined) body.description = patch.description
    if (patch.icon !== undefined) body.icon = patch.icon
    if (patch.visibility !== undefined) body.visibility = patch.visibility
    if (patch.roles !== undefined) body.roles = patch.roles
    if (patch.allowDownload !== undefined) body.allow_download = patch.allowDownload
    if (patch.allowUpload !== undefined) body.allow_upload = patch.allowUpload
    const res = await driveApi.updateFolder(folderId, body)
    notify(_agencyId)
    return res.data?.data
  } catch (err) {
    throw new Error(apiMessage(err, 'Could not update folder'))
  }
}

export async function softDeleteAssetFolder(_agencyId, folderId) {
  try {
    await driveApi.trashFolder(folderId)
    notify(_agencyId)
  } catch (err) {
    throw new Error(apiMessage(err, 'Could not move folder to recycle bin'))
  }
}

export async function restoreAssetFolder(_agencyId, folderId) {
  try {
    await driveApi.restoreFolder(folderId)
    notify(_agencyId)
  } catch (err) {
    throw new Error(apiMessage(err, 'Could not restore folder'))
  }
}

export async function deleteAssetFolder(_agencyId, folderId) {
  try {
    await driveApi.destroyFolder(folderId)
    notify(_agencyId)
  } catch (err) {
    throw new Error(apiMessage(err, 'Could not delete folder'))
  }
}

export function folderFileCount(folder) {
  return (folder?.assetIds?.length || 0) + (folder?.localFiles?.length || 0)
}

export async function addLocalFilesToFolder(agencyId, folderId, files, _user, { maxBytes } = {}) {
  const limit = maxBytes || FOLDER_LOCAL_MAX_BYTES
  const added = []
  const skipped = []

  for (const file of Array.from(files || [])) {
    if (!file || !(file instanceof File)) continue
    if (file.size > limit) {
      skipped.push({ name: file.name, reason: `Over ${Math.round(limit / (1024 * 1024))}MB limit` })
      continue
    }
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('folder_id', String(folderId))
      form.append('original_name', file.name)
      const res = await driveApi.uploadFile(form)
      if (res.data?.data) added.push(res.data.data)
    } catch (err) {
      skipped.push({ name: file.name, reason: apiMessage(err, 'Upload failed') })
    }
  }

  if (added.length) notify(agencyId)
  return { added, skipped }
}

export async function addRootLocalFiles(agencyId, files, _user, { maxBytes } = {}) {
  const limit = maxBytes || FOLDER_LOCAL_MAX_BYTES
  const added = []
  const skipped = []

  for (const file of Array.from(files || [])) {
    if (!file || !(file instanceof File)) continue
    if (file.size > limit) {
      skipped.push({ name: file.name, reason: `Over ${Math.round(limit / (1024 * 1024))}MB limit` })
      continue
    }
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('original_name', file.name)
      const res = await driveApi.uploadFile(form)
      if (res.data?.data) added.push(res.data.data)
    } catch (err) {
      skipped.push({ name: file.name, reason: apiMessage(err, 'Upload failed') })
    }
  }

  if (added.length) notify(agencyId)
  return { added, skipped }
}

export async function removeLocalFileFromFolder(agencyId, _folderId, fileId) {
  try {
    await driveApi.destroyFile(fileId)
    notify(agencyId)
  } catch (err) {
    throw new Error(apiMessage(err, 'Could not move file to recycle bin'))
  }
}

export async function removeRootLocalFile(agencyId, fileId) {
  try {
    await driveApi.destroyFile(fileId)
    notify(agencyId)
  } catch (err) {
    throw new Error(apiMessage(err, 'Could not move file to recycle bin'))
  }
}

export async function restoreDriveFile(agencyId, fileId) {
  try {
    await driveApi.restoreFile(fileId)
    notify(agencyId)
  } catch (err) {
    throw new Error(apiMessage(err, 'Could not restore file'))
  }
}

export async function purgeDriveFile(agencyId, fileId) {
  try {
    await driveApi.forceDestroyFile(fileId)
    notify(agencyId)
  } catch (err) {
    throw new Error(apiMessage(err, 'Could not delete file'))
  }
}

export async function renameRootLocalFile(agencyId, fileId, nextName) {
  try {
    await driveApi.renameFile(fileId, nextName)
    notify(agencyId)
  } catch (err) {
    throw new Error(apiMessage(err, 'Could not rename file'))
  }
}

export async function renameLocalFileInFolder(agencyId, _folderId, fileId, nextName) {
  try {
    await driveApi.renameFile(fileId, nextName)
    notify(agencyId)
  } catch (err) {
    throw new Error(apiMessage(err, 'Could not rename file'))
  }
}

export async function saveLocalFileText(agencyId, fileId, text, { mime = 'text/plain;charset=utf-8' } = {}) {
  const blob = new Blob([String(text ?? '')], { type: mime })
  const form = new FormData()
  form.append('file', blob, 'content')
  try {
    const res = await driveApi.replaceContent(fileId, form)
    notify(agencyId)
    return { size: res.data?.data?.size ?? blob.size }
  } catch (err) {
    throw new Error(apiMessage(err, 'Could not save file'))
  }
}

export async function copyRootLocalFile(agencyId, fileId) {
  try {
    const res = await driveApi.copyFile(fileId)
    notify(agencyId)
    return { copied: res.data?.data || null }
  } catch (err) {
    throw new Error(apiMessage(err, 'Could not copy file'))
  }
}

export async function copyLocalFileInFolder(agencyId, _folderId, fileId) {
  try {
    const res = await driveApi.copyFile(fileId)
    notify(agencyId)
    return { copied: res.data?.data || null }
  } catch (err) {
    throw new Error(apiMessage(err, 'Could not copy file'))
  }
}

export function daysUntilPurge(item) {
  if (!item?.deletedAt) return null
  const deleted = new Date(item.deletedAt).getTime()
  if (Number.isNaN(deleted)) return 0
  const left = RECYCLE_RETENTION_DAYS - Math.floor((Date.now() - deleted) / MS_PER_DAY)
  return Math.max(0, left)
}

export function recycleBinCount(folders = [], trashedFiles = []) {
  return getTrashedFolders(folders).length + (trashedFiles?.length || 0)
}

export function canViewFolder(folder, user) {
  if (!folder || !user) return false
  if (folder.deletedAt) return false
  if (folder.ownerId && folder.ownerId === user.id) return true
  if (user.role === 'admin') return true
  if (folder.visibility === 'only_me') return false
  if (folder.visibility === 'agency') return true
  if (folder.visibility === 'roles') {
    return (folder.roles || []).includes(user.role)
  }
  return false
}

export function canDownloadFolder(folder, user) {
  return canViewFolder(folder, user) && folder.allowDownload !== false
}

export function canUploadToFolder(folder, user) {
  if (!canViewFolder(folder, user)) return false
  if (folder.ownerId === user?.id || user?.role === 'admin' || user?.role === 'pm') return true
  return folder.allowUpload !== false
}

export function shareLabel(folder) {
  if (folder.visibility === 'only_me') return 'Only me'
  if (folder.visibility === 'agency') return 'Whole agency'
  const roles = (folder.roles || []).map((r) => SHARE_ROLES.find((x) => x.id === r)?.label || r)
  return roles.length ? roles.join(', ') : 'Selected roles'
}

export function resolveFoldersAgencyId(userOrId) {
  if (typeof userOrId === 'string' || typeof userOrId === 'number') return userOrId
  return getAgencyId(userOrId)
}

export function formatFolderDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `${date} at ${time}`
}
