import { useEffect, useRef, useState } from 'react'
import {
  IconBuilding,
  IconCamera,
  IconCopy,
  IconKey,
  IconMail,
  IconMailForward,
  IconPencil,
  IconPhone,
  IconTrash,
  IconUser,
  IconX,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import ClientAvatar from './ClientAvatar'
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
import { clientsApi } from '@/services/api'
import TeamSelect from '../team/TeamSelect'
import {
  COUNTRY_SELECT_OPTIONS,
  dialFromCountryValue,
} from '../team/countryDialCodes'
import ClientInviteSuccessPanel from './ClientInviteSuccessPanel'
import ProjectsTab from './ProjectsTab'
import {
  canShowContactDetails,
  displayClientName,
  displayContactPersonName,
  inviteActionLabel,
  isPendingInvite,
  projectsLabel,
} from './client-utils'

const PROFILE_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'projects', label: 'Projects' },
]

const TIER_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'vip', label: 'VIP' },
  { value: 'enterprise', label: 'Enterprise' },
]

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

function FieldError({ message }) {
  if (!message) return null
  return <p className="sd-team-form__error">{message}</p>
}

function splitName(fullName = '') {
  const parts = String(fullName).trim().split(/\s+/)
  if (!parts.length || !parts[0]) return { first_name: '', last_name: '' }
  if (parts.length === 1) return { first_name: parts[0], last_name: '' }
  return { first_name: parts[0], last_name: parts.slice(1).join(' ') }
}

function toFormState(client) {
  const fromMetaFirst = client?.first_name?.trim()
  const fromMetaLast = client?.last_name?.trim()
  const split = splitName(client?.contact_name)
  return {
    first_name: fromMetaFirst || split.first_name || '',
    last_name: fromMetaLast || split.last_name || '',
    company_name: client?.company_name || '',
    email: client?.contact_email || '',
    phone_country: client?.phone_country || 'LK:+94',
    phone: client?.phone_local || client?.phone || '',
    address: client?.address || '',
    tier: client?.tier || '',
    photo_preview: client?.photo_preview || client?.avatar_url || '',
    avatar_url: client?.avatar_url || null,
    avatar_path: client?.avatar_path || null,
  }
}

