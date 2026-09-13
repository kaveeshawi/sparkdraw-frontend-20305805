import { IconMail, IconMessage } from '@tabler/icons-react'
import { toast } from 'sonner'

export const AVAILABILITY_DOT = {
  available: 'sd-team-status--available',
  away: 'sd-team-status--away',
  busy: 'sd-team-status--busy',
  offline: 'sd-team-status--offline',
}

export const AVAILABILITY_LABELS = {
  available: 'Available',
  away: 'Away',
  busy: 'Busy',
  offline: 'Offline',
}

export const EMPLOYMENT_LABELS = {
  full_time: 'Full time',
  part_time: 'Part time',
  contractor: 'Contractor',
  freelance: 'Freelance',
  intern: 'Intern',
}

export const ROLE_LABELS = {
  admin: 'Admin',
  pm: 'Project Manager',
  member: 'Team Member',
}

export const INVITE_STATUS_LABELS = {
  active: 'Active',
  invite_pending: 'Invite sent',
  invite_not_sent: 'Invite not sent',
  invite_expired: 'Invite expired',
  access_revoked: 'Access revoked',
}

export function isPendingInvite(status) {
  return status === 'invite_pending' || status === 'invite_not_sent' || status === 'invite_expired'
}

export function memberNeedsInvite(status) {
  // Active members can still regenerate login credentials
  return Boolean(status) && status !== 'access_revoked'
}

export function inviteActionLabel(status) {
  if (status === 'active') return 'Reset login credentials'
  if (status === 'invite_pending') return 'Resend credentials'
  return 'Create login credentials'
}

export const TEAM_FILTER_PILLS = [
  { id: 'all', label: 'All' },
  { id: 'online', label: 'Online' },
  { id: 'offline', label: 'Offline' },
  { id: 'pm', label: 'Project Managers' },
  { id: 'pending', label: 'Pending invite' },
]

export function matchesMemberFilter(member, filterId) {
  if (filterId === 'all') return true
  if (filterId === 'online') return member?.availability === 'available'
  if (filterId === 'offline') return member?.availability !== 'available'
  if (filterId === 'pm') return member?.role === 'pm'
  if (filterId === 'pending') return isPendingInvite(member?.invite_status)
  return true
}

export const ADMIN_DEPARTMENT = 'Management'

export function displayMemberName(member) {
  if (!member) return 'Team member'
  const fromParts = `${member.first_name || ''} ${member.last_name || ''}`.trim()
  return fromParts || member.name?.trim() || 'Team member'
}

export function displayDepartment(member) {
  if (!member) return '—'
  if (member.role === 'admin' || member.is_protected) {
    return (member.department || '').trim() || ADMIN_DEPARTMENT
  }
  return (member.department || '').trim() || '—'
}

export { memberPhotoSrc } from '@/lib/media'

export const CONTACT_ACTIONS = [
  { id: 'chat', label: 'Chat', icon: IconMessage },
  { id: 'mail', label: 'Mail', icon: IconMail },
  { id: 'whatsapp', label: 'WhatsApp', icon: null },
  { id: 'teams', label: 'Teams', icon: null },
]

export function formatEmployment(type) {
  return EMPLOYMENT_LABELS[type] || type || '—'
}

export function formatDepartment(dept, member) {
  if (member?.role === 'admin' || member?.is_protected) {
    return (dept || '').trim() || ADMIN_DEPARTMENT
  }
  return dept?.trim() || '—'
}

export function handleContactAction(e, actionId, member, options = {}) {
  e?.stopPropagation?.()
  if (actionId === 'chat') {
    if (typeof options.onChat === 'function') {
      options.onChat()
      return
    }
    if (options.chatHref) {
      window.location.href = options.chatHref
      return
    }
    if (member?.id) {
      window.location.href = `/inbox?channel=team&member=${member.id}`
      return
    }
  }
  if (actionId === 'mail' && member?.email) {
    window.location.href = `mailto:${member.email}`
    return
  }
  const labels = { chat: 'Chat', mail: 'Mail', whatsapp: 'WhatsApp', teams: 'Teams' }
  toast.info(`${labels[actionId] || 'Action'} — Coming soon`)
}
