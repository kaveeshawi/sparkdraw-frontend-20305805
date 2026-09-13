import { DEFAULT_PERMISSIONS } from '@/components/team/permissionCatalog'

/** Agency owner / admin roles that unlock financial + AI admin surfaces. */
const AGENCY_ADMIN_ROLES = new Set(['admin', 'agency_admin'])

export function normalizeRole(role) {
  return String(role || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
}

export function isAgencyAdmin(user) {
  if (!user) return false
  if (user.is_protected) return true
  return AGENCY_ADMIN_ROLES.has(normalizeRole(user.role))
}

export function isAgencyStaff(user) {
  const role = normalizeRole(user?.role)
  return role === 'admin' || role === 'agency_admin' || role === 'pm' || role === 'member'
}

/** Permission check — prefers auth payload; falls back to base-role defaults. */
export function userHasPermission(user, key) {
  if (!user) return false
  if (isAgencyAdmin(user)) return true
  const role = normalizeRole(user.role)
  if (role === 'client') return false

  if (user.permissions && Object.prototype.hasOwnProperty.call(user.permissions, key)) {
    return Boolean(user.permissions[key])
  }

  const defaults = DEFAULT_PERMISSIONS[role] || {}
  return Boolean(defaults[key])
}

export function canViewAllProjects(user) {
  return userHasPermission(user, 'projects.view_all')
}

export function canSeeAgencyOverview(user) {
  return userHasPermission(user, 'workspace.agency_overview')
}

export function canAccessClients(user) {
  return userHasPermission(user, 'clients.manage') || userHasPermission(user, 'clients.view_all')
}

export function canViewAllClients(user) {
  return userHasPermission(user, 'clients.view_all')
}

/** Post-login / guest redirect destination */
export function homePathForUser(user) {
  const role = normalizeRole(user?.role)
  if (role === 'client') return '/portal'
  if (role === 'member') return '/tasks'
  return '/'
}
