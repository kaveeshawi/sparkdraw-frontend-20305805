import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  IconBuilding,
  IconCamera,
  IconCheck,
  IconPalette,
  IconPlus,
  IconSettings,
  IconTrash,
  IconUsers,
  IconArrowRight,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { agencyApi } from '@/services/api'
import useAuthStore from '@/store/authStore'
import useSettingsStore from '@/store/settingsStore'
import { cn } from '@/lib/utils'
import { CURRENCY_OPTIONS, DEFAULT_CURRENCY, normalizeCurrency } from '@/lib/currency'
import { setAgencyCurrency } from '@/hooks/useAgencyCurrency'
import { agencyLogoSrc } from '@/lib/media'
import {
  DAY_OPTIONS,
  loadAttendanceSettings,
  saveAttendanceSettings,
} from '@/lib/attendanceSettings'

const NAV = [
  { id: 'company', label: 'Company', icon: IconBuilding },
  { id: 'branding', label: 'Branding', icon: IconPalette },
  { id: 'schedule', label: 'Schedule', icon: IconSettings },
]

const EMPTY_SOCIAL = {
  facebook: '',
  instagram: '',
  linkedin: '',
  twitter: '',
  youtube: '',
  tiktok: '',
}

const SOCIAL_FIELDS = [
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/…' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/…' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/company/…' },
  { key: 'twitter', label: 'X / Twitter', placeholder: 'https://x.com/…' },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/…' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@…' },
]

function LogoUpload({ label, hint, src, disabled, onPick, onClear, dark }) {
  const inputRef = useRef(null)

  return (
    <div className={cn('sd-settings-logo', dark && 'is-dark')}>
      <div className="sd-settings-logo__preview" aria-hidden>
        {src ? (
          <img src={src} alt="" />
        ) : (
          <span>{dark ? 'Dark' : 'Light'}</span>
        )}
      </div>
      <div className="sd-settings-logo__meta">
        <p className="sd-settings-logo__label">{label}</p>
        <p className="sd-settings-logo__hint">{hint}</p>
        <div className="sd-settings-logo__actions">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            <IconCamera size={14} stroke={1.75} />
            Upload
          </Button>
          {src ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-full text-muted-foreground"
              disabled={disabled}
              onClick={onClear}
            >
              Remove
            </Button>
          ) : null}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) onPick(file)
        }}
      />
    </div>
  )
}

