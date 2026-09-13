/** Drive file helpers — bytes come from the Laravel Drive API (server disk). */
import { driveApi } from '@/services/api'

export const FOLDER_LOCAL_MAX_BYTES = 100 * 1024 * 1024

export async function getFolderFileBlob(fileId) {
  if (!fileId) return null
  try {
    const res = await driveApi.downloadFile(fileId)
    return res.data instanceof Blob ? res.data : new Blob([res.data])
  } catch {
    return null
  }
}

export async function putFolderFileBlob() {
  // Uploads go through driveApi.uploadFile / replaceContent — no browser blob store.
}

export async function deleteFolderFileBlob() {}

export async function deleteFolderFileBlobs() {}

export function formatFileSize(bytes) {
  const n = Number(bytes) || 0
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}
