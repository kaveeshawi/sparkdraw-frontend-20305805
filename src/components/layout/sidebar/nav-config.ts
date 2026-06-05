import {
  IconLayoutDashboard,
  IconBriefcase,
  IconListCheck,
  IconUsers,
  IconCalendar,
  IconClock,
  IconRefresh,
  IconReceipt,
  IconFolder,
  IconSparkles,
  IconInbox,
  IconMessageChatbot,
  IconTrendingUp,
  IconHeartbeat,
  IconUsersGroup,
  IconPlugConnected,
  type Icon,
} from '@tabler/icons-react'

export type AgencyRole = 'admin' | 'pm' | 'member' | 'client'

export type BadgeKey = 'tasks' | 'revisions' | 'inbox'

export type NavItem = {
  title: string
  href: string
  icon?: Icon
  exact?: boolean
  badge?: string | number
  badgeKey?: BadgeKey
  badgeVariant?: 'default' | 'primary' | 'destructive' | 'new' | 'ai'
  roles?: AgencyRole[]
  /** Prefixes that mark this item active (for section hubs) */
  activePrefixes?: string[]
  /** Visual variant for differentiated items */
  variant?: 'default' | 'insights'
}

export type NavSection = {
  title?: string
  roles?: AgencyRole[]
  items: NavItem[]
}

export type FooterNavItem = NavItem & {
  id: 'team' | 'settings' | 'logout'
  action?: 'logout'
}

/** Primary sidebar navigation — former header pills */
export const PRIMARY_NAV: NavItem[] = [
  {
    title: 'Overview',
    href: '/',
    icon: IconLayoutDashboard,
    exact: true,
    activePrefixes: ['/'],
  },
  {
    title: 'Projects',
    href: '/projects',
    icon: IconBriefcase,
    activePrefixes: ['/projects', '/tasks', '/calendar', '/revisions', '/workload', '/assets'],
  },
  {
    title: 'Clients',
    href: '/clients',
    icon: IconUsers,
    activePrefixes: ['/clients', '/inbox'],
  },
  {
    title: 'Insights',
    href: '/ai-studio',
    icon: IconSparkles,
    roles: ['admin', 'pm'],
    variant: 'insights',
    badge: 'AI',
    badgeVariant: 'ai',
    activePrefixes: ['/ai-studio', '/health-scores', '/feedback-translator', '/upsell-engine'],
  },
  {
    title: 'Finance',
    href: '/invoices',
    icon: IconReceipt,
    roles: ['admin'],
    activePrefixes: ['/invoices', '/reports'],
  },
]

/** Secondary sidebar — daily workspace tools (labeled, below primary) */
export const SECONDARY_NAV: NavItem[] = [
  { title: 'Tasks', href: '/tasks', icon: IconListCheck, badgeKey: 'tasks' },
  { title: 'Inbox', href: '/inbox', icon: IconInbox, badgeKey: 'inbox', roles: ['admin', 'pm'] },
  { title: 'Calendar', href: '/calendar', icon: IconCalendar },
  { title: 'Time', href: '/workload', icon: IconClock },
  {
    title: 'Revisions',
    href: '/revisions',
    icon: IconRefresh,
    badgeKey: 'revisions',
    roles: ['admin', 'pm'],
  },
  { title: 'Assets', href: '/assets', icon: IconFolder },
  {
    title: 'Team',
    href: '/team',
    icon: IconUsersGroup,
    roles: ['admin'],
    activePrefixes: ['/team'],
  },
  {
    title: 'Integrations',
    href: '/integrations',
    icon: IconPlugConnected,
    roles: ['admin'],
    activePrefixes: ['/integrations'],
  },
]

export const SIDEBAR_FOOTER: FooterNavItem[] = []