export default function SettingsModal() {
  const { open, section, closeSettings, setSection, openSettings } = useSettingsStore()
  const { user, setUser } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const [agency, setAgency] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [address, setAddress] = useState('')
  const [social, setSocial] = useState(EMPTY_SOCIAL)
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY)
  const [primary, setPrimary] = useState('#802AEE')
  const [light, setLight] = useState('#f3e8ff')
  const [logoPreview, setLogoPreview] = useState('')
  const [logoDarkPreview, setLogoDarkPreview] = useState('')

  const [workingDays, setWorkingDays] = useState(() => loadAttendanceSettings().workingDays)
  const [holidays, setHolidays] = useState(() => loadAttendanceSettings().holidays)
  const [holidayDate, setHolidayDate] = useState('')
  const [holidayLabel, setHolidayLabel] = useState('Poya Day')
  const [savingSchedule, setSavingSchedule] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    const schedule = loadAttendanceSettings()
    setWorkingDays(schedule.workingDays)
    setHolidays(schedule.holidays)

    agencyApi
      .show()
      .then((res) => {
        hydrate(res.data.data)
      })
      .catch(() => {
        hydrate(useAuthStore.getState().user?.agency || {})
      })
      .finally(() => setLoading(false))
  }, [open])

  const hydrate = (a) => {
    setAgency(a)
    setName(a.name || '')
    setEmail(a.email || '')
    setPhone(a.phone || '')
    setWebsite(a.website || '')
    setAddress(a.address || '')
    setSocial({
      ...EMPTY_SOCIAL,
      ...(a.social_links || {}),
    })
    setCurrency(normalizeCurrency(a.currency || user?.agency?.currency))
    setPrimary(a.brand_colors?.primary || '#802AEE')
    setLight(a.brand_colors?.light || '#f3e8ff')
    setLogoPreview('')
    setLogoDarkPreview('')
  }

  const syncAuthAgency = (updated) => {
    if (!user) return
    setUser({
      ...user,
      agency: {
        ...(user.agency || {}),
        ...updated,
      },
    })
  }

  const uploadLogo = async (file, variant) => {
    if (!isAdmin) return
    setUploading(variant)
    const preview = URL.createObjectURL(file)
    if (variant === 'dark') setLogoDarkPreview(preview)
    else setLogoPreview(preview)

    try {
      const formData = new FormData()
      formData.append('logo', file)
      formData.append('variant', variant)
      const res = await agencyApi.uploadLogo(formData)
      const data = res.data.data
      setAgency((prev) => ({ ...prev, ...data }))
      syncAuthAgency(data)
      toast.success(variant === 'dark' ? 'Dark logo uploaded' : 'Logo uploaded')
    } catch (err) {
      if (variant === 'dark') setLogoDarkPreview('')
      else setLogoPreview('')
      toast.error(err.response?.data?.message || 'Logo upload failed')
    } finally {
      setUploading(null)
    }
  }

  const clearLogoLocal = (variant) => {
    if (variant === 'dark') setLogoDarkPreview('')
    else setLogoPreview('')
    toast.message('Pick a new file to replace this logo')
  }

  const handleSaveCompany = async () => {
    if (!isAdmin) return
    setSaving(true)
    try {
      const res = await agencyApi.update({
        name,
        email: email || null,
        phone: phone || null,
        website: website || null,
        address: address || null,
        social_links: social,
        currency: normalizeCurrency(currency),
        brand_colors: { primary, light },
      })
      const updated = res.data.data
      setAgency((prev) => ({ ...prev, ...updated }))
      const nextCurrency = normalizeCurrency(updated.currency || currency)
      setCurrency(nextCurrency)
      setAgencyCurrency(nextCurrency)
      syncAuthAgency(updated)
      toast.success('Company settings saved')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const toggleWorkingDay = (id) => {
    if (!isAdmin) return
    setWorkingDays((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev
        return prev.filter((d) => d !== id)
      }
      return [...prev, id].sort((a, b) => {
        const order = [1, 2, 3, 4, 5, 6, 0]
        return order.indexOf(a) - order.indexOf(b)
      })
    })
  }

  const addHoliday = () => {
    if (!isAdmin || !holidayDate) return
    const date = holidayDate.slice(0, 10)
    const label = holidayLabel.trim() || 'Holiday'
    setHolidays((prev) => {
      if (prev.some((h) => h.date === date)) {
        toast.error('That date is already added')
        return prev
      }
      return [...prev, { id: `${date}-${label}`, date, label }].sort((a, b) => a.date.localeCompare(b.date))
    })
    setHolidayDate('')
  }

  const removeHoliday = (id) => {
    if (!isAdmin) return
    setHolidays((prev) => prev.filter((h) => h.id !== id))
  }

  const handleSaveSchedule = () => {
    if (!isAdmin) return
    setSavingSchedule(true)
    try {
      saveAttendanceSettings({ workingDays, holidays })
      toast.success('Attendance schedule saved')
    } finally {
      setSavingSchedule(false)
    }
  }

  const lightLogo = agencyLogoSrc(agency, { preview: logoPreview })
  const darkLogo = agencyLogoSrc(agency, { dark: true, preview: logoDarkPreview })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) closeSettings()
        else openSettings(section)
      }}
    >
      <DialogContent className="sd-team-form-dialog sd-settings-dialog sm:max-w-5xl border-0">
        <DialogHeader className="sd-team-form-dialog__header">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Company profile, branding, currency, and attendance schedule.
          </DialogDescription>
        </DialogHeader>

        <div className="sd-settings-dialog__body">
          <aside className="sd-settings-dialog__nav" aria-label="Settings sections">
            {NAV.map((item) => {
              const Icon = item.icon
              const active = section === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  className={cn('sd-settings-dialog__nav-item', active && 'is-active')}
                  onClick={() => setSection(item.id)}
                >
                  <Icon size={16} stroke={1.75} />
                  {item.label}
                </button>
              )
            })}
          </aside>

          <div className="sd-settings-dialog__main">
            {loading ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-9 w-full max-w-md" />
                <Skeleton className="h-9 w-full max-w-md" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : (
              <>
                {section === 'company' && (
                  <div className="sd-team-form">
                    <div className="sd-settings-dialog__section-head">
                      <h3>Company profile</h3>
                      <p>Logos, name, address and public contact details used across the workspace.</p>
                    </div>

                    <div className="sd-team-form__row sd-team-form__row--2">
                      <LogoUpload
                        label="Logo"
                        hint="Default / light backgrounds"
                        src={lightLogo}
                        disabled={!isAdmin || uploading === 'light'}
                        onPick={(file) => uploadLogo(file, 'light')}
                        onClear={() => clearLogoLocal('light')}
                      />
                      <LogoUpload
                        label="Logo (dark)"
                        hint="Dark backgrounds / inverted use"
                        src={darkLogo}
                        disabled={!isAdmin || uploading === 'dark'}
                        onPick={(file) => uploadLogo(file, 'dark')}
                        onClear={() => clearLogoLocal('dark')}
                        dark
                      />
                    </div>

                    <div className="sd-team-form__row">
                      <div className="sd-team-form__field">
                        <Label htmlFor="set-name">Company name</Label>
                        <Input
                          id="set-name"
                          className="sd-team-field"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          disabled={!isAdmin}
                        />
                      </div>
                    </div>

                    <div className="sd-team-form__row">
                      <div className="sd-team-form__field">
                        <Label htmlFor="set-address">Address</Label>
                        <Textarea
                          id="set-address"
                          className="sd-team-field min-h-[72px]"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          disabled={!isAdmin}
                          placeholder="Street, city, country"
                        />
                      </div>
                    </div>

                    <div className="sd-team-form__row sd-team-form__row--2">
                      <div className="sd-team-form__field">
                        <Label htmlFor="set-email">Email</Label>
                        <Input
                          id="set-email"
                          type="email"
                          className="sd-team-field"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={!isAdmin}
                          placeholder="hello@agency.com"
                        />
                      </div>
                      <div className="sd-team-form__field">
                        <Label htmlFor="set-phone">Contact number</Label>
                        <Input
                          id="set-phone"
                          className="sd-team-field"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          disabled={!isAdmin}
                          placeholder="+94 77 123 4567"
                        />
                      </div>
                    </div>

                    <div className="sd-team-form__row">
                      <div className="sd-team-form__field">
                        <Label htmlFor="set-web">Website</Label>
                        <Input
                          id="set-web"
                          className="sd-team-field"
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                          disabled={!isAdmin}
                          placeholder="https://www.agency.com"
                        />
                      </div>
                    </div>

                    <div className="sd-settings-dialog__section-head">
                      <h3>Social media</h3>
                      <p>Optional public profiles shown on the client portal and invoices.</p>
                    </div>

                    <div className="sd-team-form__row sd-team-form__row--2">
                      {SOCIAL_FIELDS.map((field) => (
                        <div key={field.key} className="sd-team-form__field">
                          <Label htmlFor={`set-social-${field.key}`}>{field.label}</Label>
                          <Input
                            id={`set-social-${field.key}`}
                            className="sd-team-field"
                            value={social[field.key] || ''}
                            onChange={(e) => setSocial((prev) => ({ ...prev, [field.key]: e.target.value }))}
                            disabled={!isAdmin}
                            placeholder={field.placeholder}
                          />
                        </div>
                      ))}
                    </div>

                    {!isAdmin && (
                      <p className="sd-settings-hint">Only agency admins can edit company settings.</p>
                    )}
                  </div>
                )}

                {section === 'branding' && (
                  <div className="sd-team-form">
                    <div className="sd-settings-dialog__section-head">
                      <h3>Branding & currency</h3>
                      <p>White-label colors for the client portal and the currency used system-wide.</p>
                    </div>

                    <div className="sd-team-form__row">
                      <div className="sd-team-form__field max-w-sm">
                        <Label htmlFor="set-currency">Currency</Label>
                        <select
                          id="set-currency"
                          value={currency}
                          onChange={(e) => setCurrency(normalizeCurrency(e.target.value))}
                          disabled={!isAdmin}
                          className="sd-settings-select"
                        >
                          {CURRENCY_OPTIONS.map((opt) => (
                            <option key={opt.code} value={opt.code}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <p className="sd-team-form__hint">Used for payroll, invoices, budgets, and revenue.</p>
                      </div>
                    </div>

                    <div className="sd-team-form__row sd-team-form__row--2">
                      <div className="sd-team-form__field">
                        <Label htmlFor="set-primary">Primary color</Label>
                        <div className="flex items-center gap-2">
                          <input
                            id="set-primary"
                            type="color"
                            value={primary}
                            onChange={(e) => setPrimary(e.target.value)}
                            disabled={!isAdmin}
                            className="size-9 cursor-pointer rounded-md border border-input bg-transparent p-0.5 disabled:cursor-not-allowed"
                          />
                          <Input
                            value={primary}
                            onChange={(e) => setPrimary(e.target.value)}
                            disabled={!isAdmin}
                            className="sd-team-field w-28"
                          />
                        </div>
                      </div>
                      <div className="sd-team-form__field">
                        <Label htmlFor="set-light">Light accent</Label>
                        <div className="flex items-center gap-2">
                          <input
                            id="set-light"
                            type="color"
                            value={light}
                            onChange={(e) => setLight(e.target.value)}
                            disabled={!isAdmin}
                            className="size-9 cursor-pointer rounded-md border border-input bg-transparent p-0.5 disabled:cursor-not-allowed"
                          />
                          <Input
                            value={light}
                            onChange={(e) => setLight(e.target.value)}
                            disabled={!isAdmin}
                            className="sd-team-field w-28"
                          />
                        </div>
                      </div>
                    </div>

                    {agency?.domain_slug && (
                      <p className="text-xs text-muted-foreground">
                        Client portal slug:{' '}
                        <code className="rounded bg-muted px-1.5 py-0.5">{agency.domain_slug}</code>
                      </p>
                    )}
                  </div>
                )}

                {section === 'schedule' && (
                  <div className="sd-team-form">
                    <div className="sd-settings-dialog__section-head">
                      <h3>Working days</h3>
                      <p>Mark which weekdays count as office days on the attendance calendar.</p>
                    </div>

                    <div className="sd-settings-days" role="group" aria-label="Working days">
                      {DAY_OPTIONS.map((day) => {
                        const on = workingDays.includes(day.id)
                        return (
                          <button
                            key={day.id}
                            type="button"
                            disabled={!isAdmin}
                            aria-pressed={on}
                            className={cn('sd-settings-day', on && 'is-on')}
                            onClick={() => toggleWorkingDay(day.id)}
                            title={day.full}
                          >
                            {on && <IconCheck size={12} stroke={2.25} className="sd-settings-day__check" />}
                            <span className="sd-settings-day__label">{day.label}</span>
                          </button>
                        )
                      })}
                    </div>

                    <div className="sd-settings-dialog__section-head">
                      <h3>Special holidays</h3>
                      <p>Poya days and other agency holidays override working days.</p>
                    </div>

                    {isAdmin && (
                      <div className="sd-settings-holiday-form">
                        <div className="sd-settings-holiday-form__field">
                          <Label htmlFor="set-holiday-date">Date</Label>
                          <Input
                            id="set-holiday-date"
                            type="date"
                            className="sd-team-field"
                            value={holidayDate}
                            onChange={(e) => setHolidayDate(e.target.value)}
                          />
                        </div>
                        <div className="sd-settings-holiday-form__field sd-settings-holiday-form__field--grow">
                          <Label htmlFor="set-holiday-label">Label</Label>
                          <Input
                            id="set-holiday-label"
                            className="sd-team-field"
                            value={holidayLabel}
                            onChange={(e) => setHolidayLabel(e.target.value)}
                            placeholder="Poya Day"
                          />
                        </div>
                        <Button type="button" onClick={addHoliday} disabled={!holidayDate} className="sd-settings-holiday-form__add">
                          <IconPlus size={15} stroke={1.75} />
                          Add
                        </Button>
                      </div>
                    )}

                    <ul className="sd-settings-holiday-list">
                      {holidays.length === 0 ? (
                        <li className="sd-settings-holiday-empty">No special holidays added yet.</li>
                      ) : (
                        holidays.map((h) => (
                          <li key={h.id} className="sd-settings-holiday-item">
                            <div>
                              <p className="sd-settings-holiday-item__label">{h.label}</p>
                              <p className="sd-settings-holiday-item__date">
                                {new Date(`${h.date}T12:00:00`).toLocaleDateString('en-GB', {
                                  weekday: 'short',
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </p>
                            </div>
                            {isAdmin && (
                              <button
                                type="button"
                                className="sd-settings-holiday-item__remove"
                                aria-label={`Remove ${h.label}`}
                                onClick={() => removeHoliday(h.id)}
                              >
                                <IconTrash size={15} stroke={1.75} />
                              </button>
                            )}
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                )}
              </>
            )}

            <Link to="/team" className="sd-settings-dialog__team-link" onClick={closeSettings}>
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <IconUsers size={16} stroke={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Team management</p>
                <p className="text-xs text-muted-foreground">Invite members, change roles, and remove access.</p>
              </div>
              <IconArrowRight size={15} className="shrink-0 text-muted-foreground" />
            </Link>
          </div>
        </div>

        <DialogFooter className="sd-team-form-dialog__footer">
          <Button type="button" variant="outline" className="rounded-full" onClick={closeSettings}>
            Close
          </Button>
          {isAdmin && section === 'schedule' ? (
            <Button type="button" className="sd-btn-gradient rounded-full" disabled={savingSchedule} onClick={handleSaveSchedule}>
              {savingSchedule ? 'Saving…' : 'Save schedule'}
            </Button>
          ) : null}
          {isAdmin && (section === 'company' || section === 'branding') ? (
            <Button type="button" className="sd-btn-gradient rounded-full" disabled={saving || loading} onClick={handleSaveCompany}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
