import { departmentsApi } from '@/services/api'

const STORAGE_PREFIX = 'sparkdraw.departments'

export function departmentStorageKey(agencyId) {
  return `${STORAGE_PREFIX}.${agencyId || 'default'}`
}

export function loadDepartments(agencyId) {
  try {
    const raw = localStorage.getItem(departmentStorageKey(agencyId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveDepartments(agencyId, departments) {
  localStorage.setItem(departmentStorageKey(agencyId), JSON.stringify(departments))
}

export async function fetchDepartments(agencyId) {
  try {
    const res = await departmentsApi.index()
    const rows = res.data.data || []
    saveDepartments(agencyId, rows)
    return rows
  } catch {
    return loadDepartments(agencyId)
  }
}

export function createDepartmentId() {
  return `dept_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function membersForDepartment(members, departmentName) {
  const needle = (departmentName || '').trim().toLowerCase()
  if (!needle) return []
  return members.filter(
    (m) => (m.department || '').trim().toLowerCase() === needle,
  )
}

/** @deprecated Local-only rename; backend syncs users on department update. */
export function renameDepartmentMembers(agencyId, members, oldName, newName) {
  const oldNeedle = oldName.trim().toLowerCase()
  members.forEach((m) => {
    if ((m.department || '').trim().toLowerCase() === oldNeedle) {
      m.department = newName
    }
  })
}
