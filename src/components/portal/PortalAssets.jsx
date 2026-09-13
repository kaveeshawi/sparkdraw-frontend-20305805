import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  IconDownload,
  IconFolder,
  IconTrash,
  IconUpload,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { apiErrorMessage } from '@/lib/apiError'
import useAuthStore from '../../store/authStore'
import { portalApi } from '../../services/api'

function formatBytes(n) {
  const size = Number(n) || 0
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function PortalAssets({ slug }) {
  const user = useAuthStore((s) => s.user)
  const inputRef = useRef(null)
  const [folder, setFolder] = useState(null)
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(false)

  const load = () => {
    if (!slug) {
      setFolder(null)
      setFiles([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(false)
    portalApi
      .listAssets(slug)
      .then((res) => {
        const data = res.data.data || {}
        setFolder(data.folder || null)
        setFiles(data.files || [])
      })
      .catch(() => {
        setFolder(null)
        setFiles([])
        setError(true)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [slug])

  const handleUpload = async (e) => {
    const list = Array.from(e.target.files || [])
    e.target.value = ''
    if (!list.length || !slug) return

    setUploading(true)
    try {
      for (const file of list) {
        await portalApi.uploadAsset(slug, file)
      }
      toast.success(list.length === 1 ? 'File uploaded' : `${list.length} files uploaded`)
      load()
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Upload failed'))
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = async (file) => {
    try {
      const res = await portalApi.downloadAsset(slug, file.id)
      const blob = new Blob([res.data], { type: file.mime || 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.original_name || 'download'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Download failed'))
    }
  }

  const handleDelete = async (file) => {
    try {
      await portalApi.deleteAsset(slug, file.id)
      toast.success('File removed')
      setFiles((prev) => prev.filter((f) => f.id !== file.id))
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not remove file'))
    }
  }

  if (!slug) {
    return (
      <div className="sd-page sd-page--team">
        <div className="sd-card p-8 text-center text-sm text-muted-foreground">
          Portal not available.
        </div>
      </div>
    )
  }

  return (
    <div className="sd-page sd-page--team space-y-4">
      <section className="sd-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <IconFolder size={18} stroke={1.75} />
              </span>
              <div>
                <h3 className="text-sm font-semibold">
                  {folder?.name || 'Your folder'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Files you upload stay in this folder. Your agency team can also see them.
                </p>
              </div>
            </div>
          </div>
          <div>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              multiple
              onChange={handleUpload}
            />
            <Button
              type="button"
              disabled={uploading || loading}
              onClick={() => inputRef.current?.click()}
            >
              <IconUpload size={16} stroke={1.75} />
              {uploading ? 'Uploading…' : 'Upload files'}
            </Button>
          </div>
        </div>
      </section>

      <section className="sd-card p-5">
        <h3 className="sd-card-title mb-3">Files</h3>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : error ? (
          <p className="text-sm text-muted-foreground">
            Couldn’t load assets.{' '}
            <button type="button" className="text-primary underline-offset-2 hover:underline" onClick={load}>
              Retry
            </button>
          </p>
        ) : files.length === 0 ? (
          <div className="py-8 text-center">
            <IconFolder size={22} stroke={1.5} className="mx-auto text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">No files yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Upload briefs, references, or approvals into your folder.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {files.map((file) => {
              const mine = file.uploader_id === user?.id
              return (
                <li key={file.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{file.original_name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatBytes(file.size)} · {formatDate(file.created_at)}
                      {file.uploader_name ? ` · ${file.uploader_name}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label="Download"
                      onClick={() => handleDownload(file)}
                    >
                      <IconDownload size={16} stroke={1.75} />
                    </Button>
                    {mine ? (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label="Delete"
                        onClick={() => handleDelete(file)}
                      >
                        <IconTrash size={16} stroke={1.75} />
                      </Button>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
