import { useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import {
  getPrimaryNavForRole,
  getSecondaryNavForRole,
  getActivePrimaryNavItem,
  isNavItemActive,
  type NavItem,
} from '@/components/layout/sidebar/nav-config'
import { NavIcon } from '@/components/layout/sidebar/nav-icon'
import useAuthStore from '@/store/authStore'
import useInboxUnread from '@/hooks/useInboxUnread'
import { cn } from '@/lib/utils'

function navLabel(title: string) {
  return title === 'Time Tracking' ? 'Time' : title
}

function FloatNavItems({
  items,
  mode,
  user,
  matchingSecondaryHref,
  badges,
}: {
  items: NavItem[]
  mode: 'primary' | 'secondary'
  user: { role?: string } | null | undefined
  matchingSecondaryHref?: string
  badges?: Partial<Record<string, number>>
}) {
  const { pathname } = useLocation()
  const activePrimary = getActivePrimaryNavItem(pathname, user?.role, user)

  return (
    <SidebarMenu className="sd-float-nav-menu">
      {items.map((item) => {
        const active =
          mode === 'primary'
            ? activePrimary?.href === item.href && !matchingSecondaryHref
            : isNavItemActive(item, pathname)

        const isInsights = item.variant === 'insights'
        const rawBadge =
          item.badgeKey && badges && Object.prototype.hasOwnProperty.call(badges, item.badgeKey)
            ? badges[item.badgeKey]
            : 0
        const badgeCount = Math.max(0, Math.floor(Number(rawBadge) || 0))

        return (
          <SidebarMenuItem key={`${item.href}-${item.title}`} className="sd-float-nav-item">
            <Link
              to={item.href}
              aria-label={
                badgeCount > 0 ? `${item.title}, ${badgeCount} unread` : item.title
              }
              className={cn(
                'sd-float-nav-entry',
                active && 'sd-float-nav-entry--active',
                active && isInsights && 'sd-float-nav-entry--insights-active',
                !active && isInsights && 'sd-float-nav-entry--insights',
              )}
            >
              <span
                className={cn(
                  'sd-float-nav-btn',
                  active && 'sd-float-nav-btn--active',
                  !active && isInsights && 'sd-float-nav-btn--insights',
                )}
              >
                {item.icon && <NavIcon icon={item.icon} size={22} stroke={1.5} />}
                <span className="sd-float-nav-label">{navLabel(item.title)}</span>
                {badgeCount > 0 ? (
                  <span className="sd-float-nav-dot" aria-hidden />
                ) : null}
              </span>
            </Link>
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  )
}

export function NavMain() {
  const { user } = useAuthStore()
  const { pathname } = useLocation()
  const unread = useInboxUnread()

  const primaryItems = useMemo(() => getPrimaryNavForRole(user?.role, user), [user])
  const secondaryItems = useMemo(() => getSecondaryNavForRole(user?.role, user), [user])

  const matchingSecondaryHref = useMemo(
    () => secondaryItems.find((item) => isNavItemActive(item, pathname))?.href,
    [secondaryItems, pathname],
  )

  const badges = useMemo(() => {
    const n = Math.max(0, Math.floor(Number(unread.total) || 0))
    return n > 0 ? { inbox: n } : {}
  }, [unread.total])

  return (
    <div className="sd-float-nav">
      <SidebarGroup className="p-0">
        <SidebarGroupContent>
          <FloatNavItems
            items={primaryItems}
            mode="primary"
            user={user}
            matchingSecondaryHref={matchingSecondaryHref}
            badges={badges}
          />
        </SidebarGroupContent>
      </SidebarGroup>

      {secondaryItems.length > 0 && (
        <>
          <div className="sd-float-nav-divider" role="separator" />
          <SidebarGroup className="p-0">
            <SidebarGroupContent>
              <FloatNavItems
                items={secondaryItems}
                mode="secondary"
                user={user}
                badges={badges}
              />
            </SidebarGroupContent>
          </SidebarGroup>
        </>
      )}
    </div>
  )
}
