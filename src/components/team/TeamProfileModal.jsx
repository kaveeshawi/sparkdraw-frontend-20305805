import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconBriefcase,
  IconCamera,
  IconClock,
  IconCopy,
  IconExternalLink,
  IconMail,
  IconMailForward,
  IconPhone,
  IconPencil,
  IconTrash,
  IconUser,
  IconUserOff,
  IconUserCheck,
  IconX,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import TeamAvatar from './TeamAvatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { teamApi } from '@/services/api'
import { apiErrorMessage } from '@/lib/apiError'
import TeamSelect from './TeamSelect'
import TeamDatePicker from './TeamDatePicker'
import {
  COUNTRY_SELECT_OPTIONS,
  dialFromCountryValue,
} from './countryDialCodes'
import {
  AVAILABILITY_DOT,
  AVAILABILITY_LABELS,
  ADMIN_DEPARTMENT,
  ROLE_LABELS,
  formatDepartment,
  formatEmployment,
  inviteActionLabel,
  memberNeedsInvite,
  memberPhotoSrc,
} from './team-utils'
import InviteSuccessPanel from './InviteSuccessPanel'
import {
  mergeMemberProfile,
  removeMemberProfile,
  saveMemberProfile,
} from './memberProfileStorage'

const GENDER_OPTIONS = [
  { value: '', label: 'Select' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not', label: 'Prefer not to say' },
]

const ROLE_OPTIONS = [
  { value: 'member', label: 'Team Member' },
  { value: 'pm', label: 'Project Manager' },
]

const LOCATION_OPTIONS = [
  { value: '', label: 'Select' },
  { value: 'office', label: 'Office' },
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
]

const GENDER_LABELS = Object.fromEntries(
  GENDER_OPTIONS.filter((o) => o.value).map((o) => [o.value, o.label]),
)

const LOCATION_LABELS = Object.fromEntries(
  LOCATION_OPTIONS.filter((o) => o.value).map((o) => [o.value, o.label]),
)

function formatDate(value) {
  if (!value) return '—'
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return value
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function splitName(name = '') {
  const parts = String(name).trim().split(/\s+/)
  if (parts.length <= 1) return { first_name: parts[0] || '', last_name: '' }
  return { first_name: parts[0], last_name: parts.slice(1).join(' ') }
}

function toFormState(profile) {
  const fromName = splitName(profile.name)
  const isAdmin = profile.role === 'admin' || profile.is_protected
  return {
    first_name: profile.first_name || fromName.first_name,
    last_name: profile.last_name || fromName.last_name,
    email: profile.email || '',
    phone_country: profile.phone_country || 'LK:+94',
    phone: profile.phone?.replace(/^\+\d+\s*/, '') || profile.phone || '',
    address: profile.address || '',
    birthday: profile.birthday || '',
    gender: profile.gender || '',
    job_title: profile.job_title || '',
    role: isAdmin ? 'admin' : profile.role === 'pm' ? 'pm' : 'member',
    department: isAdmin
      ? ADMIN_DEPARTMENT
      : (profile.department || '').trim(),
    start_date: profile.start_date || '',
    work_location: profile.work_location || '',
    employee_id: isAdmin ? '' : (profile.employee_id || ''),
    photo_preview: memberPhotoSrc(profile) || profile.photo_preview || '',
    employment_type: profile.employment_type || 'full_time',
  }
}


function SectionField({ label, value }) {
  return (
    <div className="sd-team-profile__field">
      <dt>{label}</dt>
      <dd>{value || '—'}</dd>
    </div>
  )
}

function ProfileSection({ icon: Icon, tone, title, children }) {
  return (
    <section className={`sd-team-profile__section sd-team-profile__section--${tone}`}>
      <header className="sd-team-profile__section-head">
        <span className={`sd-team-profile__section-icon sd-team-profile__section-icon--${tone}`}>
          <Icon size={16} stroke={1.65} aria-hidden />
        </span>
        <h3>{title}</h3>
      </header>
      <dl className="sd-team-profile__section-fields">{children}</dl>
    </section>
  )
}

export default function TeamProfileModal({
  member,
  open,
  onOpenChange,
  agencyId,
  departments = [],
  canManage = false,
  onUpdated,
  onRemoved,
  onInviteStatusChange,
}) {
  const navigate = useNavigate()
  const [mode, setMode] = useState('view') // view | edit | confirm-remove | confirm-revoke
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [sendingInvite, setSendingInvite] = useState(false)
  const [invitePanelOpen, setInvitePanelOpen] = useState(false)
  const [invitePanelData, setInvitePanelData] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const fileRef = useRef(null)

  const profile = useMemo(
    () => (member ? mergeMemberProfile(agencyId, member) : null),
    [agencyId, member],
  )

  useEffect(() => {
    if (!open) {
      setMode('view')
      setForm(null)
      setPhotoFile(null)
      setSendingInvite(false)
      setInvitePanelOpen(false)
      setInvitePanelData(null)
      return
    }
    if (profile) setForm(toFormState(profile))
  }, [open, profile])

  const clearPhotoPreview = (preview) => {
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview)
  }

  const handlePhoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be 2MB or smaller')
      return
    }
    setPhotoFile(file)
    setForm((prev) => {
      if (!prev) return prev
      clearPhotoPreview(prev.photo_preview)
      return { ...prev, photo_preview: URL.createObjectURL(file) }
    })
    e.target.value = ''
  }

  if (!member || !profile || !form) return null

  const displayName =
    `${form.first_name} ${form.last_name}`.trim() || profile.name || 'Team member'
  const availability = profile.availability || 'offline'
  const statusClass = AVAILABILITY_DOT[availability] || AVAILABILITY_DOT.offline
  const isProtected = profile.is_protected || profile.role === 'admin'
  const inviteStatus = profile.invite_status || 'active'
  const accessRevoked = Boolean(profile.access_revoked || inviteStatus === 'access_revoked')
  const showInviteAction = canManage && !isProtected && memberNeedsInvite(inviteStatus)
  const showRevokeAction = canManage && !isProtected && (inviteStatus === 'active' || accessRevoked)

  const handleSendInvite = async () => {
    setSendingInvite(true)
    try {
      const res = await teamApi.resendInvite(member.id)
      const temporaryPassword = res.data?.data?.temporary_password
      setInvitePanelData({
        id: member.id,
        email: profile.email,
        temporary_password: temporaryPassword,
      })
      setInvitePanelOpen(true)
      onInviteStatusChange?.(member.id, 'active')
      toast.success(res.data?.message || 'Login credentials ready')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not send invitation'))
    } finally {
      setSendingInvite(false)
    }
  }

  const handleRevokeAccess = async () => {
    setRevoking(true)
    try {
      const res = await teamApi.revokeAccess(member.id)
      const updated = res.data?.data
      if (updated) Object.assign(member, updated)
      onInviteStatusChange?.(member.id, 'access_revoked')
      toast.success('Access revoked — member stays on your team')
      setMode('view')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not revoke access. Please try again.'))
    } finally {
      setRevoking(false)
    }
  }

  const handleRestoreAccess = async () => {
    setRevoking(true)
    try {
      const res = await teamApi.restoreAccess(member.id)
      const updated = res.data?.data
      if (updated) Object.assign(member, updated)
      onInviteStatusChange?.(member.id, updated?.invite_status || 'active')
      toast.success('Access restored')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not restore access. Please try again.'))
    } finally {
      setRevoking(false)
    }
  }

  const departmentOptions = [
    { value: '', label: 'Select department' },
    ...departments.map((d) => ({ value: d.name, label: d.name })),
  ]

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const copyEmail = async (e) => {
    e.stopPropagation()
    if (!profile.email) return
    try {
      await navigator.clipboard.writeText(profile.email)
      toast.success('Email copied')
    } catch {
      toast.error('Could not copy email')
    }
  }

  const copyPhone = async (e) => {
    e.stopPropagation()
    if (!profile.phone) return
    try {
      await navigator.clipboard.writeText(profile.phone)
      toast.success('Phone number copied')
    } catch {
      toast.error('Could not copy phone number')
    }
  }

  const handleClose = (next) => {
    if (!next) {
      setMode('view')
      setForm(null)
    }
    onOpenChange?.(next)
  }

  const handleSave = async () => {
    const fullName = `${form.first_name.trim()} ${form.last_name.trim()}`.trim()
    if (!fullName || !form.email.trim()) {
      toast.error('Name and email are required')
      return
    }

    const dial = dialFromCountryValue(form.phone_country)
    const phoneDigits = form.phone.trim()
    const phone = phoneDigits ? `${dial} ${phoneDigits}`.trim() : ''

    setSaving(true)
    const hadPhotoUpload = !!photoFile
    try {
      let avatarUrl = profile.avatar_url || null
      let avatarPath = profile.avatar_path || null

      if (photoFile) {
        const formData = new FormData()
        formData.append('avatar', photoFile)
        const uploadRes = await teamApi.uploadAvatar(member.id, formData)
        const uploaded = uploadRes.data.data || {}
        avatarUrl = uploaded.avatar_url || null
        avatarPath = uploaded.avatar_path || null
        setPhotoFile(null)
      }

      const avatarVersion = Date.now()
      const nextProfile = {
        ...form,
        name: fullName,
        phone,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        job_title: form.job_title.trim(),
        address: form.address.trim(),
        department: isProtected ? ADMIN_DEPARTMENT : form.department,
        employee_id: isProtected ? '' : form.employee_id.trim(),
        role: isProtected ? 'admin' : form.role,
        avatar_url: avatarUrl,
        avatar_path: avatarPath,
        photo_preview: avatarUrl || form.photo_preview,
        avatar_version: avatarUrl ? avatarVersion : profile.avatar_version,
      }

      saveMemberProfile(agencyId, member, nextProfile)
      if (onUpdated) {
        await onUpdated(member.id, {
          name: fullName,
          role: nextProfile.role,
          department: nextProfile.department || undefined,
          job_title: form.job_title.trim() || undefined,
          phone: phone || undefined,
          avatar_url: nextProfile.avatar_url,
          ...nextProfile,
        })
      } else {
        Object.assign(member, nextProfile)
      }
      toast.success(hadPhotoUpload ? 'Profile photo updated' : 'Member updated')
      setMode('view')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update member')
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    setRemoving(true)
    try {
      if (onRemoved) await onRemoved(member.id)
      removeMemberProfile(agencyId, member)
      toast.success('Member removed')
      handleClose(false)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not remove member')
    } finally {
      setRemoving(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sd-team-profile-dialog sm:max-w-5xl border-0">
        <DialogHeader className="sd-team-profile-dialog__header">
          <DialogTitle>
            {mode === 'edit' ? 'Edit team member' : 'Team member'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? 'Update profile details for this teammate.'
              : 'Full profile details from your team form.'}
          </DialogDescription>
        </DialogHeader>

        {mode === 'confirm-revoke' ? (
          <div className="sd-team-profile-confirm">
            <div className="sd-team-profile-confirm__icon">
              <IconUserOff size={22} stroke={1.5} />
            </div>
            <h3>Revoke {displayName}’s access?</h3>
            <p>
              They will lose login access immediately, but stay on your team roster so you can restore them later.
            </p>
            <div className="sd-team-profile-confirm__actions">
              <Button
                variant="outline"
                className="h-10 rounded-full px-5"
                onClick={() => setMode('view')}
                disabled={revoking}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="h-10 rounded-full px-5"
                onClick={handleRevokeAccess}
                disabled={revoking}
              >
                {revoking ? 'Revoking…' : 'Revoke access'}
              </Button>
            </div>
          </div>
        ) : mode === 'confirm-remove' ? (
          <div className="sd-team-profile-confirm">
            <div className="sd-team-profile-confirm__icon">
              <IconTrash size={22} stroke={1.5} />
            </div>
            <h3>Remove {displayName}?</h3>
            <p>
              They will be permanently removed from this agency workspace. This cannot be undone
              from here.
            </p>
            <div className="sd-team-profile-confirm__actions">
              <Button
                variant="outline"
                className="h-10 rounded-full px-5"
                onClick={() => setMode('view')}
                disabled={removing}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="h-10 rounded-full px-5"
                onClick={handleRemove}
                disabled={removing}
              >
                {removing ? 'Removing…' : 'Remove member'}
              </Button>
            </div>
          </div>
        ) : mode === 'edit' ? (
          <div className="sd-team-form sd-team-profile-edit">
            <div className="sd-team-form__row sd-team-form__row--photo">
              <div className="sd-team-form__field">
                <Label>Profile photo</Label>
                <div className="sd-team-form__photo-inline">
                  <button
                    type="button"
                    className="sd-team-form__photo-btn"
                    onClick={() => fileRef.current?.click()}
                  >
                    <TeamAvatar
                      member={{ ...profile, ...form }}
                      className="size-14 text-sm"
                      fallbackClassName="sd-team-profile__avatar-fallback"
                    />
                  </button>
                  <Button
                    type="button"
                    size="sm"
                    className="sd-team-form__upload-btn"
                    onClick={() => fileRef.current?.click()}
                  >
                    <IconCamera size={14} />
                    Upload image
                  </Button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
                    onChange={handlePhoto}
                  />
                </div>
              </div>
            </div>

            <div className="sd-team-form__row sd-team-form__row--2">
              <div className="sd-team-form__field">
                <Label htmlFor="pf-first">First name</Label>
                <Input
                  id="pf-first"
                  className="sd-team-field"
                  value={form.first_name}
                  onChange={(e) => setField('first_name', e.target.value)}
                />
              </div>
              <div className="sd-team-form__field">
                <Label htmlFor="pf-last">Last name</Label>
                <Input
                  id="pf-last"
                  className="sd-team-field"
                  value={form.last_name}
                  onChange={(e) => setField('last_name', e.target.value)}
                />
              </div>
            </div>

            <div className="sd-team-form__row sd-team-form__row--2">
              <div className="sd-team-form__field">
                <Label htmlFor="pf-phone">Phone No</Label>
                <div className="sd-team-form__phone">
                  <TeamSelect
                    id="pf-phone-country"
                    className="sd-team-form__phone-country"
                    contentClassName="sd-team-select-content--countries"
                    value={form.phone_country}
                    onValueChange={(v) => setField('phone_country', v)}
                    options={COUNTRY_SELECT_OPTIONS}
                  />
                  <Input
                    id="pf-phone"
                    className="sd-team-field"
                    value={form.phone}
                    onChange={(e) => setField('phone', e.target.value)}
                  />
                </div>
              </div>
              <div className="sd-team-form__field">
                <Label htmlFor="pf-address">Address</Label>
                <Input
                  id="pf-address"
                  className="sd-team-field"
                  value={form.address}
                  onChange={(e) => setField('address', e.target.value)}
                />
              </div>
            </div>

            <div className="sd-team-form__row sd-team-form__row--3">
              <div className="sd-team-form__field">
                <Label htmlFor="pf-email">Email</Label>
                <Input
                  id="pf-email"
                  type="email"
                  className="sd-team-field"
                  value={form.email}
                  onChange={(e) => setField('email', e.target.value)}
                />
              </div>
              <div className="sd-team-form__field">
                <Label>Birthday</Label>
                <TeamDatePicker
                  value={form.birthday}
                  onValueChange={(v) => setField('birthday', v)}
                  placeholder="Select birthday"
                />
              </div>
              <div className="sd-team-form__field">
                <Label>Gender</Label>
                <TeamSelect
                  value={form.gender}
                  onValueChange={(v) => setField('gender', v)}
                  options={GENDER_OPTIONS}
                />
              </div>
            </div>

            <div className="sd-team-form__row sd-team-form__row--3">
              <div className="sd-team-form__field">
                <Label htmlFor="pf-position">Position</Label>
                <Input
                  id="pf-position"
                  className="sd-team-field"
                  value={form.job_title}
                  onChange={(e) => setField('job_title', e.target.value)}
                />
              </div>
              <div className="sd-team-form__field">
                <Label>Role</Label>
                {isProtected ? (
                  <Input
                    className="sd-team-field sd-team-field--readonly"
                    value={ROLE_LABELS.admin}
                    readOnly
                    disabled
                    tabIndex={-1}
                  />
                ) : (
                  <TeamSelect
                    value={form.role}
                    onValueChange={(v) => setField('role', v)}
                    options={ROLE_OPTIONS}
                  />
                )}
              </div>
              <div className="sd-team-form__field">
                <Label>Department</Label>
                {isProtected ? (
                  <Input
                    className="sd-team-field sd-team-field--readonly"
                    value={ADMIN_DEPARTMENT}
                    readOnly
                    disabled
                    tabIndex={-1}
                  />
                ) : (
                  <TeamSelect
                    value={form.department}
                    onValueChange={(v) => setField('department', v)}
                    options={departmentOptions}
                  />
                )}
              </div>
            </div>

            <div className="sd-team-form__row sd-team-form__row--3">
              <div className="sd-team-form__field">
                <Label>Start date</Label>
                <TeamDatePicker
                  value={form.start_date}
                  onValueChange={(v) => setField('start_date', v)}
                  placeholder="Select start date"
                />
              </div>
              <div className="sd-team-form__field">
                <Label>Work location</Label>
                <TeamSelect
                  value={form.work_location}
                  onValueChange={(v) => setField('work_location', v)}
                  options={LOCATION_OPTIONS}
                />
              </div>
              <div className="sd-team-form__field">
                <Label htmlFor="pf-emp">Employee ID</Label>
                <Input
                  id="pf-emp"
                  className={`sd-team-field${isProtected ? ' sd-team-field--readonly' : ''}`}
                  value={isProtected ? 'Not applicable' : form.employee_id}
                  onChange={(e) => setField('employee_id', e.target.value)}
                  readOnly={isProtected}
                  disabled={isProtected}
                  tabIndex={isProtected ? -1 : 0}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="sd-team-profile">
            <div className="sd-team-profile__hero">
              <div className="sd-team-profile__avatar-wrap">
                <TeamAvatar
                  member={profile}
                  className="size-20 text-lg"
                  fallbackClassName="sd-team-profile__avatar-fallback"
                />
              </div>
              <div className="sd-team-profile__hero-copy">
                <div className="sd-team-profile__name-row">
                  <h2 className="sd-team-profile__name">{displayName}</h2>
                  <span className="sd-team-profile__chip sd-team-profile__chip--status">
                    <span className={`sd-team-profile__chip-dot ${statusClass}`} aria-hidden />
                    {AVAILABILITY_LABELS[availability] || 'Offline'}
                  </span>
                </div>
                {profile.email ? (
                  <div className="sd-team-profile__contact-row">
                    <IconMail size={14} stroke={1.65} className="sd-team-profile__contact-icon" aria-hidden />
                    <span className="sd-team-profile__contact-text" title={profile.email}>
                      {profile.email}
                    </span>
                    <button
                      type="button"
                      className="sd-team-profile__copy"
                      aria-label="Copy email"
                      title="Copy email"
                      onClick={copyEmail}
                    >
                      <IconCopy size={13} stroke={1.75} />
                    </button>
                  </div>
                ) : null}
                {profile.phone ? (
                  <div className="sd-team-profile__contact-row">
                    <IconPhone size={14} stroke={1.65} className="sd-team-profile__contact-icon" aria-hidden />
                    <span className="sd-team-profile__contact-text" title={profile.phone}>
                      {profile.phone}
                    </span>
                    <button
                      type="button"
                      className="sd-team-profile__copy"
                      aria-label="Copy phone number"
                      title="Copy phone number"
                      onClick={copyPhone}
                    >
                      <IconCopy size={13} stroke={1.75} />
                    </button>
                  </div>
                ) : null}
                {profile.job_title?.trim() ? (
                  <div className="sd-team-profile__chips">
                    <span className="sd-team-profile__chip sd-team-profile__chip--position">
                      <IconBriefcase size={12} stroke={1.75} aria-hidden />
                      {profile.job_title.trim()}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="sd-team-profile__sections">
              <ProfileSection icon={IconUser} tone="orange" title="Personal Information">
                <SectionField label="Phone" value={profile.phone} />
                <SectionField label="Birthday" value={formatDate(profile.birthday)} />
                <SectionField
                  label="Gender"
                  value={GENDER_LABELS[profile.gender] || profile.gender}
                />
              </ProfileSection>

              <ProfileSection icon={IconMail} tone="purple" title="Contact Information">
                <SectionField label="Email" value={profile.email} />
                <SectionField label="Address" value={profile.address} />
              </ProfileSection>

              <ProfileSection icon={IconBriefcase} tone="orange" title="Work Information">
                <SectionField label="Position" value={profile.job_title} />
                <SectionField
                  label="Role"
                  value={ROLE_LABELS[profile.role] || profile.role}
                />
                <SectionField
                  label="Department"
                  value={formatDepartment(profile.department, profile)}
                />
                <SectionField
                  label="Work location"
                  value={LOCATION_LABELS[profile.work_location] || profile.work_location}
                />
              </ProfileSection>

              <ProfileSection icon={IconClock} tone="purple" title="Employment details">
                <SectionField
                  label="Employment type"
                  value={formatEmployment(profile.employment_type)}
                />
                <SectionField label="Start date" value={formatDate(profile.start_date)} />
                {!isProtected ? (
                  <SectionField label="Employee ID" value={profile.employee_id} />
                ) : (
                  <SectionField label="Employee ID" value="Not applicable" />
                )}
              </ProfileSection>
            </div>
          </div>
        )}

        {mode !== 'confirm-remove' && mode !== 'confirm-revoke' && (
          <DialogFooter className="sd-team-profile-dialog__footer gap-2 sm:gap-2">
            {mode === 'edit' ? (
              <>
                <Button
                  variant="outline"
                  className="h-10 rounded-full px-5"
                  onClick={() => {
                    clearPhotoPreview(form?.photo_preview)
                    setPhotoFile(null)
                    setForm(toFormState(profile))
                    setMode('view')
                  }}
                  disabled={saving}
                >
                  <IconX size={16} />
                  Cancel
                </Button>
                <Button
                  className="sd-btn-gradient h-10 rounded-full px-6"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
              </>
            ) : (
              <>
                {canManage && (
                  <div className="sd-team-profile-dialog__actions">
                    <div className="sd-team-profile-dialog__actions-left">
                      {showInviteAction ? (
                        <Button
                          variant="outline"
                          className="h-10 rounded-full px-5"
                          onClick={handleSendInvite}
                          disabled={sendingInvite}
                        >
                          <IconMailForward size={16} />
                          {sendingInvite ? 'Sending…' : inviteActionLabel(inviteStatus)}
                        </Button>
                      ) : null}
                      {showRevokeAction ? (
                        accessRevoked ? (
                          <Button
                            variant="outline"
                            className="h-10 rounded-full px-5"
                            onClick={handleRestoreAccess}
                            disabled={revoking}
                          >
                            <IconUserCheck size={16} />
                            {revoking ? 'Restoring…' : 'Restore access'}
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            className="h-10 rounded-full px-5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setMode('confirm-revoke')}
                            disabled={revoking}
                          >
                            <IconUserOff size={16} />
                            Revoke access
                          </Button>
                        )
                      ) : null}
                      {!isProtected && (
                        <Button
                          variant="outline"
                          className="h-10 rounded-full px-5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setMode('confirm-remove')}
                        >
                          <IconTrash size={16} />
                          Remove
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        className="h-10 rounded-full px-5"
                        onClick={() => setMode('edit')}
                      >
                        <IconPencil size={16} />
                        Edit
                      </Button>
                    </div>
                    <Button
                      className="sd-btn-gradient h-10 min-w-[7.5rem] rounded-full px-7 text-[0.9375rem] font-semibold"
                      onClick={() => {
                        handleClose(false)
                        navigate(`/team/${member.id}/portal`)
                      }}
                    >
                      Portal
                      <IconExternalLink size={15} stroke={2} />
                    </Button>
                  </div>
                )}
              </>
            )}
          </DialogFooter>
        )}
      </DialogContent>
      </Dialog>

      <InviteSuccessPanel
        invite={invitePanelData}
        open={invitePanelOpen}
        onOpenChange={setInvitePanelOpen}
      />
    </>
  )
}
