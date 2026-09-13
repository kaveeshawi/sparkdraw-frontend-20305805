import { useEffect, useMemo, useState } from 'react'
import {
  IconCheckbox,
  IconChevronDown,
  IconFolder,
  IconLayoutDashboard,
  IconMessageCircle,
  IconMessages,
  IconReceipt,
} from '@tabler/icons-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarProvider,
} from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { UserMenu } from '@/components/layout/user-menu'
import FloatPageHeader from '@/components/layout/FloatPageHeader'
import Logo from '@/components/layout/logo'
import { NavIcon } from '@/components/layout/sidebar/nav-icon'
import { agencyLogoSrc } from '@/lib/media'
import { cn } from '@/lib/utils'
import { setAgencyCurrency } from '@/hooks/useAgencyCurrency'
import useAuthStore from '../../store/authStore'
import { portalApi } from '../../services/api'
import useInboxUnread from '../../hooks/useInboxUnread'

const FALLBACK_BRANDING = {
  agency_name: 'Agency portal',
  logo_url: null,
  logo_path: null,
  primary_color: '#802AEE',
  primary_light: '#f3e8ff',
  currency: 'USD',
}

const NAV_ITEMS = [
  { key: 'overview', icon: IconLayoutDashboard, label: 'Overview' },
  { key: 'chat', icon: IconMessages, label: 'Chat' },
  { key: 'feedback', icon: IconMessageCircle, label: 'Feedback' },
  { key: 'approvals', icon: IconCheckbox, label: 'Approvals' },
  { key: 'assets', icon: IconFolder, label: 'Assets' },
  { key: 'invoices', icon: IconReceipt, label: 'Invoices' },
]

const BRAND_VARS = [
  '--primary',
  '--ring',
  '--sidebar-primary',
  '--sidebar-ring',
  '--sd-grad-from',
  '--sd-grad-mid',
  '--sd-grad-to',
  '--accent-foreground',
  '--sidebar-accent-foreground',
  '--sd-grad',
  '--sd-grad-soft',
  '--accent',
  '--sidebar-accent',
  '--primary-light',
]

function brandingFromAgency(agency) {
  if (!agency) return null
  return {
    agency_name: agency.name || FALLBACK_BRANDING.agency_name,
    logo_url: agency.logo_url || null,
    logo_path: agency.logo_path || null,
    primary_color: agency.brand_colors?.primary || FALLBACK_BRANDING.primary_color,
    primary_light: agency.brand_colors?.light || FALLBACK_BRANDING.primary_light,
    currency: agency.currency || FALLBACK_BRANDING.currency,
  }
}

function applyWhiteLabelColors(primary, light, target = document.documentElement) {
  if (!target) return
  const p = primary || FALLBACK_BRANDING.primary_color
  const l = light || FALLBACK_BRANDING.primary_light
  target.style.setProperty('--primary', p)
  target.style.setProperty('--ring', p)
  target.style.setProperty('--sidebar-primary', p)
  target.style.setProperty('--sidebar-ring', p)
  target.style.setProperty('--sd-grad-from', p)
  target.style.setProperty('--sd-grad-mid', p)
  target.style.setProperty('--sd-grad-to', p)
  target.style.setProperty('--accent-foreground', p)
  target.style.setProperty('--sidebar-accent-foreground', p)
  target.style.setProperty('--sd-grad', `linear-gradient(135deg, ${p} 0%, ${p} 100%)`)
  target.style.setProperty('--sd-grad-soft', `color-mix(in srgb, ${p} 12%, transparent)`)
  target.style.setProperty('--accent', l)
  target.style.setProperty('--sidebar-accent', l)
  target.style.setProperty('--primary-light', l)
}

function clearWhiteLabelColors(target = document.documentElement) {
  if (!target) return
  BRAND_VARS.forEach((key) => target.style.removeProperty(key))
}

