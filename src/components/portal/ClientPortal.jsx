import { useEffect, useState } from 'react'
import { IconBolt, IconLayoutDashboard, IconMessageCircle, IconCheckbox, IconReceipt } from '@tabler/icons-react'
import { portalApi } from '../../services/api'
import { cn } from '@/lib/utils'

// TODO Session 5.x — replace with real branding API response
const MOCK_BRANDING = {
  agency_name:    'Acme Creative',
  logo_url:       null,
  primary_color:  '#802AEE',
  primary_light:  '#f3e8ff',
}

const NAV_ITEMS = [
  { key: 'overview',   icon: IconLayoutDashboard, label: 'Overview' },
  { key: 'feedback',   icon: IconMessageCircle,   label: 'Feedback' },
  { key: 'approvals',  icon: IconCheckbox,         label: 'Approvals' },
  { key: 'invoices',   icon: IconReceipt,          label: 'Invoices' },
]

function NavItem({ item, active, onClick }) {
  return (
    <button
      onClick={() => onClick(item.key)}
      className={cn(
        'portal-nav-item flex w-full items-center gap-2 px-4 py-2 text-xs text-left cursor-pointer transition-all',
        active && 'portal-nav-item--active'
      )}
    >
      <item.icon size={15} />
      {item.label}
    </button>
  )
}

export default function ClientPortal({ slug, children, activeTab, onTabChange }) {
  const [branding, setBranding] = useState(MOCK_BRANDING)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!slug) { setLoading(false); return }

    portalApi
      .getBranding(slug)
      .then((res) => {
        const b = res.data.data || res.data
        setBranding(b)
      })
      .catch((err) => {
        if (err.response?.status === 404) setBranding(MOCK_BRANDING)
      })
      .finally(() => setLoading(false))
  }, [slug])

  // Inject CSS variables from agency branding (white-label mechanism — keep intact)
  useEffect(() => {
    if (branding?.primary_color) {
      document.documentElement.style.setProperty('--portal-primary', branding.primary_color)
    }
    if (branding?.primary_light) {
      document.documentElement.style.setProperty('--portal-primary-light', branding.primary_light)
    }
    return () => {
      document.documentElement.style.removeProperty('--portal-primary')
      document.documentElement.style.removeProperty('--portal-primary-light')
    }
  }, [branding])

  if (loading) {
    return (
      <div className="portal-root flex items-center justify-center text-xs text-muted-foreground">
        Loading portal…
      </div>
    )
  }

  return (
    <div className="portal-root flex h-screen overflow-hidden">
      {/* Portal sidebar — always light, glass */}
      <div className="portal-sidebar flex h-screen w-[220px] min-w-[220px] flex-col overflow-hidden">
        {/* Agency logo + name */}
        <div className="portal-sidebar__brand flex shrink-0 items-center gap-2.5 px-4 py-4">
          {branding.logo_url ? (
            <img
              src={branding.logo_url}
              alt={branding.agency_name}
              className="size-7 shrink-0 rounded-lg object-contain"
            />
          ) : (
            <div className="portal-logo-mark flex size-7 shrink-0 items-center justify-center rounded-lg">
              <IconBolt size={14} color="#fff" />
            </div>
          )}
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium text-foreground">
              {branding.agency_name}
            </div>
            <div className="text-[10px] text-muted-foreground">Client portal</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto pt-2">
          {NAV_ITEMS.map((item) => (
            <NavItem
              key={item.key}
              item={item}
              active={activeTab === item.key}
              onClick={onTabChange}
            />
          ))}
        </nav>

        {/* Footer */}
        <div className="portal-sidebar__foot shrink-0 px-4 py-3 text-[10px] text-muted-foreground">
          Powered by <span className="font-medium text-foreground">Sparkdraw</span>
        </div>
      </div>

      {/* Main content area */}
      <main className="portal-main flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  )
}
