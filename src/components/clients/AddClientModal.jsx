import { useEffect, useRef, useState } from 'react'
import {
  IconCamera,
  IconMailForward,
  IconUserPlus,
} from '@tabler/icons-react'
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
import { clientsApi } from '@/services/api'
import TeamSelect from '../team/TeamSelect'
import {
  COUNTRY_SELECT_OPTIONS,
  dialFromCountryValue,
} from '../team/countryDialCodes'
import CelebrationBurst from '../team/CelebrationBurst'
import TeamSuccessIllustration from '../team/TeamSuccessIllustration'

const TIER_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'vip', label: 'VIP' },
  { value: 'enterprise', label: 'Enterprise' },
]

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  company_name: '',
  email: '',
  phone_country: 'LK:+94',
  phone: '',
  address: '',
  tier: '',
  photo_preview: '',
}

function FieldError({ message }) {
  if (!message) return null
  return <p className="sd-team-form__error">{message}</p>
}

export default function AddClientModal({ open, onOpenChange, onSuccess }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [sendingInvite, setSendingInvite] = useState(false)
  const [step, setStep] = useState('form')
  const [addedClient, setAddedClient] = useState(null)
  const [inviteSent, setInviteSent] = useState(false)
  const [photoFile, setPhotoFile] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setForm((prev) => {
      if (prev.photo_preview?.startsWith('blob:')) URL.revokeObjectURL(prev.photo_preview)
      return EMPTY_FORM
    })
    setErrors({})
    setStep('form')
    setAddedClient(null)
    setInviteSent(false)
    setSubmitting(false)
    setSendingInvite(false)
    setPhotoFile(null)
  }, [open])

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const resetAll = () => {
    if (form.photo_preview?.startsWith('blob:')) URL.revokeObjectURL(form.photo_preview)
    setForm(EMPTY_FORM)
    setErrors({})
    setStep('form')
    setAddedClient(null)
    setInviteSent(false)
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
    if (file.size > 2 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, photo: ['Image must be 2MB or smaller'] }))
      return
    }
    setPhotoFile(file)
    setForm((prev) => {
      if (prev.photo_preview?.startsWith('blob:')) URL.revokeObjectURL(prev.photo_preview)
      return { ...prev, photo_preview: URL.createObjectURL(file) }
    })
    e.target.value = ''
  }

  const handleAddClient = async () => {
    const localErrors = {}
    if (!form.first_name.trim()) localErrors.first_name = ['First name is required']
    if (!form.last_name.trim()) localErrors.last_name = ['Last name is required']
    if (!form.company_name.trim()) localErrors.company_name = ['Company name is required']
    if (!form.email.trim()) {
      localErrors.email = ['Email is required']
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      localErrors.email = ['Enter a valid email address']
    }
    if (Object.keys(localErrors).length) {
      setErrors(localErrors)
      return
    }

    const fullName = `${form.first_name.trim()} ${form.last_name.trim()}`.trim()
    const phoneDigits = form.phone.trim()
    const dial = dialFromCountryValue(form.phone_country)
    const phone = phoneDigits ? `${dial} ${phoneDigits}`.trim() : ''

    setSubmitting(true)
    try {
      const res = await clientsApi.store({
        company_name: form.company_name.trim(),
        contact_name: fullName,
        contact_email: form.email.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        ...(form.tier ? { tier: form.tier } : {}),
        ...(phone ? { phone } : {}),
        ...(form.phone_country ? { phone_country: form.phone_country } : {}),
        ...(form.address.trim() ? { address: form.address.trim() } : {}),
        send_email: false,
      })
      let client = res.data.data

      if (photoFile && client?.id) {
        try {
          const formData = new FormData()
          formData.append('avatar', photoFile)
          const uploadRes = await clientsApi.uploadAvatar(client.id, formData)
          client = uploadRes.data.data || client
        } catch {
          /* client created — keep success even if photo upload fails */
        }
      }

      setAddedClient(client)
      setStep('success')
      onSuccess?.(client)
    } catch (err) {
      const apiErrors = err.response?.data?.errors || {}
      if (Object.keys(apiErrors).length) {
        const mapped = { ...apiErrors }
        if (apiErrors.contact_name) mapped.first_name = apiErrors.contact_name
        if (apiErrors.contact_email) mapped.email = apiErrors.contact_email
        setErrors(mapped)
      } else {
        setErrors({ form: [err.response?.data?.message || 'Could not add client'] })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleSendInvite = async () => {
    if (!addedClient?.id) {
      setInviteSent(true)
      return
    }
    setSendingInvite(true)
    try {
      await clientsApi.resendInvite(addedClient.id)
      setInviteSent(true)
    } catch (err) {
      setErrors({ invite: [err.response?.data?.message || 'Could not send invite'] })
    } finally {
      setSendingInvite(false)
    }
  }

  const handleAddAnother = () => {
    resetAll()
  }

  const previewName = `${form.first_name} ${form.last_name}`.trim() || 'Client'

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={
          step === 'success'
            ? 'sd-team-success-dialog border-0 overflow-hidden p-0'
            : 'sd-team-form-dialog sm:max-w-3xl border-0'
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
              <DialogTitle>Client added</DialogTitle>
              <DialogDescription>Success confirmation</DialogDescription>
            </DialogHeader>

            <div className="sd-team-success">
              <CelebrationBurst />
              <div className="sd-team-success__inner">
                <TeamSuccessIllustration />
                <h3 className="sd-team-success__title">Successfully added client</h3>
                <p className="sd-team-success__subtitle">
                  {addedClient?.contact_name || 'New contact'} ·{' '}
                  <span className="text-foreground">
                    {addedClient?.company_name || 'Company'}
                  </span>
                  {addedClient?.contact_email ? (
                    <>
                      {' '}
                      · <span className="text-foreground">{addedClient.contact_email}</span>
                    </>
                  ) : null}
                </p>
                {inviteSent && (
                  <p className="sd-team-success__sent">Portal invite email sent</p>
                )}
                {errors.invite?.[0] && <FieldError message={errors.invite[0]} />}

                <div className="sd-team-success__actions">
                  <Button
                    className="sd-btn-gradient h-11 rounded-full px-6"
                    onClick={handleSendInvite}
                    disabled={sendingInvite || inviteSent}
                  >
                    <IconMailForward size={16} />
                    {sendingInvite
                      ? 'Sending…'
                      : inviteSent
                        ? 'Invite sent'
                        : 'Invite to portal'}
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
              <DialogTitle>Add client</DialogTitle>
              <DialogDescription>
                Add a client contact and company. You can invite them to the portal next.
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
                      <Avatar className="size-14">
                        {form.photo_preview ? (
                          <AvatarImage src={form.photo_preview} alt="" />
                        ) : null}
                        <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
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
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      onChange={handlePhoto}
                    />
                  </div>
                  <FieldError message={errors.photo?.[0] || errors.avatar?.[0]} />
                </div>
              </div>

              <div className="sd-team-form__row sd-team-form__row--2">
                <div className="sd-team-form__field">
                  <Label htmlFor="cl-first">First name</Label>
                  <Input
                    id="cl-first"
                    className="sd-team-field"
                    value={form.first_name}
                    onChange={(e) => setField('first_name', e.target.value)}
                  />
                  <FieldError message={errors.first_name?.[0]} />
                </div>
                <div className="sd-team-form__field">
                  <Label htmlFor="cl-last">Last name</Label>
                  <Input
                    id="cl-last"
                    className="sd-team-field"
                    value={form.last_name}
                    onChange={(e) => setField('last_name', e.target.value)}
                  />
                  <FieldError message={errors.last_name?.[0]} />
                </div>
              </div>

              <div className="sd-team-form__row sd-team-form__row--2">
                <div className="sd-team-form__field">
                  <Label htmlFor="cl-phone">Phone No</Label>
                  <div className="sd-team-form__phone">
                    <TeamSelect
                      id="cl-phone-country"
                      aria-label="Country code"
                      className="sd-team-form__phone-country"
                      contentClassName="sd-team-select-content--countries"
                      value={form.phone_country}
                      onValueChange={(v) => setField('phone_country', v)}
                      options={COUNTRY_SELECT_OPTIONS}
                      placeholder="Country"
                    />
                    <Input
                      id="cl-phone"
                      type="tel"
                      className="sd-team-field"
                      placeholder="77 123 4567"
                      value={form.phone}
                      onChange={(e) => setField('phone', e.target.value)}
                    />
                  </div>
                  <FieldError message={errors.phone?.[0]} />
                </div>
                <div className="sd-team-form__field">
                  <Label htmlFor="cl-address">Address</Label>
                  <Input
                    id="cl-address"
                    className="sd-team-field"
                    value={form.address}
                    onChange={(e) => setField('address', e.target.value)}
                  />
                </div>
              </div>

              <div className="sd-team-form__row">
                <div className="sd-team-form__field">
                  <Label htmlFor="cl-company">Company name</Label>
                  <Input
                    id="cl-company"
                    className="sd-team-field"
                    placeholder="e.g. NovaTech Ltd"
                    value={form.company_name}
                    onChange={(e) => setField('company_name', e.target.value)}
                  />
                  <FieldError message={errors.company_name?.[0]} />
                </div>
              </div>

              <div className="sd-team-form__row sd-team-form__row--2">
                <div className="sd-team-form__field">
                  <Label htmlFor="cl-email">Email</Label>
                  <Input
                    id="cl-email"
                    type="email"
                    className="sd-team-field"
                    value={form.email}
                    onChange={(e) => setField('email', e.target.value)}
                  />
                  <FieldError message={errors.email?.[0]} />
                </div>
                <div className="sd-team-form__field">
                  <Label htmlFor="cl-tier">Client tag</Label>
                  <TeamSelect
                    id="cl-tier"
                    value={form.tier}
                    onValueChange={(v) => setField('tier', v)}
                    options={TIER_OPTIONS}
                    placeholder="Select tag"
                  />
                  <FieldError message={errors.tier?.[0]} />
                </div>
              </div>
            </div>

            <DialogFooter className="sd-team-form-dialog__footer gap-2 sm:gap-2">
              <Button
                variant="outline"
                className="h-10 rounded-full px-5"
                onClick={() => handleClose(false)}
              >
                Cancel
              </Button>
              <Button
                className="sd-btn-gradient h-10 rounded-full px-6"
                onClick={handleAddClient}
                disabled={submitting}
              >
                <IconUserPlus size={16} />
                {submitting ? 'Adding…' : 'Add client'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