/** Command palette — full route index */
export const COMMAND_PALETTE_SECTIONS: NavSection[] = [
  {
    title: 'Projects',
    items: [
      { title: 'Projects', href: '/projects', icon: IconBriefcase },
      { title: 'Tasks', href: '/tasks', icon: IconListCheck },
      { title: 'Calendar', href: '/calendar', icon: IconCalendar },
      { title: 'Time', href: '/workload', icon: IconClock },
      { title: 'Revisions', href: '/revisions', icon: IconRefresh, roles: ['admin', 'pm'] },
      { title: 'Assets', href: '/assets', icon: IconFolder },
      { title: 'Team', href: '/team', icon: IconUsersGroup, roles: ['admin'] },
    ],
  },
  {
    title: 'Clients',
    items: [
      { title: 'Clients', href: '/clients', icon: IconUsers },
      { title: 'Inbox', href: '/inbox', icon: IconInbox, roles: ['admin', 'pm'] },
    ],
  },
  {
    title: 'Insights',
    roles: ['admin', 'pm'],
    items: [
      { title: 'AI Studio', href: '/ai-studio', icon: IconSparkles },
      { title: 'Health Scores', href: '/health-scores', icon: IconHeartbeat },
      { title: 'Feedback Translator', href: '/feedback-translator', icon: IconMessageChatbot },
      { title: 'Upsell Suggestions', href: '/upsell-engine', icon: IconTrendingUp },
    ],
  },
  {
    title: 'Finance',
    roles: ['admin'],
    items: [
      { title: 'Invoices', href: '/invoices', icon: IconReceipt },
    ],
  },
  {
    title: 'Agency',
    items: [
      { title: 'Overview', href: '/', icon: IconLayoutDashboard, exact: true },
      { title: 'Team', href: '/team', icon: IconUsersGroup, roles: ['admin'] },
      { title: 'Integrations', href: '/integrations', icon: IconPlugConnected, roles: ['admin'] },
    ],
  },
]

export const NAV_GROUPS = COMMAND_PALETTE_SECTIONS

function roleAllowed(roles: AgencyRole[] | undefined, userRole: string | undefined): boolean {
  if (!roles || roles.length === 0) return true
  if (!userRole) return false
  return roles.includes(userRole as AgencyRole)
}

export function filterNavItems(items: NavItem[], userRole: string | undefined): NavItem[] {
  return items.filter((item) => roleAllowed(item.roles, userRole))
}

export function getPrimaryNavForRole(userRole: string | undefined): NavItem[] {
  return filterNavItems(PRIMARY_NAV, userRole)
}

export function getSecondaryNavForRole(userRole: string | undefined): NavItem[] {
  return filterNavItems(SECONDARY_NAV, userRole)
}

export function getFooterNavForRole(userRole: string | undefined): FooterNavItem[] {
  return filterNavItems(SIDEBAR_FOOTER, userRole) as FooterNavItem[]
}

export function getCommandPaletteSectionsForRole(userRole: string | undefined): NavSection[] {
  return COMMAND_PALETTE_SECTIONS.map((section) => ({
    ...section,
    items: filterNavItems(section.items, userRole),
  })).filter((section) => section.items.length > 0)
}

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.activePrefixes && item.activePrefixes.length > 0) {
    if (item.exact) {
      return pathname === item.href
    }
    return item.activePrefixes.some((prefix) => {
      if (prefix === '/') return pathname === '/'
      return pathname === prefix || pathname.startsWith(`${prefix}/`)
    })
  }

  if (item.exact) {
    return pathname === item.href
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

/** Best matching primary nav item for current path */
export function getActivePrimaryNavItem(
  pathname: string,
  userRole: string | undefined,
): NavItem | undefined {
  const items = getPrimaryNavForRole(userRole)
  let best: NavItem | undefined
  let bestLen = -1

  for (const item of items) {
    if (!isNavItemActive(item, pathname)) continue
    const matchLen = item.activePrefixes
      ? Math.max(
          ...item.activePrefixes
            .filter((p) => (p === '/' ? pathname === '/' : pathname === p || pathname.startsWith(`${p}/`)))
            .map((p) => p.length),
          item.exact ? 1 : 0,
        )
      : item.href.length
    if (matchLen > bestLen) {
      bestLen = matchLen
      best = item
    }
  }

  return best
}

export function isSecondaryNavItemActive(
  item: NavItem,
  pathname: string,
): boolean {
  return isNavItemActive(item, pathname)
}
