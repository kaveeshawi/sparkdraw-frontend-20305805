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
