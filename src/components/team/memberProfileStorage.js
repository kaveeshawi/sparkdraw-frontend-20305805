const STORAGE_PREFIX = 'sparkdraw.member-profiles'

function storageKey(agencyId) {
  return `${STORAGE_PREFIX}.${agencyId || 'default'}`
}

function readAll(agencyId) {
  try {
    const raw = localStorage.getItem(storageKey(agencyId))
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeAll(agencyId, map) {
  try {
    localStorage.setItem(storageKey(agencyId), JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

function profileKey(member) {
  if (!member) return null
  if (member.id != null) return String(member.id)
  if (member.email) return `email:${String(member.email).toLowerCase()}`
  return null
}

export function saveMemberProfile(agencyId, memberOrId, profile) {
  const key =
    typeof memberOrId === 'object' ? profileKey(memberOrId) : String(memberOrId)
  if (!key) return
  const map = readAll(agencyId)
  map[key] = {
    ...(map[key] || {}),
    ...profile,
    updated_at: new Date().toISOString(),
  }
  // Also index by email when available
  if (profile.email) {
    map[`email:${String(profile.email).toLowerCase()}`] = map[key]
  }
  writeAll(agencyId, map)
}

export function loadMemberProfile(agencyId, member) {
  const key = profileKey(member)
  if (!key) return null
  const map = readAll(agencyId)
  return map[key] || (member?.email ? map[`email:${String(member.email).toLowerCase()}`] : null) || null
}

export function removeMemberProfile(agencyId, member) {
  const key = profileKey(member)
  if (!key) return
  const map = readAll(agencyId)
  delete map[key]
  if (member?.email) delete map[`email:${String(member.email).toLowerCase()}`]
  writeAll(agencyId, map)
}

/** Merge API member + local extended profile fields for display. API wins for persisted fields. */
export function mergeMemberProfile(agencyId, member) {
  if (!member) return null
  const local = loadMemberProfile(agencyId, member) || {}
  const meta = member.profile_meta || {}
  const isAdmin = member.role === 'admin' || member.is_protected

  const first_name = member.first_name || meta.first_name || local.first_name || ''
  const last_name = member.last_name || meta.last_name || local.last_name || ''
  const fromParts = `${first_name} ${last_name}`.trim()
  const department =
    (member.department ?? '').trim() || (isAdmin ? 'Management' : '')

  const avatar_url = member.avatar_url || local.avatar_url || ''
  const avatar_path = member.avatar_path || local.avatar_path || ''
  const localPreview =
    local.photo_preview
    && !String(local.photo_preview).startsWith('blob:')
      ? local.photo_preview
      : ''

  return {
    ...local,
    ...member,
    ...meta,
    first_name,
    last_name,
    name: fromParts || member.name || local.name || '',
    address: member.address || meta.address || local.address || '',
    birthday: member.birthday || meta.birthday || local.birthday || '',
    gender: member.gender || meta.gender || local.gender || '',
    start_date: member.start_date || meta.start_date || local.start_date || '',
    work_location: member.work_location || meta.work_location || local.work_location || '',
    employee_id: isAdmin ? '' : (member.employee_id || meta.employee_id || local.employee_id || ''),
    phone_country: member.phone_country || meta.phone_country || local.phone_country || '',
    phone: member.phone || local.phone || '',
    job_title: member.job_title || local.job_title || '',
    department,
    employment_type: member.employment_type || local.employment_type || '',
    avatar_url,
    avatar_path,
    photo_preview: avatar_url || localPreview,
    avatar_version: member.avatar_version || member.updated_at || local.avatar_version || '',
    role: member.role || local.role || 'member',
    is_protected: member.is_protected ?? isAdmin,
  }
}
