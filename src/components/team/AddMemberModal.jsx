import { useEffect, useRef, useState } from 'react'
import {
  IconCamera,
  IconCopy,
  IconMailForward,
  IconUserPlus,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getInitials } from '@/lib/utils'
import { teamApi, rolesApi } from '@/services/api'
import { loadDepartments } from './departmentStorage'
import TeamSelect from './TeamSelect'
import TeamDatePicker from './TeamDatePicker'
import {
  COUNTRY_SELECT_OPTIONS,
  dialFromCountryValue,
} from './countryDialCodes'
import { commitEmployeeId, peekNextEmployeeId } from './employeeIdStorage'
import { saveMemberProfile } from './memberProfileStorage'
import CelebrationBurst from './CelebrationBurst'
import TeamSuccessIllustration from './TeamSuccessIllustration'

const EMPLOYMENT_API_MAP = {
  full_time: 'full_time',
  part_time: 'part_time',
  contractor: 'contractor',
  freelance: 'contractor',
  intern: 'part_time',
}

const EMPLOYMENT_OPTIONS = [
  { value: 'full_time', label: 'Full time' },
  { value: 'part_time', label: 'Part time' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'intern', label: 'Intern' },
]

const GENDER_OPTIONS = [
  { value: '', label: 'Select' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not', label: 'Prefer not to say' },
]

// Fallback if the roles API hasn't loaded yet — matches the seeded defaults.
const FALLBACK_ROLE_OPTIONS = [
  { value: 'member', label: 'Team Member' },
  { value: 'pm', label: 'Project Manager' },
]

const LOCATION_OPTIONS = [
  { value: '', label: 'Select' },
  { value: 'office', label: 'Office' },
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
]

const EMPTY_FORM = {
  photo_preview: '',
  first_name: '',
  last_name: '',
  email: '',
  phone_country: 'LK:+94',
  phone: '',
  address: '',
  birthday: '',
  gender: '',
  job_title: '',
  custom_role_id: '',
  employment_type: 'full_time',
  department: '',
  start_date: '',
  work_location: '',
  employee_id: '',
}

function FieldError({ message }) {
  if (!message) return null
  return <p className="sd-team-form__error">{message}</p>
}

export default function AddMemberModal({
  open,
  onOpenChange,
  onSuccess,
  onMemberPatched,
  onSendInvite,
  agencyId,
  departments: departmentsProp,
  members = [],
  onOpenManageDepartments,
  onOpenManageRoles,
}) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [sendingInvite, setSendingInvite] = useState(false)
  const [departments, setDepartments] = useState([])
  const [roles, setRoles] = useState([])
  const [step, setStep] = useState('form')
  const [addedMember, setAddedMember] = useState(null)
  const [inviteSent, setInviteSent] = useState(false)
  const [temporaryPassword, setTemporaryPassword] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setDepartments(departmentsProp ?? loadDepartments(agencyId))
    setForm((prev) => ({
      ...prev,
      employee_id: prev.employee_id || peekNextEmployeeId(agencyId, members),
    }))
    rolesApi.index()
      .then((res) => {
        const invitable = (res.data.data || []).filter((r) => r.base_role !== 'admin')
        setRoles(invitable)
        setForm((prev) => {
          if (prev.custom_role_id) return prev
          const defaultMember = invitable.find((r) => r.base_role === 'member' && r.is_default) || invitable[0]
          return defaultMember ? { ...prev, custom_role_id: String(defaultMember.id) } : prev
        })
      })
      .catch(() => setRoles([]))
  }, [open, agencyId, departmentsProp, members])

  useEffect(() => {
    if (!open || step !== 'form') return
    setForm((prev) => {
      if (prev.employee_id) return prev
      return { ...prev, employee_id: peekNextEmployeeId(agencyId, members) }
    })
  }, [open, step, agencyId, members])

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const resetAll = () => {
    setForm((prev) => {
      if (prev.photo_preview) URL.revokeObjectURL(prev.photo_preview)
      return EMPTY_FORM
    })
    setErrors({})
    setStep('form')
    setAddedMember(null)
    setInviteSent(false)
    setTemporaryPassword('')
    setSubmitting(false)
    setSendingInvite(false)
    setPhotoFile(null)
  }

  const handleClose = (nextOpen) => {
    if (!nextOpen) resetAll()
    onOpenChange(nextOpen)
  }

  const handlePhoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    setPhotoFile(file)
    setForm((prev) => {
      if (prev.photo_preview?.startsWith('blob:')) URL.revokeObjectURL(prev.photo_preview)
      return { ...prev, photo_preview: URL.createObjectURL(file) }
    })
    e.target.value = ''
  }

  const handleAddMember = async () => {
    const localErrors = {}
    if (!form.first_name.trim()) localErrors.first_name = ['First name is required']
    if (!form.last_name.trim()) localErrors.last_name = ['Last name is required']
    if (!form.email.trim()) localErrors.email = ['Email is required']
    if (!form.department) localErrors.department = ['Select a department']
    if (Object.keys(localErrors).length) {
      setErrors(localErrors)
      return
    }

    const fullName = `${form.first_name.trim()} ${form.last_name.trim()}`.trim()
    const phoneDigits = form.phone.trim()
    const dial = dialFromCountryValue(form.phone_country)
    const phone = phoneDigits ? `${dial} ${phoneDigits}`.trim() : ''
    const selectedRole = roles.find((r) => String(r.id) === String(form.custom_role_id))
    const baseRole = selectedRole?.base_role || 'member'

    setSubmitting(true)
    try {
      const employeeId = form.employee_id || peekNextEmployeeId(agencyId, members)
      const payload = {
        name: fullName,
        email: form.email.trim(),
        role: baseRole,
        ...(selectedRole ? { custom_role_id: selectedRole.id } : {}),
        department: form.department,
        employment_type: EMPLOYMENT_API_MAP[form.employment_type] || 'full_time',
        send_email: false,
        employee_id: employeeId,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone_country: form.phone_country,
        ...(phone ? { phone } : {}),
        ...(form.job_title.trim() ? { job_title: form.job_title.trim() } : {}),
        ...(form.address.trim() ? { address: form.address.trim() } : {}),
        ...(form.birthday ? { birthday: form.birthday } : {}),
        ...(form.gender ? { gender: form.gender } : {}),
        ...(form.start_date ? { start_date: form.start_date } : {}),
        ...(form.work_location ? { work_location: form.work_location } : {}),
      }
      const member = await onSuccess(payload)
      setAddedMember(member || { name: fullName, email: form.email.trim(), employee_id: employeeId })
      setTemporaryPassword(member?.temporary_password || '')
      setStep('success')
      setInviteSent(false)

      let avatarUrl = ''
      let avatarPath = null
      let avatarVersion = null

      if (photoFile && member?.id) {
        try {
          const formData = new FormData()
          formData.append('avatar', photoFile)
          const uploadRes = await teamApi.uploadAvatar(member.id, formData)
          const uploaded = uploadRes.data.data || {}
          avatarUrl = uploaded.avatar_url || ''
          avatarPath = uploaded.avatar_path || null
          avatarVersion = Date.now()
        } catch {
          /* Fall back to embedded data URL so the card still shows the photo */
          try {
            avatarUrl = await new Promise((resolve, reject) => {
              const reader = new FileReader()
              reader.onload = () => resolve(String(reader.result || ''))
              reader.onerror = reject
              reader.readAsDataURL(photoFile)
            })
            avatarVersion = Date.now()
          } catch {
            avatarUrl = ''
          }
        }
      }

      commitEmployeeId(agencyId, employeeId)
      const profileExtras = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        name: fullName,
        email: form.email.trim(),
        phone_country: form.phone_country,
        phone,
        address: form.address.trim(),
        birthday: form.birthday,
        gender: form.gender,
        job_title: form.job_title.trim(),
        role: baseRole,
        employment_type: form.employment_type || 'full_time',
        department: form.department,
        start_date: form.start_date,
        work_location: form.work_location,
        employee_id: employeeId,
        avatar_url: avatarUrl,
        avatar_path: avatarPath,
        photo_preview: avatarUrl,
        avatar_version: avatarVersion,
      }
      saveMemberProfile(agencyId, member || { email: form.email.trim() }, profileExtras)

      if (member?.id && (avatarUrl || avatarPath)) {
        onMemberPatched?.(member.id, {
          avatar_url: avatarUrl,
          avatar_path: avatarPath,
          photo_preview: avatarUrl,
          avatar_version: avatarVersion,
        })
      }
    } catch (err) {
      const apiErrors = err.response?.data?.errors
      const message = err.response?.data?.message
      setErrors(
        apiErrors ||
          (message ? { form: [message] } : { form: ['Could not add member. Please try again.'] }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopyCredentials = async () => {
    const email = addedMember?.email || ''
    if (!email || !temporaryPassword) {
      toast.error('Credentials not ready yet')
      return
    }
    const text = `Email: ${email}\nPassword: ${temporaryPassword}`
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Email and password copied')
    } catch {
      toast.error('Could not copy credentials')
    }
  }

  const handleSendInvite = async () => {
    if (!addedMember?.id || !onSendInvite) {
      setInviteSent(true)
      return
    }
    setSendingInvite(true)
    try {
      const result = await onSendInvite(addedMember.id)
      if (result?.temporary_password) setTemporaryPassword(result.temporary_password)
      setInviteSent(true)
      toast.success('Credentials emailed')
    } catch (err) {
      setErrors(err.response?.data?.errors || { invite: ['Could not send invite'] })
      toast.error(err.response?.data?.message || 'Could not send invite')
    } finally {
      setSendingInvite(false)
    }
  }

  const handleAddAnother = () => {
    const defaultMember = roles.find((r) => r.base_role === 'member' && r.is_default) || roles[0]
    setForm((prev) => {
      if (prev.photo_preview) URL.revokeObjectURL(prev.photo_preview)
      return {
        ...EMPTY_FORM,
        employee_id: peekNextEmployeeId(agencyId, members),
        custom_role_id: defaultMember ? String(defaultMember.id) : '',
      }
    })
    setErrors({})
    setAddedMember(null)
    setInviteSent(false)
    setTemporaryPassword('')
    setStep('form')
  }

  const departmentOptions = [
    { value: '', label: 'Select department' },
    ...departments.map((d) => ({ value: d.name, label: d.name })),
  ]

  const roleOptions = roles.length > 0
    ? roles.map((r) => ({ value: String(r.id), label: r.name }))
    : FALLBACK_ROLE_OPTIONS

  const previewName =
    `${form.first_name} ${form.last_name}`.trim() || form.email || 'New member'

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={
          step === 'success'
            ? 'sd-team-success-dialog border-0 overflow-hidden p-0'
            : 'sd-team-form-dialog sm:max-w-5xl border-0'
        }
        onPointerDownOutside={(e) => {
          const t = e.target
          if (
            t instanceof Element &&
            (t.closest('[data-slot="dropdown-menu-content"]') ||
              t.closest('[data-radix-popper-content-wrapper]'))
          ) {
            e.preventDefault()
          }
        }}
        onInteractOutside={(e) => {
          const t = e.target
          if (
            t instanceof Element &&
            (t.closest('[data-slot="dropdown-menu-content"]') ||
              t.closest('[data-radix-popper-content-wrapper]'))
          ) {
            e.preventDefault()
          }
        }}
        onFocusOutside={(e) => {
          const t = e.target
          if (
            t instanceof Element &&
            (t.closest('[data-slot="dropdown-menu-content"]') ||
              t.closest('[data-radix-popper-content-wrapper]'))
          ) {
            e.preventDefault()
          }
        }}
      >
        {step === 'success' ? (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>Team member added</DialogTitle>
              <DialogDescription>Success confirmation</DialogDescription>
            </DialogHeader>

            <div className="sd-team-success">
              <CelebrationBurst />
              <div className="sd-team-success__inner">
                <TeamSuccessIllustration />
                <h3 className="sd-team-success__title">Successfully added team member</h3>
                <p className="sd-team-success__subtitle">
                  {addedMember?.name || 'New member'} is on your team
                  {addedMember?.email ? (
                    <>
                      {' '}
                      · <span className="text-foreground">{addedMember.email}</span>
                    </>
                  ) : null}
                </p>
                <p className="sd-team-success__hint">
                  Share these login credentials. When they sign in, they land on Tasks so they can start work.
                </p>

                <div className="sd-team-invite-success sd-team-success__invite">
                  <div className="sd-team-success__cred">
                    <span>Email</span>
                    <code>{addedMember?.email || '—'}</code>
                  </div>
                  <div className="sd-team-success__cred">
                    <span>Password</span>
                    <code>{temporaryPassword || '—'}</code>
                  </div>
                </div>

                {inviteSent && (
                  <p className="sd-team-success__sent">Credentials emailed</p>
                )}
                {errors.invite?.[0] && <FieldError message={errors.invite[0]} />}

                <div className="sd-team-success__actions">
                  <Button
                    className="sd-btn-gradient h-11 rounded-full px-6"
                    onClick={handleCopyCredentials}
                    disabled={!temporaryPassword || !addedMember?.email}
                  >
                    <IconCopy size={16} />
                    Copy credentials
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 rounded-full px-5"
                    onClick={handleSendInvite}
                    disabled={sendingInvite || inviteSent || !addedMember?.id}
                  >
                    <IconMailForward size={16} />
                    {sendingInvite ? 'Sending…' : inviteSent ? 'Email sent' : 'Send email'}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 rounded-full px-5"
                    onClick={handleAddAnother}
                  >
                    <IconUserPlus size={16} />
                    Add another
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  className="mt-1 rounded-full text-muted-foreground"
                  onClick={() => handleClose(false)}
                >
                  Done
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="sd-team-form-dialog__header">
              <DialogTitle>Add team member</DialogTitle>
              <DialogDescription>
                Add someone to your agency workspace. You’ll get login credentials to share next.
              </DialogDescription>
            </DialogHeader>

            <div className="sd-team-form">
              <FieldError message={errors.form?.[0]} />

              <div className="sd-team-form__row sd-team-form__row--photo">
                <div className="sd-team-form__field">
                  <Label>Profile photo</Label>
                  <div className="sd-team-form__photo-inline">
                    <button
                      type="button"
                      className="sd-team-form__photo-btn"
                      onClick={() => fileRef.current?.click()}
                    >
                        <Avatar className="size-11">
                          {form.photo_preview ? (
                            <AvatarImage src={form.photo_preview} alt="" />
                          ) : null}
                          <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                            {getInitials(previewName)}
                          </AvatarFallback>
                        </Avatar>
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
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhoto}
                    />
                  </div>
                </div>
              </div>

              <div className="sd-team-form__row sd-team-form__row--2">
                <div className="sd-team-form__field">
                  <Label htmlFor="tm-first">First name</Label>
                  <Input
                    id="tm-first"
                    className="sd-team-field"
                    value={form.first_name}
                    onChange={(e) => setField('first_name', e.target.value)}
                  />
                  <FieldError message={errors.first_name?.[0]} />
                </div>
                <div className="sd-team-form__field">
                  <Label htmlFor="tm-last">Last name</Label>
                  <Input
                    id="tm-last"
                    className="sd-team-field"
                    value={form.last_name}
                    onChange={(e) => setField('last_name', e.target.value)}
                  />
                  <FieldError message={errors.last_name?.[0]} />
                </div>
              </div>

              <div className="sd-team-form__row sd-team-form__row--2">
                <div className="sd-team-form__field">
                  <Label htmlFor="tm-email">Email</Label>
                  <Input
                    id="tm-email"
                    type="email"
                    className="sd-team-field"
                    value={form.email}
                    onChange={(e) => setField('email', e.target.value)}
                  />
                  <FieldError message={errors.email?.[0]} />
                </div>
                <div className="sd-team-form__field">
                  <Label htmlFor="tm-phone">Phone No</Label>
                  <div className="sd-team-form__phone">
                    <TeamSelect
                      id="tm-phone-country"
                      aria-label="Country code"
                      className="sd-team-form__phone-country"
                      contentClassName="sd-team-select-content--countries"
                      value={form.phone_country}
                      onValueChange={(v) => setField('phone_country', v)}
                      options={COUNTRY_SELECT_OPTIONS}
                      placeholder="Country"
                    />
                    <Input
                      id="tm-phone"
                      type="tel"
                      className="sd-team-field"
                      placeholder="77 123 4567"
                      value={form.phone}
                      onChange={(e) => setField('phone', e.target.value)}
                    />
                  </div>
                  <FieldError message={errors.phone?.[0]} />
                </div>
              </div>

              <div className="sd-team-form__row sd-team-form__row--3">
                <div className="sd-team-form__field">
                  <Label htmlFor="tm-address">Address</Label>
                  <Input
                    id="tm-address"
                    className="sd-team-field"
                    value={form.address}
                    onChange={(e) => setField('address', e.target.value)}
                  />
                </div>
                <div className="sd-team-form__field">
                  <Label htmlFor="tm-birthday">Birthday</Label>
                  <TeamDatePicker
                    id="tm-birthday"
                    value={form.birthday}
                    onValueChange={(v) => setField('birthday', v)}
                    placeholder="Select birthday"
                  />
                </div>
                <div className="sd-team-form__field">
                  <Label htmlFor="tm-gender">Gender</Label>
                  <TeamSelect
                    id="tm-gender"
                    value={form.gender}
                    onValueChange={(v) => setField('gender', v)}
                    options={GENDER_OPTIONS}
                    placeholder="Select"
                  />
                </div>
              </div>

              <div className="sd-team-form__row sd-team-form__row--2">
                <div className="sd-team-form__field">
                  <Label htmlFor="tm-position">Position</Label>
                  <Input
                    id="tm-position"
                    className="sd-team-field"
                    placeholder="e.g. Senior Designer"
                    value={form.job_title}
                    onChange={(e) => setField('job_title', e.target.value)}
                  />
                </div>
                <div className="sd-team-form__field">
                  <Label htmlFor="tm-employment">Employment type</Label>
                  <TeamSelect
                    id="tm-employment"
                    value={form.employment_type}
                    onValueChange={(v) => setField('employment_type', v)}
                    options={EMPLOYMENT_OPTIONS}
                    placeholder="Select employment type"
                  />
                  <FieldError message={errors.employment_type?.[0]} />
                </div>
              </div>

              <div className="sd-team-form__row sd-team-form__row--2">
                <div className="sd-team-form__field">
                  <div className="sd-team-form__label-row">
                    <Label htmlFor="tm-role">Role</Label>
                    {onOpenManageRoles ? (
                      <button
                        type="button"
                        className="sd-team-form__link"
                        onClick={onOpenManageRoles}
                      >
                        Manage
                      </button>
                    ) : null}
                  </div>
                  <TeamSelect
                    id="tm-role"
                    value={form.custom_role_id}
                    onValueChange={(v) => setField('custom_role_id', v)}
                    options={roleOptions}
                  />
                  <FieldError message={errors.role?.[0]} />
                </div>
                <div className="sd-team-form__field">
                  <div className="sd-team-form__label-row">
                    <Label htmlFor="tm-department">Department</Label>
                    {onOpenManageDepartments ? (
                      <button
                        type="button"
                        className="sd-team-form__link"
                        onClick={onOpenManageDepartments}
                      >
                        Manage
                      </button>
                    ) : null}
                  </div>
                  <TeamSelect
                    id="tm-department"
                    value={form.department}
                    onValueChange={(v) => setField('department', v)}
                    options={departmentOptions}
                    placeholder="Select department"
                  />
                  <FieldError message={errors.department?.[0]} />
                </div>
              </div>

              <div className="sd-team-form__row sd-team-form__row--3">
                <div className="sd-team-form__field">
                  <Label htmlFor="tm-start">Start date</Label>
                  <TeamDatePicker
                    id="tm-start"
                    value={form.start_date}
                    onValueChange={(v) => setField('start_date', v)}
                    placeholder="Select start date"
                  />
                </div>
                <div className="sd-team-form__field">
                  <Label htmlFor="tm-location">Work location</Label>
                  <TeamSelect
                    id="tm-location"
                    value={form.work_location}
                    onValueChange={(v) => setField('work_location', v)}
                    options={LOCATION_OPTIONS}
                    placeholder="Select"
                  />
                </div>
                <div className="sd-team-form__field">
                  <Label htmlFor="tm-emp-id">Employee ID</Label>
                  <Input
                    id="tm-emp-id"
                    className="sd-team-field"
                    value={form.employee_id}
                    onChange={(e) => setField('employee_id', e.target.value)}
                    placeholder="EMP-0001"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="sd-team-form-dialog__footer gap-2 sm:gap-2">
              <Button
                variant="outline"
                className="h-9 rounded-full px-5"
                onClick={() => handleClose(false)}
              >
                Cancel
              </Button>
              <Button
                className="sd-btn-gradient h-9 rounded-full px-6"
                onClick={handleAddMember}
                disabled={submitting}
              >
                <IconUserPlus size={16} />
                {submitting ? 'Adding…' : 'Add member'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
