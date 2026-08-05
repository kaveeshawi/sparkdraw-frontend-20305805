/**
 * Resolve avatar/media URLs for team member photos.
 */
export function memberPhotoSrc(member) {
  if (!member) return ''

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
  const backendOrigin = apiBase.replace(/\/api\/v1\/?$/, '')

  const raw = member.avatar_url || member.photo_preview || ''
  if (raw.startsWith('blob:') || raw.startsWith('data:')) return raw

  let pathname = ''

  if (member.avatar_path) {
    const clean = String(member.avatar_path).replace(/^\/+/, '')
    pathname = clean.startsWith('storage/') ? `/${clean}` : `/storage/${clean}`
  } else if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      pathname = new URL(raw).pathname
    } catch {
      return raw
    }
  } else if (raw.startsWith('/storage/')) {
    pathname = raw.split('?')[0]
  } else if (raw.includes('agencies/')) {
    pathname = `/storage/${raw.replace(/^\/+/, '').replace(/^storage\//, '')}`
  }

  if (!pathname) return ''

  const url = `${backendOrigin}${pathname}`
  const version = member.avatar_version || member.updated_at
  if (version && !url.includes('?')) {
    const stamp =
      typeof version === 'string' ? Date.parse(version) || version : version
    return `${url}?v=${encodeURIComponent(String(stamp))}`
  }

  return url
}

/** Same resolver for client contact photos (flattened on client payload). */
export function clientPhotoSrc(client) {
  return memberPhotoSrc(client)
}

export function getAgencyId(user) {
  return user?.agency?.id ?? user?.agency_id ?? null
}