export default function ClientPortal({
  slug,
  children,
  activeTab,
  onTabChange,
  projects = [],
  projectId = null,
  onProjectChange,
  projectsLoading = false,
  pageTitle,
  pageSubtitle,
}) {
  const authAgency = useAuthStore((s) => s.user?.agency)
  const unread = useInboxUnread()
  const [branding, setBranding] = useState(
    () => brandingFromAgency(authAgency) || FALLBACK_BRANDING
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) {
      setLoading(false)
      return undefined
    }

    setLoading(true)
    portalApi
      .getBranding(slug)
      .then((res) => {
        const b = res.data.data || res.data
        setBranding({
          ...FALLBACK_BRANDING,
          ...b,
          primary_color: b?.primary_color || FALLBACK_BRANDING.primary_color,
          primary_light: b?.primary_light || FALLBACK_BRANDING.primary_light,
        })
        if (b?.currency) setAgencyCurrency(b.currency)
      })
      .catch(() => {
        setBranding(brandingFromAgency(authAgency) || FALLBACK_BRANDING)
      })
      .finally(() => setLoading(false))

    return () => clearWhiteLabelColors()
  }, [slug, authAgency])

  useEffect(() => {
    applyWhiteLabelColors(branding.primary_color, branding.primary_light)
    return () => clearWhiteLabelColors()
  }, [branding.primary_color, branding.primary_light])

  const logoSrc = useMemo(
    () => agencyLogoSrc(branding),
    [branding.logo_url, branding.logo_path]
  )

  const selectedProject = projects.find((p) => String(p.id) === String(projectId))
  const multiProject = projects.length > 1

  const shellStyle = {
    '--sidebar-width': '13.5rem',
    '--sidebar-width-icon': '13.5rem',
    '--sd-header-height': '3.75rem',
    '--primary': branding.primary_color || FALLBACK_BRANDING.primary_color,
    '--ring': branding.primary_color || FALLBACK_BRANDING.primary_color,
    '--sidebar-primary': branding.primary_color || FALLBACK_BRANDING.primary_color,
    '--sd-grad-from': branding.primary_color || FALLBACK_BRANDING.primary_color,
    '--sd-grad-mid': branding.primary_color || FALLBACK_BRANDING.primary_color,
    '--sd-grad-to': branding.primary_color || FALLBACK_BRANDING.primary_color,
    '--sd-grad': `linear-gradient(135deg, ${branding.primary_color || FALLBACK_BRANDING.primary_color} 0%, ${branding.primary_color || FALLBACK_BRANDING.primary_color} 100%)`,
    '--accent': branding.primary_light || FALLBACK_BRANDING.primary_light,
    '--sidebar-accent': branding.primary_light || FALLBACK_BRANDING.primary_light,
    '--primary-light': branding.primary_light || FALLBACK_BRANDING.primary_light,
  }

  if (loading) {
    return (
      <div className="sd-shell-root flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        Loading portal…
      </div>
    )
  }

  return (
    <TooltipProvider>
      <SidebarProvider
        defaultOpen={false}
        className="sd-shell-root sd-portal-shell !min-h-0"
        style={shellStyle}
      >
        <Sidebar collapsible="icon" className="sd-sidebar sd-sidebar--float border-r-0">
          <SidebarHeader className="sd-sidebar-brand sd-sidebar-brand--float !flex-row !items-center !justify-start !gap-0 !p-0">
            <div
              className="sd-float-brand sd-sidebar-logo"
              aria-label={branding.agency_name}
              title={branding.agency_name}
            >
              {logoSrc ? (
                <img
                  src={logoSrc}
                  alt=""
                  className="sd-sidebar-logo__mark size-[2.375rem] shrink-0 rounded-[0.875rem] object-cover"
                />
              ) : (
                <Logo className="sd-sidebar-logo__mark shrink-0 rounded-2xl" />
              )}
              <span className="sd-sidebar-logo__text truncate">{branding.agency_name}</span>
            </div>
          </SidebarHeader>

          <SidebarContent className="sd-sidebar-main sd-sidebar-main--float">
            <div className="sd-float-nav">
              <SidebarGroup className="p-0">
                <SidebarGroupContent>
                  <SidebarMenu className="sd-float-nav-menu">
                    {NAV_ITEMS.map((item) => {
                      const active = activeTab === item.key
                      const chatUnread = Math.max(
                        0,
                        Math.floor(Number(item.key === 'chat' ? unread.total : 0) || 0)
                      )
                      return (
                        <SidebarMenuItem key={item.key} className="sd-float-nav-item">
                          <button
                            type="button"
                            aria-label={
                              chatUnread > 0
                                ? `${item.label}, ${chatUnread} unread`
                                : item.label
                            }
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                              'sd-float-nav-entry',
                              active && 'sd-float-nav-entry--active'
                            )}
                            onClick={() => onTabChange?.(item.key)}
                          >
                            <span
                              className={cn(
                                'sd-float-nav-btn',
                                active && 'sd-float-nav-btn--active'
                              )}
                            >
                              <NavIcon icon={item.icon} size={22} stroke={1.5} />
                              <span className="sd-float-nav-label">{item.label}</span>
                              {chatUnread > 0 ? (
                                <span className="sd-float-nav-dot" aria-hidden />
                              ) : null}
                            </span>
                          </button>
                        </SidebarMenuItem>
                      )
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </div>
          </SidebarContent>

          <SidebarFooter className="sd-sidebar-footer sd-sidebar-footer--float" />
        </Sidebar>

        <SidebarInset className="sd-shell-main">
          <div className="sd-shell-viewport">
            <header className="sd-float-topbar" aria-label="Portal utilities">
              <div className="sd-float-topbar__search min-w-0">
                {projectsLoading ? (
                  <p className="truncate text-sm text-muted-foreground">Loading projects…</p>
                ) : multiProject ? (
                  <div className="sd-portal-switcher">
                    <select
                      id="portal-project-switcher"
                      className="sd-portal-switcher__select"
                      value={projectId || ''}
                      aria-label="Switch project"
                      onChange={(e) => onProjectChange?.(Number(e.target.value) || null)}
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <IconChevronDown
                      size={14}
                      className="sd-portal-switcher__chevron"
                      aria-hidden
                    />
                  </div>
                ) : selectedProject ? (
                  <p className="truncate text-sm font-medium text-foreground">
                    {selectedProject.name}
                  </p>
                ) : (
                  <p className="truncate text-sm text-muted-foreground">Client portal</p>
                )}
              </div>
              <div className="sd-float-topbar__dock">
                <ThemeToggle />
                <UserMenu />
              </div>
            </header>

            {pageTitle ? (
              <div className="sd-float-page-header">
                <FloatPageHeader title={pageTitle} subtitle={pageSubtitle} />
              </div>
            ) : null}

            <div className="sd-shell-content sd-animate-in">{children}</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
