import { useEffect, useRef, useState } from 'react'
import { IconFileText, IconStar, IconStarFilled, IconUpload, IconTrash } from '@tabler/icons-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { assetsApi } from '../../services/api'
import { formatDate } from './shared'

export default function FilesTab({ projectId }) {
  const [loading, setLoading] = useState(true)
  const [assets, setAssets] = useState([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const load = () => {
    setLoading(true)
    assetsApi.index(projectId)
      .then((res) => setAssets(res.data.data || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [projectId])

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    setUploading(true)
    try {
      await assetsApi.store(projectId, formData)
      load()
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const toggleDeliverable = async (id) => {
    await assetsApi.markDeliverable(projectId, id)
    load()
  }

  const remove = async (id) => {
    await assetsApi.destroy(projectId, id)
    load()
  }

  return (
    <div className="flex flex-col gap-3 overflow-y-auto pb-4">
      <div className="flex justify-end">
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 rounded-lg border border-dashed border-primary/50 px-3 py-1.5 text-[11px] text-primary cursor-pointer transition-all hover:bg-[var(--sd-grad-soft)] disabled:opacity-50"
        >
          <IconUpload size={13} />
          {uploading ? 'Uploading…' : 'Upload file'}
        </button>
      </div>

      <div className="sd-card">
        <div className="sd-card-body--flush sd-card-body">
          {loading ? (
            <div className="flex flex-col gap-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
          ) : assets.length === 0 ? (
            <p className="text-[11.5px] text-muted-foreground">No files uploaded yet.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {assets.map((a) => (
                <li key={a.id} className="flex items-center gap-2.5 border-t border-border pt-2.5 text-[12px] first:border-t-0 first:pt-0">
                  <IconFileText size={16} className="shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-foreground">{a.original_name}</p>
                    <p className="text-[10px] text-muted-foreground">v{a.version} · {a.uploader_name} · {formatDate(a.created_at)}</p>
                  </div>
                  {a.is_deliverable && <Badge variant="success" className="shrink-0 text-[9px]">Deliverable</Badge>}
                  <button onClick={() => toggleDeliverable(a.id)} className="shrink-0 text-muted-foreground hover:text-amber-500 cursor-pointer" title="Toggle deliverable">
                    {a.is_deliverable ? <IconStarFilled size={14} className="text-amber-500" /> : <IconStar size={14} />}
                  </button>
                  <button onClick={() => remove(a.id)} className="shrink-0 text-muted-foreground hover:text-red-500 cursor-pointer" title="Delete">
                    <IconTrash size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
