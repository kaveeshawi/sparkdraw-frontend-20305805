const STORAGE_PREFIX = 'sparkdraw.emp-seq'

function storageKey(agencyId) {
  return `${STORAGE_PREFIX}.${agencyId || 'default'}`
}

function parseEmpNumber(value) {
  if (typeof value !== 'string') return 0
  const match = value.trim().match(/^EMP-(\d+)$/i)
  return match ? parseInt(match[1], 10) : 0
}

export function formatEmployeeId(n) {
  return `EMP-${String(Math.max(1, n)).padStart(4, '0')}`
}

/**
 * Next EMP-#### from local counter + existing member employee_ids.
 */
export function peekNextEmployeeId(agencyId, members = []) {
  let max = 0
  for (const m of members) {
    max = Math.max(max, parseEmpNumber(m.employee_id || m.employeeId || ''))
  }
  try {
    const stored = parseInt(localStorage.getItem(storageKey(agencyId)) || '0', 10)
    if (!Number.isNaN(stored)) max = Math.max(max, stored)
  } catch {
    /* ignore */
  }
  return formatEmployeeId(max + 1)
}

/** Persist sequence after a successful add so IDs keep incrementing. */
export function commitEmployeeId(agencyId, employeeId) {
  const n = parseEmpNumber(employeeId)
  if (!n) return
  try {
    const key = storageKey(agencyId)
    const prev = parseInt(localStorage.getItem(key) || '0', 10) || 0
    localStorage.setItem(key, String(Math.max(prev, n)))
  } catch {
    /* ignore */
  }
}
