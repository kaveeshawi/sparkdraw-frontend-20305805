import { toast } from 'sonner'
import { IconExternalLink, IconMail, IconMessage } from '@tabler/icons-react'

export const FILTER_PILLS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'vip', label: 'VIP' },
  { id: 'enterprise', label: 'Enterprise' },
  { id: 'pending', label: 'Pending invite' },
]

export const SENTIMENT_LABELS = {
  positive: 'Positive',
  neutral: 'Neutral',
  negative: 'Negative',
}

export const AVATAR_COLORS = [
  { bg: '#FFF7ED', fg: '#EA580C' },
  { bg: '#EEF2FF', fg: '#4F46E5' },
  { bg: '#ECFDF5', fg: '#059669' },
  { bg: '#FDF2F8', fg: '#DB2777' },
  { bg: '#EFF6FF', fg: '#2563EB' },
  { bg: '#FEF3C7', fg: '#D97706' },
  { bg: '#F5F3FF', fg: '#7C3AED' },
  { bg: '#F0FDFA', fg: '#0D9488' },
  { bg: '#FEF2F2', fg: '#DC2626' },
  { bg: '#F0F9FF', fg: '#0284C7' },
  { bg: '#FAF5FF', fg: '#9333EA' },
  { bg: '#ECFEFF', fg: '#0891B2' },
]

export const CONTACT_ACTIONS = [
  { id: 'chat', label: 'Chat', icon: IconMessage },
  { id: 'mail', label: 'Mail', icon: IconMail },
  { id: 'whatsapp', label: 'WhatsApp', icon: null },
  { id: 'teams', label: 'Teams', icon: null },
]

export function displayClientName(client) {
  return client?.company_name?.trim() || 'Client'
}

/** Primary card title — contact person (first + last when available). */
export function displayContactPersonName(client) {
  const first = client?.first_name?.trim() || client?.contact_first_name?.trim() || ''
  const last = client?.last_name?.trim() || client?.contact_last_name?.trim() || ''
  const fromParts = `${first} ${last}`.trim()
  if (fromParts) return fromParts
  return client?.contact_name?.trim() || 'Client contact'
}

export function displayContactName(client) {
  return displayContactPersonName(client)
}

export function displayClientPosition(client) {
  return (
    client?.job_title?.trim() ||
    client?.contact_job_title?.trim() ||
    client?.position?.trim() ||
    '—'
  )
}

export function sentimentBadgeLabel(client) {
  if (client?.at_risk) return 'At risk'
  if (!client?.sentiment_label) return 'No data'
  return SENTIMENT_LABELS[client.sentiment_label] || client.sentiment_label
}

export function hashNameColor(seed) {
  const str = String(seed || 'Client')
  let hash = 0
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

export function clientColorSeed(client) {
  return `${client?.id ?? ''}-${client?.company_name || ''}-${client?.contact_name || ''}`
}

/** VIP / Enterprise star badge — same pattern as team admin/pm stars. */
export function getClientTierBadge(client) {
  const tier = String(client?.tier || '').toLowerCase()
  if (tier === 'vip') {
    return {
      className: 'sd-client-avatar__vip-star',
      label: 'VIP',
    }
  }
  if (tier === 'enterprise') {
    return {
      className: 'sd-client-avatar__enterprise-star',
      label: 'Enterprise',
    }
  }
  return null
}

export function projectsCountLabel(client) {
  const count = Number(client?.projects_count ?? 0)
  if (count <= 0) return 'No projects yet'
  return count === 1 ? '1 project' : `${count} projects`
}

export function projectsLabel(client) {
  return projectsCountLabel(client)
}

export function projectsActiveLabel(client) {
  return projectsCountLabel(client)
}

export function clientInviteState(client) {
  return client?.invite_status || 'active'
}

export function isPendingInvite(client) {
  const state = clientInviteState(client)
  return state === 'invite_pending' || state === 'invite_not_sent' || state === 'invite_expired'
}

export function inviteActionLabel(status) {
  if (status === 'invite_pending') return 'Resend portal invite'
  if (status === 'invite_expired') return 'Resend portal invite'
  return 'Invite to portal'
}

export function matchesClientFilter(client, filterId) {
  if (filterId === 'all') return true
  if (filterId === 'pending') return isPendingInvite(client)
  if (filterId === 'vip') return String(client?.tier || '').toLowerCase() === 'vip'
  if (filterId === 'enterprise') return String(client?.tier || '').toLowerCase() === 'enterprise'
  if (filterId === 'active') return !isPendingInvite(client)
  return true
}

export function portalPath(client) {
  const slug = client?.domain_slug
  return slug ? `/portal/${slug}` : '/portal'
}

export function canShowContactDetails(client) {
  return Boolean(client?.contact_email || client?.contact_name || client?.contact_first_name)
}

export function handleClientContactAction(e, actionId, client) {
  e?.stopPropagation?.()

  if (actionId === 'chat') {
    window.location.href = '/inbox'
    return
  }

  if (actionId === 'mail' && client?.contact_email) {
    window.location.href = `mailto:${client.contact_email}`
    return
  }

  if (actionId === 'whatsapp') {
    toast.info('WhatsApp — Coming soon')
    return
  }

  if (actionId === 'teams') {
    toast.info('Teams — Coming soon')
    return
  }

  if (actionId === 'portal') {
    window.open(portalPath(client), '_blank', 'noopener,noreferrer')
    return
  }

  toast.info('Coming soon')
}
