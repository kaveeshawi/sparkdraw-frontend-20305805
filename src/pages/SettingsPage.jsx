import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconUsers, IconArrowRight } from '@tabler/icons-react'
import { toast } from 'sonner'
import PageWrapper from '../components/layout/PageWrapper'
import PageHeader from '../components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { agencyApi } from '../services/api'
import useAuthStore from '../store/authStore'

export default function SettingsPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const [agency, setAgency] = useState(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [primary, setPrimary] = useState('#802AEE')
  const [light, setLight] = useState('#f3e8ff')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    agencyApi
      .show()
      .then((res) => {
        const a = res.data.data
        setAgency(a)
        setName(a.name || '')
        setPrimary(a.brand_colors?.primary || '#802AEE')
        setLight(a.brand_colors?.light || '#f3e8ff')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await agencyApi.update({
        name,
        brand_colors: { primary, light },
      })
      setAgency((prev) => ({ ...prev, ...res.data.data }))
      toast.success('Agency settings saved')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageWrapper>
      <div className="sd-page">
        <PageHeader title="Settings" subtitle="Manage your agency profile, branding, and team." />

        <div className="sd-card">
          <div className="sd-card-header">
            <div>
              <p className="sd-card-title">Agency profile</p>
              <p className="sd-card-desc">
                {isAdmin ? 'Your agency name and brand colors, used across the client portal.' : 'Only admins can edit these settings.'}
              </p>
            </div>
          </div>
          <div className="sd-card-body flex flex-col gap-4">
            {loading ? (
              <>
                <Skeleton className="h-9 w-full max-w-sm" />
                <Skeleton className="h-9 w-full max-w-sm" />
              </>
            ) : (
              <>
                <div className="flex max-w-sm flex-col gap-1.5">
                  <Label htmlFor="agency-name">Agency name</Label>
                  <Input
                    id="agency-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!isAdmin}
                  />
                </div>

                <div className="flex flex-wrap gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="primary-color">Primary color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        id="primary-color"
                        type="color"
                        value={primary}
                        onChange={(e) => setPrimary(e.target.value)}
                        disabled={!isAdmin}
                        className="size-9 cursor-pointer rounded-md border border-input bg-transparent p-0.5 disabled:cursor-not-allowed"
                      />
                      <Input
                        value={primary}
                        onChange={(e) => setPrimary(e.target.value)}
                        disabled={!isAdmin}
                        className="w-28"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="light-color">Light accent</Label>
                    <div className="flex items-center gap-2">
                      <input
                        id="light-color"
                        type="color"
                        value={light}
                        onChange={(e) => setLight(e.target.value)}
                        disabled={!isAdmin}
                        className="size-9 cursor-pointer rounded-md border border-input bg-transparent p-0.5 disabled:cursor-not-allowed"
                      />
                      <Input
                        value={light}
                        onChange={(e) => setLight(e.target.value)}
                        disabled={!isAdmin}
                        className="w-28"
                      />
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <Button onClick={handleSave} disabled={saving} className="self-start">
                    {saving ? 'Saving…' : 'Save changes'}
                  </Button>
                )}

                {agency?.domain_slug && (
                  <p className="text-xs text-muted-foreground">
                    Client portal slug: <code className="rounded bg-muted px-1.5 py-0.5">{agency.domain_slug}</code>
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <Link
          to="/team"
          className="sd-card flex items-center gap-3 px-5 py-4 transition-colors hover:bg-accent/50"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <IconUsers size={18} stroke={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Team management</p>
            <p className="text-xs text-muted-foreground">Invite members, change roles, and remove access.</p>
          </div>
          <IconArrowRight size={16} className="shrink-0 text-muted-foreground" />
        </Link>
      </div>
    </PageWrapper>
  )
}
