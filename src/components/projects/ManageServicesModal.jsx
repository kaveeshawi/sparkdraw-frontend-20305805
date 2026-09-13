import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  IconBriefcase,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconList,
  IconPencil,
  IconPlus,
  IconTrash,
  IconUsers,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { agencyServicesApi, rolesApi } from '@/services/api'
import { invalidateAgencyServicesCache } from '@/hooks/useAgencyServices'
import { useAgencyCurrency, useFormatMoney } from '@/hooks/useAgencyCurrency'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const TABS = [
  { id: 'new', label: 'Add new', icon: IconPlus },
  { id: 'existing', label: 'Existing services', icon: IconList },
]

function emptyPackageDraft() {
  return {
    key: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    id: null,
    name: '',
    includes: '',
    price: '',
    duration_hours: '',
    suggested_roles: [],
  }
}

function projectsForService(projects, serviceName) {
  const needle = String(serviceName || '').trim().toLowerCase()
  if (!needle) return []
  return projects.filter((p) => String(p.type || '').trim().toLowerCase() === needle)
}

function RoleChips({ value = [], onChange, disabled, options = [] }) {
  const selected = Array.isArray(value) ? value : []
  const optionNames = options.map((o) => o.name)
  const extras = selected.filter((r) => !optionNames.includes(r))
  const chips = [
    ...options.map((o) => ({ value: o.name, label: o.name, count: o.member_count })),
    ...extras.map((r) => ({ value: r, label: r, count: null, orphan: true })),
  ]

  const toggle = (role) => {
    if (selected.includes(role)) onChange(selected.filter((r) => r !== role))
    else onChange([...selected, role])
  }

  if (!chips.length) {
    return (
      <p className="text-[12px] text-muted-foreground">
        No team roles yet. Add roles under Team first, then come back to select them here.
      </p>
    )
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((opt) => {
        const on = selected.includes(opt.value)
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => toggle(opt.value)}
            title={opt.orphan ? 'Saved on this package — role may no longer exist on Team' : undefined}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
              on ? 'bg-primary/15 text-primary ring-1 ring-primary/40' : 'bg-muted text-muted-foreground'
            }`}
          >
            {opt.label}
            {typeof opt.count === 'number' ? (
              <span className="ml-1 opacity-70">({opt.count})</span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

function TeamRolesTip() {
  return (
    <p className="text-[11px] leading-relaxed text-muted-foreground">
      Fill your Team roles first, then pick roles per package.{' '}
      <Link
        to="/team"
        className="inline-flex items-center gap-0.5 font-medium text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        <IconUsers size={12} />
        Open Team
      </Link>
    </p>
  )
}

function PackageEditor({
  pkg,
  index,
  onChange,
  onRemove,
  disabled,
  roleOptions,
  canRemove,
  idPrefix,
  currencyLabel = 'USD',
}) {
  const set = (field) => (value) => onChange({ ...pkg, [field]: value })

  return (
    <div className="sd-svc-package-card">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Package {index + 1}
        </p>
        {canRemove ? (
          <button
            type="button"
            className="sd-dept-row__action sd-dept-row__action--delete"
            aria-label="Remove package"
            title="Remove package"
            disabled={disabled}
            onClick={onRemove}
          >
            <IconTrash size={15} stroke={1.75} />
          </button>
        ) : null}
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-medium text-muted-foreground" htmlFor={`${idPrefix}-name`}>
          Package name
        </label>
        <Input
          id={`${idPrefix}-name`}
          className="sd-team-field"
          placeholder="e.g. Starter, Pro, Enterprise"
          value={pkg.name}
          disabled={disabled}
          onChange={(e) => set('name')(e.target.value)}
        />
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-medium text-muted-foreground" htmlFor={`${idPrefix}-includes`}>
          What&apos;s included
        </label>
        <Textarea
          id={`${idPrefix}-includes`}
          className="sd-team-field sd-team-field--textarea min-h-[4.5rem]"
          placeholder={'One item per line — e.g.\n5-page marketing site\nCMS + contact forms\nLaunch support'}
          value={pkg.includes}
          disabled={disabled}
          onChange={(e) => set('includes')(e.target.value)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground" htmlFor={`${idPrefix}-hours`}>
            Duration (hours)
          </label>
          <Input
            id={`${idPrefix}-hours`}
            type="number"
            min="1"
            className="sd-team-field"
            placeholder="e.g. 80"
            value={pkg.duration_hours}
            disabled={disabled}
            onChange={(e) => set('duration_hours')(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground" htmlFor={`${idPrefix}-price`}>
            Price ({currencyLabel})
          </label>
          <Input
            id={`${idPrefix}-price`}
            type="number"
            min="0"
            className="sd-team-field"
            placeholder="e.g. 3500"
            value={pkg.price}
            disabled={disabled}
            onChange={(e) => set('price')(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-medium text-muted-foreground">Roles for this package</p>
        <TeamRolesTip />
        <RoleChips
          value={pkg.suggested_roles}
          onChange={set('suggested_roles')}
          disabled={disabled}
          options={roleOptions}
        />
      </div>
    </div>
  )
}

function packageToPayload(pkg) {
  return {
    ...(pkg.id ? { id: pkg.id } : {}),
    name: pkg.name.trim(),
    includes: pkg.includes.trim() || null,
    price: pkg.price !== '' && pkg.price != null ? Number(pkg.price) : null,
    duration_hours: pkg.duration_hours !== '' && pkg.duration_hours != null
      ? Number(pkg.duration_hours)
      : null,
    suggested_roles: Array.isArray(pkg.suggested_roles) && pkg.suggested_roles.length
      ? pkg.suggested_roles
      : null,
  }
}

function packageFromApi(pkg) {
  return {
    key: `pkg-${pkg.id}`,
    id: pkg.id,
    name: pkg.name || '',
    includes: pkg.includes || '',
    price: pkg.price != null ? String(pkg.price) : '',
    duration_hours: pkg.duration_hours != null ? String(pkg.duration_hours) : '',
    suggested_roles: Array.isArray(pkg.suggested_roles) ? pkg.suggested_roles : [],
  }
}

export default function ManageServicesModal({
  open,
  onOpenChange,
  projects = [],
  onServicesChange,
  onServiceRenamed,
}) {
  const currency = useAgencyCurrency()
  const formatMoney = useFormatMoney()
  const [services, setServices] = useState([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [draftPackages, setDraftPackages] = useState([emptyPackageDraft()])
  const [error, setError] = useState('')
  const [pendingRemoveId, setPendingRemoveId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editPackages, setEditPackages] = useState([])
  const [editError, setEditError] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [teamRoles, setTeamRoles] = useState([])
  const [activeTab, setActiveTab] = useState('existing')

  useEffect(() => {
    if (!open) return
    setName('')
    setDescription('')
    setDraftPackages([emptyPackageDraft()])
    setError('')
    setPendingRemoveId(null)
    setEditingId(null)
    setEditName('')
    setEditDescription('')
    setEditPackages([])
    setEditError('')
    setExpandedId(null)
    setActiveTab('existing')
    agencyServicesApi
      .index()
      .then((res) => {
        const rows = res.data.data || []
        setServices(rows)
        onServicesChange?.(rows)
        if (rows.length === 0) setActiveTab('new')
      })
      .catch(() => {
        setServices([])
        setActiveTab('new')
      })
    rolesApi
      .index()
      .then((res) => setTeamRoles(Array.isArray(res.data?.data) ? res.data.data : []))
      .catch(() => setTeamRoles([]))
  }, [open])

  const roleOptions = useMemo(
    () =>
      [...teamRoles]
        .filter((r) => r?.name)
        .sort((a, b) => String(a.name).localeCompare(String(b.name))),
    [teamRoles],
  )

  const sorted = useMemo(
    () => [...services].sort((a, b) => a.name.localeCompare(b.name)),
    [services],
  )

  const validatePackages = (pkgs) => {
    const named = pkgs.filter((p) => p.name.trim())
    if (!named.length) return 'Add at least one package with a name'
    const keys = named.map((p) => p.name.trim().toLowerCase())
    if (new Set(keys).size !== keys.length) return 'Package names must be unique under this service'
    return ''
  }

  const handleAdd = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Service name is required')
      return
    }
    const exists = services.some(
      (s) => s.name.trim().toLowerCase() === trimmed.toLowerCase(),
    )
    if (exists) {
      setError('That service already exists')
      return
    }
    const pkgErr = validatePackages(draftPackages)
    if (pkgErr) {
      setError(pkgErr)
      return
    }

    setBusy(true)
    try {
      const res = await agencyServicesApi.store({
        name: trimmed,
        description: description.trim() || null,
        packages: draftPackages
          .filter((p) => p.name.trim())
          .map(packageToPayload),
      })
      const created = res.data.data
      const next = [created, ...services]
      setServices(next)
      onServicesChange?.(next)
      setName('')
      setDescription('')
      setDraftPackages([emptyPackageDraft()])
      setError('')
      setActiveTab('existing')
      setExpandedId(created.id)
      invalidateAgencyServicesCache()
      toast.success('Service created')
    } catch (err) {
      setError(err.response?.data?.message || 'Could not add service')
    } finally {
      setBusy(false)
    }
  }

  const handleRemove = async (id) => {
    setBusy(true)
    try {
      await agencyServicesApi.remove(id)
      const next = services.filter((s) => s.id !== id)
      setServices(next)
      onServicesChange?.(next)
      setPendingRemoveId(null)
      if (editingId === id) cancelEdit()
      if (expandedId === id) setExpandedId(null)
      invalidateAgencyServicesCache()
      toast.success('Service removed')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not remove service')
    } finally {
      setBusy(false)
    }
  }

  const startEdit = (service) => {
    setPendingRemoveId(null)
    setEditingId(service.id)
    setExpandedId(service.id)
    setEditName(service.name)
    setEditDescription(service.description || '')
    const pkgs = Array.isArray(service.packages) ? service.packages.map(packageFromApi) : []
    setEditPackages(pkgs.length ? pkgs : [emptyPackageDraft()])
    setEditError('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditDescription('')
    setEditPackages([])
    setEditError('')
  }

  const handleSaveEdit = async (service) => {
    const trimmed = editName.trim()
    if (!trimmed) {
      setEditError('Service name is required')
      return
    }
    const exists = services.some(
      (s) =>
        s.id !== service.id &&
        s.name.trim().toLowerCase() === trimmed.toLowerCase(),
    )
    if (exists) {
      setEditError('That service already exists')
      return
    }
    const pkgErr = validatePackages(editPackages)
    if (pkgErr) {
      setEditError(pkgErr)
      return
    }

    const oldName = service.name
    setBusy(true)
    try {
      const res = await agencyServicesApi.update(service.id, {
        name: trimmed,
        description: editDescription.trim() || null,
        packages: editPackages
          .filter((p) => p.name.trim())
          .map(packageToPayload),
      })
      const updated = res.data.data
      const next = services.map((s) => (s.id === service.id ? updated : s))
      setServices(next)
      onServicesChange?.(next)

      if (oldName.trim().toLowerCase() !== trimmed.toLowerCase()) {
        onServiceRenamed?.(oldName, trimmed)
      }

      cancelEdit()
      invalidateAgencyServicesCache()
      toast.success('Service updated')
    } catch (err) {
      setEditError(err.response?.data?.message || 'Could not update service')
    } finally {
      setBusy(false)
    }
  }

  const pendingRemove = pendingRemoveId
    ? services.find((s) => s.id === pendingRemoveId)
    : null

  const pendingLinked = pendingRemove
    ? projectsForService(projects, pendingRemove.name)
    : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sd-dept-dialog sd-dept-dialog--wide border-0">
        <DialogHeader className="sd-dept-dialog__header">
          <DialogTitle>Manage services &amp; packages</DialogTitle>
          <DialogDescription>
            Define a service (e.g. Web Development), then add packages under it — each with includes, price, duration, and roles.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-muted/30 p-1.5 shrink-0">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            const countLabel =
              tab.id === 'existing' && services.length > 0 ? ` (${services.length})` : ''
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id)
                  if (tab.id === 'new') {
                    setPendingRemoveId(null)
                    cancelEdit()
                  }
                }}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13px] cursor-pointer transition-all',
                  active
                    ? 'font-semibold text-primary bg-card-solid shadow-[var(--sd-glow-md)] ring-1 ring-inset ring-primary/15'
                    : 'font-medium text-muted-foreground hover:text-foreground hover:bg-card-solid/60',
                )}
              >
                <Icon size={16} className={active ? 'text-primary' : 'text-muted-foreground'} />
                {tab.label}
                {countLabel}
              </button>
            )
          })}
        </div>

        {activeTab === 'new' ? (
          <div className="sd-dept-dialog__scroll min-h-0 flex-1 overflow-y-auto space-y-4 pr-0.5">
            <div className="space-y-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                New service
              </p>
              <Input
                className="sd-team-field"
                placeholder="Service name — e.g. Web Development"
                value={name}
                disabled={busy}
                onChange={(e) => {
                  setName(e.target.value)
                  setError('')
                }}
              />
              <Textarea
                className="sd-team-field sd-team-field--textarea"
                placeholder="What does this service cover? (shown to AI as category context)"
                value={description}
                disabled={busy}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Packages under this service
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 rounded-full px-3 text-[12px]"
                  disabled={busy}
                  onClick={() => setDraftPackages((prev) => [...prev, emptyPackageDraft()])}
                >
                  <IconPlus size={14} />
                  Add package
                </Button>
              </div>
              {draftPackages.map((pkg, i) => (
                <PackageEditor
                  key={pkg.key}
                  pkg={pkg}
                  index={i}
                  idPrefix={`new-pkg-${pkg.key}`}
                  disabled={busy}
                  roleOptions={roleOptions}
                  currencyLabel={currency}
                  canRemove={draftPackages.length > 1}
                  onChange={(next) => {
                    setDraftPackages((prev) => prev.map((p) => (p.key === pkg.key ? next : p)))
                    setError('')
                  }}
                  onRemove={() =>
                    setDraftPackages((prev) => prev.filter((p) => p.key !== pkg.key))
                  }
                />
              ))}
            </div>

            {error ? <p className="sd-dept-dialog__error">{error}</p> : null}

            <div className="flex justify-end pb-1">
              <Button
                type="button"
                className="sd-btn-gradient h-11 rounded-full px-6"
                onClick={handleAdd}
                disabled={busy}
              >
                <IconPlus size={16} />
                Create service
              </Button>
            </div>
          </div>
        ) : (
          <div className="sd-dept-list-wrap">
            {pendingRemove ? (
              <div className="sd-dept-confirm">
                <div className="sd-dept-confirm__icon">
                  <IconTrash size={22} stroke={1.5} />
                </div>
                <h3>Remove {pendingRemove.name}?</h3>
                <p>
                  {pendingLinked.length > 0
                    ? `${pendingLinked.length} project${pendingLinked.length === 1 ? '' : 's'} use this service. Reassign those projects before removing it.`
                    : 'This service and all its packages will be removed from your catalog.'}
                </p>
                <div className="sd-dept-confirm__actions">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-full px-5"
                    disabled={busy}
                    onClick={() => setPendingRemoveId(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="h-10 rounded-full px-5"
                    disabled={busy || pendingLinked.length > 0}
                    onClick={() => handleRemove(pendingRemove.id)}
                  >
                    Remove service
                  </Button>
                </div>
              </div>
            ) : sorted.length === 0 ? (
              <div className="sd-dept-empty">
                <div className="sd-dept-empty__icon">
                  <IconBriefcase size={22} stroke={1.5} />
                </div>
                <p className="text-sm font-medium">No services yet</p>
                <p className="text-sm text-muted-foreground">
                  Add a service, then create packages under it for new projects.
                </p>
                <Button
                  type="button"
                  className="sd-btn-gradient mt-3 h-10 rounded-full px-5"
                  onClick={() => setActiveTab('new')}
                >
                  <IconPlus size={16} />
                  Add service
                </Button>
              </div>
            ) : (
              <div className="sd-svc-list">
                {sorted.map((service) => {
                  const linked = projectsForService(projects, service.name)
                  const isEditing = editingId === service.id
                  const isExpanded = expandedId === service.id || isEditing
                  const pkgs = Array.isArray(service.packages) ? service.packages : []

                  if (isEditing) {
                    return (
                      <section key={service.id} className="sd-svc-panel sd-svc-panel--editing">
                        <div className="space-y-3">
                          <Input
                            className="sd-team-field"
                            value={editName}
                            autoFocus
                            disabled={busy}
                            onChange={(e) => {
                              setEditName(e.target.value)
                              setEditError('')
                            }}
                          />
                          <Textarea
                            className="sd-team-field sd-team-field--textarea"
                            placeholder="Service description"
                            value={editDescription}
                            disabled={busy}
                            onChange={(e) => setEditDescription(e.target.value)}
                          />
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                              Packages
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-8 rounded-full px-3 text-[12px]"
                              disabled={busy}
                              onClick={() =>
                                setEditPackages((prev) => [...prev, emptyPackageDraft()])
                              }
                            >
                              <IconPlus size={14} />
                              Add package
                            </Button>
                          </div>
                          {editPackages.map((pkg, i) => (
                            <PackageEditor
                              key={pkg.key}
                              pkg={pkg}
                              index={i}
                              idPrefix={`edit-${service.id}-${pkg.key}`}
                              disabled={busy}
                              roleOptions={roleOptions}
                              currencyLabel={currency}
                              canRemove={editPackages.length > 1}
                              onChange={(next) => {
                                setEditPackages((prev) =>
                                  prev.map((p) => (p.key === pkg.key ? next : p)),
                                )
                                setEditError('')
                              }}
                              onRemove={() =>
                                setEditPackages((prev) => prev.filter((p) => p.key !== pkg.key))
                              }
                            />
                          ))}
                          {editError ? (
                            <p className="sd-dept-row__edit-error">{editError}</p>
                          ) : null}
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              className="h-9 rounded-full px-4"
                              disabled={busy}
                              onClick={cancelEdit}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              className="sd-btn-gradient h-9 rounded-full px-4"
                              disabled={busy}
                              onClick={() => handleSaveEdit(service)}
                            >
                              <IconCheck size={16} />
                              Save
                            </Button>
                          </div>
                        </div>
                      </section>
                    )
                  }

                  return (
                    <section
                      key={service.id}
                      className={cn('sd-svc-panel', isExpanded && 'sd-svc-panel--open')}
                    >
                      <div className="sd-svc-panel__head">
                        <button
                          type="button"
                          className="sd-svc-panel__toggle"
                          onClick={() =>
                            setExpandedId((id) => (id === service.id ? null : service.id))
                          }
                        >
                          {isExpanded ? (
                            <IconChevronDown size={16} className="shrink-0 text-muted-foreground" />
                          ) : (
                            <IconChevronRight size={16} className="shrink-0 text-muted-foreground" />
                          )}
                          <span className="sd-svc-panel__icon" aria-hidden>
                            <IconBriefcase size={16} stroke={1.6} />
                          </span>
                          <span className="min-w-0 flex-1 text-left">
                            <span className="sd-svc-panel__title">{service.name}</span>
                            {service.description ? (
                              <span className="sd-svc-panel__desc">{service.description}</span>
                            ) : null}
                            <span className="sd-svc-panel__meta">
                              {pkgs.length} package{pkgs.length === 1 ? '' : 's'}
                              {' · '}
                              {linked.length === 0
                                ? 'No projects'
                                : `${linked.length} project${linked.length === 1 ? '' : 's'}`}
                            </span>
                          </span>
                        </button>
                        <div className="sd-svc-panel__actions">
                          <button
                            type="button"
                            className="sd-dept-row__action"
                            aria-label={`Edit ${service.name}`}
                            title="Edit"
                            disabled={busy}
                            onClick={() => startEdit(service)}
                          >
                            <IconPencil size={16} stroke={1.75} />
                          </button>
                          <button
                            type="button"
                            className="sd-dept-row__action sd-dept-row__action--delete"
                            aria-label={`Delete ${service.name}`}
                            title="Delete"
                            disabled={busy}
                            onClick={() => {
                              cancelEdit()
                              setPendingRemoveId(service.id)
                            }}
                          >
                            <IconTrash size={16} stroke={1.75} />
                          </button>
                        </div>
                      </div>

                      {!isExpanded && pkgs.length > 0 ? (
                        <div className="sd-svc-panel__preview">
                          {pkgs.map((pkg) => (
                            <span key={pkg.id} className="sd-svc-panel__tag">
                              <strong>{pkg.name}</strong>
                              {pkg.duration_hours != null ? ` · ${pkg.duration_hours}h` : ''}
                              {pkg.price != null ? ` · ${formatMoney(pkg.price)}` : ''}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      {isExpanded ? (
                        <div className="sd-svc-panel__body">
                          {pkgs.length === 0 ? (
                            <p className="text-[12px] text-muted-foreground">No packages yet.</p>
                          ) : (
                            <table className="sd-svc-pkg-table">
                              <thead>
                                <tr>
                                  <th>Package</th>
                                  <th>Duration</th>
                                  <th>Price</th>
                                  <th>Roles</th>
                                </tr>
                              </thead>
                              <tbody>
                                {pkgs.map((pkg) => (
                                  <tr key={pkg.id}>
                                    <td>
                                      <p className="sd-svc-pkg-table__name">{pkg.name}</p>
                                      {pkg.includes ? (
                                        <p className="sd-svc-pkg-table__includes">
                                          {pkg.includes}
                                        </p>
                                      ) : null}
                                    </td>
                                    <td>
                                      {pkg.duration_hours != null ? `${pkg.duration_hours}h` : '—'}
                                    </td>
                                    <td>
                                      {pkg.price != null ? formatMoney(pkg.price) : '—'}
                                    </td>
                                    <td>
                                      {Array.isArray(pkg.suggested_roles) && pkg.suggested_roles.length
                                        ? pkg.suggested_roles.join(', ')
                                        : '—'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      ) : null}
                    </section>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
