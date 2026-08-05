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
}

export function memberNeedsInvite(status) {
  return status && status !== 'active'
}

export function inviteActionLabel(status) {
  if (status === 'invite_pending') return 'Resend invitation'
  return 'Send invitation'
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
  if (filterId === 'pending') return memberNeedsInvite(member?.invite_status)
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

export function handleContactAction(e, label) {
  e?.stopPropagation?.()
  toast.info(`${label} — Coming soon`)
}