export default function ClientProfileModal({
  client,
  open,
  onOpenChange,
  canManage = false,
  canDelete = false,
  onUpdated,
  onRemoved,
  onInviteStatusChange,
  projects = [],
  onViewKanban,
  onNewProject,
}) {
  const [editing, setEditing] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [form, setForm] = useState(toFormState(client))
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [sendingInvite, setSendingInvite] = useState(false)
  const [resettingPassword, setResettingPassword] = useState(false)
  const [invitePanelOpen, setInvitePanelOpen] = useState(false)
  const [invitePanelData, setInvitePanelData] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const fileRef = useRef(null)

  const showContact = canShowContactDetails(client)
  const personName = displayContactPersonName(client)
  const companyName = displayClientName(client)
  const inviteStatus = client?.invite_status || 'active'

  useEffect(() => {
    if (!open) {
      setEditing(false)
      setActiveTab('overview')
      setErrors({})
      setSendingInvite(false)
      setResettingPassword(false)
      setInvitePanelOpen(false)
      setInvitePanelData(null)
      setPhotoFile(null)
      return
    }
    setForm(toFormState(client))
    setPhotoFile(null)
  }, [open, client])

  if (!client) return null

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

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
      clearPhotoPreview(prev.photo_preview)
      return { ...prev, photo_preview: URL.createObjectURL(file) }
    })
    e.target.value = ''
  }

  const copyEmail = async () => {
    if (!client.contact_email) return
    try {
      await navigator.clipboard.writeText(client.contact_email)
      toast.success('Email copied')
    } catch {
      toast.error('Could not copy email')
    }
  }

  const handleSave = async () => {
    const localErrors = {}
    if (!form.first_name.trim()) localErrors.first_name = ['First name is required']
    if (!form.last_name.trim()) localErrors.last_name = ['Last name is required']
    if (!form.company_name.trim()) localErrors.company_name = ['Company name is required']
    if (!form.email.trim()) localErrors.email = ['Email is required']
    if (Object.keys(localErrors).length) {
      setErrors(localErrors)
      return
    }

    const fullName = `${form.first_name.trim()} ${form.last_name.trim()}`.trim()
    const phoneDigits = String(form.phone || '').replace(/^\+\d+\s*/, '').trim()
    const dial = dialFromCountryValue(form.phone_country)
    const phone = phoneDigits ? `${dial} ${phoneDigits}`.trim() : ''

    setSaving(true)
    setErrors({})
    try {
      if (photoFile) {
        const formData = new FormData()
        formData.append('avatar', photoFile)
        const uploadRes = await clientsApi.uploadAvatar(client.id, formData)
        const uploaded = uploadRes.data.data
        if (uploaded) {
          onUpdated?.(client.id, null, uploaded)
        }
        setPhotoFile(null)
      }

      await onUpdated?.(client.id, {
        company_name: form.company_name.trim(),
        contact_name: fullName,
        contact_email: form.email.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        tier: form.tier || null,
        phone: phone || null,
        phone_country: form.phone_country || null,
        address: form.address.trim() || null,
      })
      setEditing(false)
      toast.success('Client updated')
    } catch (err) {
      const apiErrors = err.response?.data?.errors || {}
      const mapped = { ...apiErrors }
      if (apiErrors.contact_name) mapped.first_name = apiErrors.contact_name
      if (apiErrors.contact_email) mapped.email = apiErrors.contact_email
      setErrors(mapped)
      toast.error(err.response?.data?.message || 'Could not update client')
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    if (!window.confirm(`Remove ${companyName}? This cannot be undone.`)) return
    setRemoving(true)
    try {
      await onRemoved?.(client.id)
      toast.success('Client removed')
      onOpenChange(false)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not remove client')
    } finally {
      setRemoving(false)
    }
  }

  const handlePortalInvite = async () => {
    setSendingInvite(true)
    try {
      const res = await clientsApi.resendInvite(client.id)
      const inviteUrl = res.data?.data?.invite_url
      setInvitePanelData({
        id: client.id,
        email: client.contact_email,
        invite_url: inviteUrl,
      })
      setInvitePanelOpen(true)
      onInviteStatusChange?.(client.id, 'invite_pending')
      toast.success(res.data?.message || 'Portal invite sent')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send portal invite')
    } finally {
      setSendingInvite(false)
    }
  }

  const handlePasswordReset = async () => {
    setResettingPassword(true)
    try {
      const res = await clientsApi.resendInvite(client.id)
      const inviteUrl = res.data?.data?.invite_url
      setInvitePanelData({
        id: client.id,
        email: client.contact_email,
        invite_url: inviteUrl,
      })
      setInvitePanelOpen(true)
      toast.success(res.data?.message || 'Password reset link sent')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send password reset')
    } finally {
      setResettingPassword(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={`sd-team-profile-dialog border-0 ${
            !editing && activeTab === 'projects' ? 'sm:max-w-4xl' : 'sm:max-w-3xl'
          }`}
        >
          <DialogHeader className="sd-team-profile-dialog__header">
            <DialogTitle>Client profile</DialogTitle>
            <DialogDescription>Contact details, company info, and portal access.</DialogDescription>
          </DialogHeader>

          {editing && canManage ? (
            <div className="sd-team-form">
              <div className="sd-team-form__row sd-team-form__row--photo">
                <div className="sd-team-form__field">
                  <Label>Profile photo</Label>
                  <div className="sd-team-form__photo-inline">
                    <button
                      type="button"
                      className="sd-team-form__photo-btn"
                      onClick={() => fileRef.current?.click()}
                      disabled={saving}
                    >
                      <ClientAvatar
                        client={{ ...client, ...form }}
                        className="size-14 text-sm"
                        fallbackClassName="sd-team-profile__avatar-fallback"
                      />
                    </button>
                    <Button
                      type="button"
                      size="sm"
                      className="sd-team-form__upload-btn"
                      disabled={saving}
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
                  <Label htmlFor="cp-first">First name</Label>
                  <Input
                    id="cp-first"
                    className="sd-team-field"
                    value={form.first_name}
                    disabled={saving}
                    onChange={(e) => setField('first_name', e.target.value)}
                  />
                  <FieldError message={errors.first_name?.[0]} />
                </div>
                <div className="sd-team-form__field">
                  <Label htmlFor="cp-last">Last name</Label>
                  <Input
                    id="cp-last"
                    className="sd-team-field"
                    value={form.last_name}
                    disabled={saving}
                    onChange={(e) => setField('last_name', e.target.value)}
                  />
                  <FieldError message={errors.last_name?.[0]} />
                </div>
              </div>

              <div className="sd-team-form__row sd-team-form__row--2">
                <div className="sd-team-form__field">
                  <Label htmlFor="cp-phone">Phone No</Label>
                  <div className="sd-team-form__phone">
                    <TeamSelect
                      id="cp-phone-country"
                      aria-label="Country code"
                      className="sd-team-form__phone-country"
                      contentClassName="sd-team-select-content--countries"
                      value={form.phone_country}
                      onValueChange={(v) => setField('phone_country', v)}
                      options={COUNTRY_SELECT_OPTIONS}
                      placeholder="Country"
                      disabled={saving}
                    />
                    <Input
                      id="cp-phone"
                      type="tel"
                      className="sd-team-field"
                      value={form.phone}
                      disabled={saving}
                      onChange={(e) => setField('phone', e.target.value)}
                    />
                  </div>
                  <FieldError message={errors.phone?.[0]} />
                </div>
                <div className="sd-team-form__field">
                  <Label htmlFor="cp-address">Address</Label>
                  <Input
                    id="cp-address"
                    className="sd-team-field"
                    value={form.address}
                    disabled={saving}
                    onChange={(e) => setField('address', e.target.value)}
                  />
                </div>
              </div>

              <div className="sd-team-form__row">
                <div className="sd-team-form__field">
                  <Label htmlFor="cp-company">Company name</Label>
                  <Input
                    id="cp-company"
                    className="sd-team-field"
                    value={form.company_name}
                    disabled={saving}
                    onChange={(e) => setField('company_name', e.target.value)}
                  />
                  <FieldError message={errors.company_name?.[0]} />
                </div>
              </div>

              <div className="sd-team-form__row sd-team-form__row--2">
                <div className="sd-team-form__field">
                  <Label htmlFor="cp-email">Email</Label>
                  <Input
                    id="cp-email"
                    type="email"
                    className="sd-team-field"
                    value={form.email}
                    disabled={saving}
                    onChange={(e) => setField('email', e.target.value)}
                  />
                  <FieldError message={errors.email?.[0] || errors.contact_email?.[0]} />
                </div>
                <div className="sd-team-form__field">
                  <Label htmlFor="cp-tier">Client tag</Label>
                  <TeamSelect
                    id="cp-tier"
                    value={form.tier}
                    disabled={saving}
                    onValueChange={(v) => setField('tier', v)}
                    options={TIER_OPTIONS}
                    placeholder="Select tag"
                  />
                  <FieldError message={errors.tier?.[0]} />
                </div>
              </div>
            </div>
          ) : (
            <div className="sd-team-profile">
              <div className="sd-team-profile__hero">
                <div className="sd-team-profile__avatar-wrap">
                  <ClientAvatar
                    client={client}
                    className="size-20 text-lg"
                    fallbackClassName="sd-team-profile__avatar-fallback"
                  />
                </div>
                <div className="sd-team-profile__hero-copy">
                  <div className="sd-team-profile__name-row">
                    <h2 className="sd-team-profile__name">{personName}</h2>
                  </div>
                  {companyName ? (
                    <p className="sd-team-profile__company" title={companyName}>
                      <IconBuilding size={14} stroke={1.65} aria-hidden />
                      {companyName}
                    </p>
                  ) : null}
                  {showContact && client.contact_email ? (
                    <div className="sd-team-profile__contact-row">
                      <IconMail size={14} stroke={1.65} className="sd-team-profile__contact-icon" aria-hidden />
                      <span className="sd-team-profile__contact-text" title={client.contact_email}>
                        {client.contact_email}
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
                  {showContact && client.phone ? (
                    <div className="sd-team-profile__contact-row">
                      <IconPhone size={14} stroke={1.65} className="sd-team-profile__contact-icon" aria-hidden />
                      <span className="sd-team-profile__contact-text">{client.phone}</span>
                    </div>
                  ) : null}
                </div>
              </div>

              <div
                className="mb-4 flex flex-wrap gap-2"
                role="tablist"
                aria-label="Client detail sections"
              >
                {PROFILE_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    className={`sd-client-filter${activeTab === tab.id ? ' is-active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === 'projects' ? (
                <div role="tabpanel" className="w-full">
                  <ProjectsTab
                    projects={projects}
                    onViewKanban={onViewKanban}
                    onNewProject={onNewProject}
                  />
                </div>
              ) : (
                <div role="tabpanel" className="sd-team-profile__sections">
                  <ProfileSection icon={IconUser} tone="orange" title="Personal Information">
                    <SectionField label="First name" value={client.first_name || splitName(client.contact_name).first_name} />
                    <SectionField label="Last name" value={client.last_name || splitName(client.contact_name).last_name} />
                    <SectionField label="Phone" value={showContact ? client.phone : null} />
                    <SectionField label="Address" value={showContact ? client.address : null} />
                  </ProfileSection>

                  <ProfileSection icon={IconBuilding} tone="purple" title="Company">
                    <SectionField label="Company name" value={client.company_name} />
                    <SectionField
                      label="Client tag"
                      value={
                        client.tier === 'vip'
                          ? 'VIP'
                          : client.tier === 'enterprise'
                            ? 'Enterprise'
                            : 'None'
                      }
                    />
                    <SectionField label="Email" value={showContact ? client.contact_email : null} />
                    <SectionField label="Projects" value={projectsLabel(client)} />
                  </ProfileSection>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="sd-team-profile-dialog__footer gap-2 sm:gap-2">
            {editing ? (
              <>
                <Button
                  variant="outline"
                  className="h-10 rounded-full px-5"
                  disabled={saving}
                  onClick={() => {
                    setForm(toFormState(client))
                    setEditing(false)
                    setPhotoFile(null)
                    setErrors({})
                  }}
                >
                  <IconX size={16} />
                  Cancel
                </Button>
                <Button
                  className="sd-btn-gradient h-10 rounded-full px-6"
                  disabled={saving}
                  onClick={handleSave}
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="sd-team-profile-dialog__close h-10 rounded-full px-5"
                  onClick={() => onOpenChange(false)}
                >
                  <IconX size={16} />
                  Close
                </Button>
                {canManage ? (
                  <div className="sd-team-profile-dialog__actions">
                    <Button
                      variant="outline"
                      className="h-10 rounded-full px-5"
                      onClick={handlePortalInvite}
                      disabled={sendingInvite}
                    >
                      <IconMailForward size={16} />
                      {sendingInvite
                        ? 'Sending…'
                        : isPendingInvite(client)
                          ? inviteActionLabel(inviteStatus)
                          : 'Invite to portal'}
                    </Button>
                    <Button
                      variant="outline"
                      className="h-10 rounded-full px-5"
                      onClick={handlePasswordReset}
                      disabled={resettingPassword}
                    >
                      <IconKey size={16} />
                      {resettingPassword ? 'Sending…' : 'Reset password'}
                    </Button>
                    {canDelete ? (
                      <Button
                        variant="outline"
                        className="h-10 rounded-full px-5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={removing}
                        onClick={handleRemove}
                      >
                        <IconTrash size={16} />
                        Remove
                      </Button>
                    ) : null}
                    <Button
                      className="sd-btn-gradient h-10 rounded-full px-6"
                      onClick={() => {
                        setActiveTab('overview')
                        setEditing(true)
                      }}
                    >
                      <IconPencil size={16} />
                      Edit
                    </Button>
                  </div>
                ) : null}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ClientInviteSuccessPanel
        client={invitePanelData}
        open={invitePanelOpen}
        onOpenChange={setInvitePanelOpen}
      />
    </>
  )
}
