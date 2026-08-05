import { useEffect, useMemo, useState } from 'react'
import { IconFolder, IconFileText, IconStar, IconStarFilled } from '@tabler/icons-react'
import PageWrapper from '../components/layout/PageWrapper'
import PageHeader from '../components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { assetsApi } from '../services/api'

function AssetRow({ asset }) {
  return (
    <div className="flex items-center gap-3 border-t border-border px-4 py-3 text-sm first:border-t-0">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <IconFileText size={16} stroke={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{asset.original_name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {asset.project?.name || 'No project'} · v{asset.version} · uploaded by {asset.uploader_name || 'Unknown'}
        </p>
      </div>
      {asset.is_deliverable && (
        <Badge variant="info" className="shrink-0 gap-1">
          <IconStarFilled size={11} />
          Deliverable
        </Badge>
      )}
      <span className="shrink-0 text-xs text-muted-foreground">
        {new Date(asset.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
      </span>
    </div>
  )
}

export default function AssetsPage() {
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [deliverableOnly, setDeliverableOnly] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError(false)
    assetsApi
      .all()
      .then((res) => setAssets(res.data.data || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(
    () => (deliverableOnly ? assets.filter((a) => a.is_deliverable) : assets),
    [assets, deliverableOnly]
  )

  return (
    <PageWrapper>
      <div className="sd-page">
        <PageHeader
          title="Assets Library"
          subtitle="Every file uploaded across your projects, in one place."
        />

        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setDeliverableOnly(false)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              !deliverableOnly
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-muted-foreground hover:bg-accent'
            }`}
          >
            All files ({assets.length})
          </button>
          <button
            onClick={() => setDeliverableOnly(true)}
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              deliverableOnly
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-muted-foreground hover:bg-accent'
            }`}
          >
            <IconStar size={12} />
            Deliverables ({assets.filter((a) => a.is_deliverable).length})
          </button>
        </div>

        <div className="sd-card">
          {loading ? (
            <div className="flex flex-col gap-2 p-4">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : error ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Failed to load assets.</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <IconFolder size={22} stroke={1.5} />
              </div>
              <p className="text-sm font-medium">No files yet</p>
              <p className="max-w-xs text-sm text-muted-foreground">
                Files uploaded to any project will show up here.
              </p>
            </div>
          ) : (
            filtered.map((a) => <AssetRow key={a.id} asset={a} />)
          )}
        </div>
      </div>
    </PageWrapper>
  )
}
