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
import { cn } from '@/lib/utils'

function navLabel(title: string) {
  return title === 'Time Tracking' ? 'Time' : title
}

function FloatNavItems({
  items,
  mode,
  userRole,
  matchingSecondaryHref,
}: {
  items: NavItem[]
  mode: 'primary' | 'secondary'
  userRole: string | undefined
  matchingSecondaryHref?: string
}) {
  const { pathname } = useLocation()
  const activePrimary = getActivePrimaryNavItem(pathname, userRole)

  return (
    <SidebarMenu className="sd-float-nav-menu">
      {items.map((item) => {
        const active =
          mode === 'primary'
            ? activePrimary?.href === item.href && !matchingSecondaryHref
            : isNavItemActive(item, pathname)

        const isInsights = item.variant === 'insights'

        return (
          <SidebarMenuItem key={`${item.href}-${item.title}`} className="sd-float-nav-item">
            <Link
              to={item.href}
              aria-label={item.title}
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

  const primaryItems = useMemo(() => getPrimaryNavForRole(user?.role), [user?.role])
  const secondaryItems = useMemo(() => getSecondaryNavForRole(user?.role), [user?.role])

  const matchingSecondaryHref = useMemo(
    () => secondaryItems.find((item) => isNavItemActive(item, pathname))?.href,
    [secondaryItems, pathname],
  )

  return (
    <div className="sd-float-nav">
      <SidebarGroup className="p-0">
        <SidebarGroupContent>
          <FloatNavItems
            items={primaryItems}
            mode="primary"
            userRole={user?.role}
            matchingSecondaryHref={matchingSecondaryHref}
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
                userRole={user?.role}
              />
            </SidebarGroupContent>
          </SidebarGroup>
        </>
      )}
    </div>
  )
}
