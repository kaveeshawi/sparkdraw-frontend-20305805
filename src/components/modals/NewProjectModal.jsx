import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconAlertTriangle,
  IconFolderPlus,
  IconPencil,
  IconShieldCheck,
  IconSparkles,
  IconX,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useAgencyCurrency, useFormatMoney } from '@/hooks/useAgencyCurrency'
import TeamSelect from '../team/TeamSelect'
import TeamDatePicker from '../team/TeamDatePicker'
import Avatar from '../legacy-ui/Avatar'
import { clientsApi, projectsApi, teamApi, aiApi, agencyServicesApi } from '../../services/api'

const DEFAULT_PROJECT_COLOR = '#802AEE'

const PROJECT_TYPES = [
  'UI/UX Design',
  'Web Development',
  'Branding',
  'Marketing',
  'SEO Audit',
]

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started', bg: '#F0F0F0', color: '#888' },
  { value: 'started',     label: 'Started',     bg: '#F3E8FF', color: '#802AEE' },
  { value: 'active',      label: 'Ongoing',     bg: '#EBF5FF', color: '#2E74B5' },
  { value: 'on_hold',     label: 'On Hold',     bg: '#FFF8E8', color: '#D4A017' },
  { value: 'completed',   label: 'Completed',   bg: '#EAFAF1', color: '#1A8A4A' },
]

const MOCK_TEAM = [
  { id: 1, name: 'Morgan Lee', role: 'admin' },
  { id: 2, name: 'Jordan Kim', role: 'pm' },
  { id: 3, name: 'Alex Chen',  role: 'member' },
]

const MOCK_BRIEF = {
  milestones: [
    {
      title: 'Discovery & Research',
      due_offset_days: 7,
      tasks: [{ title: 'Kickoff', priority: 'high', estimated_hours: 2 }],
    },
    {
      title: 'Wireframes & Prototyping',
      due_offset_days: 14,
      tasks: [{ title: 'Wireframes', priority: 'medium', estimated_hours: 8 }],
    },
    {
      title: 'Visual Design',
      due_offset_days: 28,
      tasks: [{ title: 'UI screens', priority: 'medium', estimated_hours: 12 }],
    },
    {
      title: 'Development',
      due_offset_days: 56,
      tasks: [{ title: 'Core build', priority: 'high', estimated_hours: 24 }],
    },
  ],
  estimated_hours: 120,
  estimated_budget: 5000,
  suggested_duration_weeks: 8,
  suggested_roles: ['Project Manager', 'Team Member'],
  suggested_phases: ['Discovery', 'Design', 'Build', 'Launch'],
  risks: ['Scope creep', 'Approval delays'],
  brief_summary: 'A structured delivery plan based on the selected service package.',
  confidence: 'medium',
  confidence_reason: 'Fallback plan — AI service unavailable.',
  scope_creep_risk: false,
  scope_creep_notes: [],
}

const EMPTY_FORM = {
  name:             '',
  client_id:        '',
  project_type:     '',
  package_id:       '',
  status:           'started',
  budget:           '',
  estimated_hours:  '',
  due_date:         '',
  description:      '',
  new_client_name:  '',
  new_client_email: '',
}

function FieldError({ message }) {
  if (!message) return null
  const text = Array.isArray(message) ? message[0] : message
  if (!text) return null
  return <p className="sd-team-form__error">{text}</p>
}

function memberMatchesRole(member, roleLabel) {
  const needle = String(roleLabel || '').trim().toLowerCase()
  if (!needle) return false

  const custom = String(member.custom_role_name || '').trim().toLowerCase()
  const title = String(member.job_title || '').trim().toLowerCase()
  const rbac = String(member.role || '').trim().toLowerCase()

  if (custom && (custom === needle || custom.includes(needle) || needle.includes(custom))) {
    return true
  }
  if (title && (title === needle || title.includes(needle) || needle.includes(title))) {
    return true
  }

  // Fallbacks for package/AI labels ↔ RBAC
  if (
    needle.includes('project manager')
    || needle === 'pm'
    || needle.includes('manager')
  ) {
    return rbac === 'pm' || rbac === 'admin'
  }
  if (needle.includes('admin') || needle.includes('agency admin')) {
    return rbac === 'admin'
  }
  if (
    needle.includes('team member')
    || needle === 'member'
    || needle.includes('designer')
    || needle.includes('developer')
    || needle.includes('engineer')
  ) {
    return rbac === 'member' || rbac === 'pm'
  }

  return rbac === needle
}

const CUSTOM_PACKAGE_ID = '__custom__'

function addWeeksIso(weeks) {
  const d = new Date()
  d.setDate(d.getDate() + Math.max(1, Number(weeks) || 4) * 7)
  return d.toISOString().slice(0, 10)
}

function findPackageByName(packages, name) {
  const needle = String(name || '').trim().toLowerCase()
  if (!needle) return null
  return packages.find((p) => String(p.name || '').trim().toLowerCase() === needle)
    || packages.find((p) => String(p.name || '').trim().toLowerCase().includes(needle))
    || null
}

function buildCustomPackageFromPlan(data, requirements) {
  const raw = data?.custom_package && typeof data.custom_package === 'object'
    ? data.custom_package
    : {}
  return {
    id: CUSTOM_PACKAGE_ID,
    name: raw.name || data?.suggested_package || 'Custom package',
    includes: raw.includes || requirements || '',
    duration_hours: raw.duration_hours ?? data?.estimated_hours ?? null,
    price: raw.price ?? data?.estimated_budget ?? null,
    suggested_roles: Array.isArray(raw.suggested_roles) && raw.suggested_roles.length
      ? raw.suggested_roles
      : (data?.suggested_roles || []),
    isCustom: true,
  }
}

/** Rough local estimate when AI is down — scales with feature count / heavy keywords. */
function estimateScopeFromIncludes(includes, previousHours, previousBudget) {
  const text = String(includes || '')
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean)
  const bullets = lines.filter((l) => /^[-•*]/.test(l))
  const features = bullets.length || Math.max(1, text.split(/[,;]/).filter((p) => p.trim()).length)
  const lower = ` ${text.toLowerCase()} `
  const heavyKws = [
    'mobile', 'ios', 'android', 'analytics', 'dashboard', 'integration',
    'sms', 'payment', 'admin', 'role management',
  ]
  let heavy = heavyKws.reduce((n, kw) => n + (lower.includes(kw) ? 1 : 0), 0)
  if (lower.includes('ai ') || lower.includes(' a.i') || lower.includes('artificial intelligence')) {
    heavy += 1
  }
  heavy = Math.min(heavy, 5)
  const floorHours = Math.max(24, features * 12 + heavy * 18)
  const prevH = previousHours ? Number(previousHours) : null
  const prevB = previousBudget != null && previousBudget !== '' ? Number(previousBudget) : null
  let hours = floorHours
  if (prevH && hours <= prevH * 1.15 && floorHours > prevH * 1.2) hours = floorHours
  hours = Math.max(hours, prevH && floorHours > prevH ? floorHours : hours)
  const rate = prevH && prevB && prevH > 0 ? Math.max(35, prevB / prevH) : 50
  const budget = Math.round(Math.max(prevB || 0, hours * rate))
  const roles = ['Project Manager', 'Team Member']
  if (hours >= 100) {
    roles.push('Designer', 'Developer')
  }
  if (hours >= 160) roles.push('QA')

  const phases = [
    { title: 'Discovery & scope lock', desc: 'Confirm requirements and acceptance criteria', weight: 0.10, offset: 7 },
    { title: 'UX / design', desc: 'Flows, wireframes, and UI for the custom scope', weight: 0.18, offset: 21 },
    { title: 'Core build', desc: 'Primary product features from the package includes', weight: 0.28, offset: 42 },
  ]
  if (/integration|sms|api|calendar|webhook|notification/.test(lower)) {
    phases.push({ title: 'Integrations', desc: 'Third-party connections, SMS, and notifications', weight: 0.14, offset: 56 })
  }
  if (/ai |analytics|dashboard|machine learning/.test(lower)) {
    phases.push({ title: 'AI & analytics', desc: 'Analytics dashboard and intelligent features', weight: 0.14, offset: 70 })
  }
  if (/mobile|ios|android|app store/.test(lower)) {
    phases.push({ title: 'Mobile delivery', desc: 'Mobile app experience and release prep', weight: 0.14, offset: 84 })
  }
  if (/admin|role|permission|auth/.test(lower)) {
    phases.push({ title: 'Admin & roles', desc: 'Admin tooling and role-based access', weight: 0.10, offset: 90 })
  }
  phases.push({ title: 'QA & launch', desc: 'Testing, fixes, and go-live', weight: 0.12, offset: 104 })

  const weightSum = phases.reduce((s, p) => s + p.weight, 0) || 1
  const milestones = phases.slice(0, 6).map((p) => {
    const bucket = Math.max(8, Math.round(hours * (p.weight / weightSum)))
    const t1 = Math.max(2, Math.round(bucket * 0.45))
    const t2 = Math.max(2, Math.round(bucket * 0.35))
    const t3 = Math.max(1, bucket - t1 - t2)
    const tasks = [
      { title: `${p.title}: setup`, priority: 'high', estimated_hours: t1 },
      { title: `${p.title}: build`, priority: 'medium', estimated_hours: t2 },
    ]
    if (t3 >= 2) {
      tasks.push({ title: `${p.title}: polish / review`, priority: 'medium', estimated_hours: t3 })
    }
    return {
      title: p.title,
      due_offset_days: p.offset,
      description: p.desc,
      tasks,
    }
  })

  return {
    hours,
    budget,
    roles: roles.slice(0, 5),
    milestones,
    weeks: Math.max(4, Math.round(hours / 20)),
    phases: milestones.map((m) => m.title).slice(0, 4),
    brief_summary:
      `Custom delivery plan covering ${features} scoped features (~${hours} hours). `
      + 'Milestones follow the updated package includes.',
  }
}

function pickAssigneesForPlan(team, roles, estimatedHours) {
  const picks = []
  const loadOf = (m) => Number(m.active_tasks || m.task_count || 0)

  ;(roles || []).forEach((role) => {
    const match = [...team]
      .filter((m) => memberMatchesRole(m, role) && !picks.includes(m.id))
      .sort((a, b) => loadOf(a) - loadOf(b))[0]
    if (match) picks.push(match.id)
  })

  const hours = Number(estimatedHours) || 0
  const target = hours >= 160 ? 5 : hours >= 100 ? 4 : hours >= 60 ? 3 : Math.max(picks.length, hours >= 40 ? 2 : 1)

  if (picks.length < target) {
    const extras = [...team]
      .filter((m) => !picks.includes(m.id))
      .filter((m) => {
        const rbac = String(m.role || '').toLowerCase()
        return rbac === 'member' || rbac === 'pm' || rbac === 'admin'
          || (roles || []).some((r) => memberMatchesRole(m, r))
      })
      .sort((a, b) => loadOf(a) - loadOf(b))
    for (const m of extras) {
      if (picks.length >= target) break
      picks.push(m.id)
    }
  }

  return picks
}

/** Local fallback when AI is down — pick package by requirement complexity vs hours. */
function pickPackageFromRequirements(packages, requirements) {
  if (!packages.length) return null
  const text = String(requirements || '').toLowerCase()
  const heavy = /\b(enterprise|complex|multi[- ]?role|auth|integration|api|design system|full|scale|platform)\b/.test(text)
  const light = /\b(simple|basic|landing|brochure|small|mvp|starter|one[- ]page|quick)\b/.test(text)
  const sorted = [...packages].sort(
    (a, b) => Number(a.duration_hours || a.price || 0) - Number(b.duration_hours || b.price || 0),
  )
  if (heavy) return sorted[sorted.length - 1]
  if (light) return sorted[0]
  return sorted[Math.floor((sorted.length - 1) / 2)] || sorted[0]
}

export default function NewProjectModal({ open, onClose, onCreated }) {
  const currency = useAgencyCurrency()
  const formatMoney = useFormatMoney()
  const navigate = useNavigate()

  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [assignees, setAssignees] = useState([])
  const [suggestedPlan, setSuggestedPlan] = useState(null)
  const [acceptedPlan, setAcceptedPlan] = useState(null)

  const [clients, setClients] = useState([])
  const [projectTypes, setProjectTypes] = useState(PROJECT_TYPES)
  const [services, setServices] = useState([])
  const [team, setTeam] = useState(MOCK_TEAM)

  const [generating, setGenerating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [customPackage, setCustomPackage] = useState(null)
  const [packageEdit, setPackageEdit] = useState({ name: '', includes: '' })
  const [editingPackage, setEditingPackage] = useState(false)
  const [editingPlan, setEditingPlan] = useState(false)
  const [packageLocked, setPackageLocked] = useState(false)

  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY_FORM })
      setAssignees([])
      setSuggestedPlan(null)
      setAcceptedPlan(null)
      setCustomPackage(null)
      setPackageEdit({ name: '', includes: '' })
      setEditingPackage(false)
      setEditingPlan(false)
      setPackageLocked(false)
      setErrors({})
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    clientsApi.index()
      .then((res) => setClients(res.data.data || []))
      .catch(() => {})
  }, [open])

  useEffect(() => {
    if (!open) return
    agencyServicesApi.index()
      .then((res) => {
        const rows = res.data.data || []
        setServices(rows)
        const names = rows.map((s) => s.name).filter(Boolean)
        if (names.length > 0) setProjectTypes(names)
      })
      .catch(() => setProjectTypes(PROJECT_TYPES))
  }, [open])

  useEffect(() => {
    if (!open) return
    teamApi.index()
      .then((res) => setTeam(res.data.data || MOCK_TEAM))
      .catch(() => setTeam(MOCK_TEAM))
  }, [open])

  const selectedService = useMemo(() => {
    const needle = String(form.project_type || '').trim().toLowerCase()
    if (!needle) return null
    return services.find((s) => String(s.name || '').trim().toLowerCase() === needle) || null
  }, [form.project_type, services])

  const packageOptions = useMemo(() => {
    const pkgs = Array.isArray(selectedService?.packages) ? selectedService.packages : []
    const opts = pkgs.map((p) => ({
      value: String(p.id),
      label: p.name,
    }))
    if (customPackage) {
      opts.unshift({
        value: CUSTOM_PACKAGE_ID,
        label: `Custom · ${customPackage.name}`,
      })
    }
    return opts
  }, [selectedService, customPackage])

  const selectedPackage = useMemo(() => {
    if (form.package_id === CUSTOM_PACKAGE_ID && customPackage) return customPackage
    if (!selectedService || !form.package_id) return null
    const pkgs = Array.isArray(selectedService.packages) ? selectedService.packages : []
    return pkgs.find((p) => String(p.id) === String(form.package_id)) || null
  }, [selectedService, form.package_id, customPackage])

  useEffect(() => {
    if (!selectedPackage) {
      setPackageEdit({ name: '', includes: '' })
      return
    }
    setPackageEdit({
      name: selectedPackage.name || '',
      includes: selectedPackage.includes || '',
    })
  }, [selectedPackage?.id, selectedPackage?.name, selectedPackage?.includes])

  const suggestedRoles = suggestedPlan?.suggested_roles
    || acceptedPlan?.suggested_roles
    || selectedPackage?.suggested_roles
    || []

  const capacityWarnings = useMemo(() => {
    if (!suggestedRoles.length) return []
    return team
      .filter((m) => suggestedRoles.some((r) => memberMatchesRole(m, r)))
      .filter((m) => Number(m.active_tasks || m.task_count || 0) >= 7)
      .map((m) => `${m.name} already has ${m.active_tasks || m.task_count} active tasks`)
  }, [team, suggestedRoles])

  const setField = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const setInputField = (key) => (e) => setField(key)(e.target.value)

  const promotePackageEdits = (nextName, nextIncludes) => {
    const name = nextName ?? packageEdit.name
    const includes = nextIncludes ?? packageEdit.includes
    const nextCustom = {
      id: CUSTOM_PACKAGE_ID,
      name: name.trim() || 'Custom package',
      includes,
      duration_hours: form.estimated_hours !== '' ? Number(form.estimated_hours) : (selectedPackage?.duration_hours ?? null),
      price: form.budget !== '' ? Number(form.budget) : (selectedPackage?.price ?? null),
      suggested_roles: selectedPackage?.suggested_roles || suggestedRoles || [],
      isCustom: true,
    }
    setCustomPackage(nextCustom)
    setPackageLocked(true)
    setForm((f) => ({ ...f, package_id: CUSTOM_PACKAGE_ID }))
  }

  const handlePackageNameEdit = (value) => {
    setPackageEdit((prev) => ({ ...prev, name: value }))
    promotePackageEdits(value, packageEdit.includes)
  }

  const handlePackageIncludesEdit = (value) => {
    setPackageEdit((prev) => ({ ...prev, includes: value }))
    promotePackageEdits(packageEdit.name, value)
  }

  const applyPackageDefaults = (pkg) => {
    if (!pkg) return
    setForm((f) => ({
      ...f,
      package_id: String(pkg.id),
      estimated_hours: pkg.duration_hours != null ? String(pkg.duration_hours) : f.estimated_hours,
      budget: pkg.price != null ? String(pkg.price) : f.budget,
    }))
    setPackageEdit({
      name: pkg.name || '',
      includes: pkg.includes || '',
    })
  }

  const handleTypeChange = (value) => {
    setSuggestedPlan(null)
    setAcceptedPlan(null)
    setCustomPackage(null)
    setPackageLocked(false)
    setForm((f) => ({
      ...f,
      project_type: value,
      package_id: '',
      estimated_hours: '',
      budget: '',
    }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next.project_type
      delete next.package_id
      return next
    })
  }

  const handlePackageChange = (value) => {
    setSuggestedPlan(null)
    setAcceptedPlan(null)
    if (value === CUSTOM_PACKAGE_ID && customPackage) {
      setPackageLocked(true)
      applyPackageDefaults(customPackage)
      setErrors((prev) => {
        const next = { ...prev }
        delete next.package_id
        return next
      })
      return
    }
    setCustomPackage(null)
    setPackageLocked(false)
    const pkgs = Array.isArray(selectedService?.packages) ? selectedService.packages : []
    const pkg = pkgs.find((p) => String(p.id) === String(value))
    applyPackageDefaults(pkg || { id: value })
    setErrors((prev) => {
      const next = { ...prev }
      delete next.package_id
      return next
    })
  }

  const applyGeneratedPlan = (data, pkgs, { lockCustom = false } = {}) => {
    const forceCustom = lockCustom || data.package_match === 'custom' || data.custom_package
    let matched = null
    let custom = null

    if (forceCustom) {
      custom = buildCustomPackageFromPlan(data, form.description)
      // Prefer user's edited name/includes if AI returned empty/weaker ones
      if (lockCustom) {
        custom = {
          ...custom,
          name: packageEdit.name.trim() || custom.name,
          includes: (data.custom_package?.includes || packageEdit.includes || custom.includes || '').trim(),
        }
      }
      setCustomPackage(custom)
      setPackageLocked(true)
      matched = custom
    } else {
      setCustomPackage(null)
      setPackageLocked(false)
      matched = findPackageByName(pkgs, data.suggested_package || data.package_name)
        || (form.package_id && form.package_id !== CUSTOM_PACKAGE_ID
          ? pkgs.find((p) => String(p.id) === String(form.package_id))
          : null)
        || pickPackageFromRequirements(pkgs, form.description)
    }

    setSuggestedPlan({
      ...data,
      suggested_package: matched?.name || data.suggested_package || null,
      package_match: forceCustom ? 'custom' : 'existing',
    })
    setAcceptedPlan(null)

    setForm((f) => ({
      ...f,
      package_id: matched ? String(matched.id) : f.package_id,
      estimated_hours: data.estimated_hours != null
        ? String(data.estimated_hours)
        : (matched?.duration_hours != null ? String(matched.duration_hours) : f.estimated_hours),
      budget: data.estimated_budget != null
        ? String(data.estimated_budget)
        : (matched?.price != null ? String(matched.price) : f.budget),
      due_date: f.due_date || (data.suggested_duration_weeks
        ? addWeeksIso(data.suggested_duration_weeks)
        : f.due_date),
    }))

    const roles = data.suggested_roles?.length
      ? data.suggested_roles
      : (matched?.suggested_roles || [])
    const hoursForStaffing = data.estimated_hours != null
      ? Number(data.estimated_hours)
      : (matched?.duration_hours != null ? Number(matched.duration_hours) : 0)
    const picks = pickAssigneesForPlan(team, roles, hoursForStaffing)
    if (picks.length) setAssignees(picks)
  }

  const toggleAssignee = (id) =>
    setAssignees((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const handleGenerate = async () => {
    const local = {}
    if (!form.name.trim()) local.name = 'Project name is required'
    if (!form.project_type) local.project_type = 'Service is required'
    if (!form.description.trim()) local.description = 'Requirements are required for AI brief'
    if (Object.keys(local).length) {
      setErrors(local)
      return
    }

    const pkgs = Array.isArray(selectedService?.packages) ? selectedService.packages : []

    setGenerating(true)
    setEditingPackage(false)
    setEditingPlan(false)
    setAcceptedPlan(null)
    setSuggestedPlan(null)
    try {
      const durationWeeks = form.due_date
        ? Math.max(1, Math.round((new Date(form.due_date) - new Date()) / (7 * 86400000)))
        : 4

      const catalogPkg = form.package_id && form.package_id !== CUSTOM_PACKAGE_ID
        ? pkgs.find((p) => String(p.id) === String(form.package_id))
        : null

      const editedName = packageEdit.name.trim()
      const editedIncludes = packageEdit.includes.trim()
      const lockCustom = packageLocked
        || form.package_id === CUSTOM_PACKAGE_ID
        || Boolean(customPackage)

      const res = await aiApi.generateBrief({
        project_name: form.name,
        project_type: form.project_type,
        service_description: selectedService?.description || '',
        requirements: form.description,
        budget: form.budget ? Number(form.budget) : 0,
        duration_weeks: durationWeeks,
        lock_custom_package: lockCustom,
        available_packages: lockCustom
          ? []
          : pkgs.map((p) => ({
            name: p.name,
            includes: p.includes || '',
            duration_hours: p.duration_hours ?? null,
            price: p.price ?? null,
            suggested_roles: Array.isArray(p.suggested_roles) ? p.suggested_roles : [],
          })),
        package_name: lockCustom
          ? (editedName || customPackage?.name || '')
          : (catalogPkg?.name || editedName || ''),
        includes: lockCustom
          ? (editedIncludes || customPackage?.includes || '')
          : (catalogPkg?.includes || editedIncludes || ''),
        default_hours: form.estimated_hours
          ? Number(form.estimated_hours)
          : (catalogPkg?.duration_hours ?? customPackage?.duration_hours ?? undefined),
        default_budget: form.budget
          ? Number(form.budget)
          : (catalogPkg?.price ?? customPackage?.price ?? undefined),
        suggested_roles: catalogPkg?.suggested_roles || customPackage?.suggested_roles || [],
      })
      const data = res.data.data || MOCK_BRIEF
      applyGeneratedPlan(data, pkgs, { lockCustom })
    } catch (err) {
      if (err.response?.status === 404 || err.response?.status === 503) {
        const lockCustom = packageLocked || form.package_id === CUSTOM_PACKAGE_ID || Boolean(customPackage)
        if (lockCustom) {
          const scope = estimateScopeFromIncludes(
            packageEdit.includes || customPackage?.includes || form.description,
            form.estimated_hours,
            form.budget,
          )
          applyGeneratedPlan(
            {
              ...MOCK_BRIEF,
              package_match: 'custom',
              suggested_package: packageEdit.name || customPackage?.name || 'Custom package',
              custom_package: {
                name: packageEdit.name || customPackage?.name || 'Custom package',
                includes: packageEdit.includes || customPackage?.includes || form.description,
                duration_hours: scope.hours,
                price: scope.budget,
                suggested_roles: scope.roles,
              },
              estimated_hours: scope.hours,
              estimated_budget: scope.budget,
              suggested_roles: scope.roles,
              milestones: scope.milestones,
              suggested_phases: scope.phases,
              suggested_duration_weeks: scope.weeks,
              brief_summary: scope.brief_summary,
              package_match_reason: 'Kept your custom package and rebuilt the plan from includes (AI unavailable).',
            },
            pkgs,
            { lockCustom: true },
          )
        } else {
          const fallbackPkg = pickPackageFromRequirements(pkgs, form.description)
          if (fallbackPkg) {
            applyGeneratedPlan(
              {
                ...MOCK_BRIEF,
                package_match: 'existing',
                suggested_package: fallbackPkg.name,
                estimated_hours: fallbackPkg.duration_hours ?? MOCK_BRIEF.estimated_hours,
                estimated_budget: fallbackPkg.price ?? MOCK_BRIEF.estimated_budget,
                suggested_roles: fallbackPkg.suggested_roles || MOCK_BRIEF.suggested_roles,
                package_match_reason: 'AI unavailable — closest catalog package used.',
              },
              pkgs,
            )
          } else {
            applyGeneratedPlan(
              {
                ...MOCK_BRIEF,
                package_match: 'custom',
                suggested_package: 'Custom package',
                custom_package: {
                  name: 'Custom package',
                  includes: form.description,
                  duration_hours: MOCK_BRIEF.estimated_hours,
                  price: MOCK_BRIEF.estimated_budget,
                  suggested_roles: MOCK_BRIEF.suggested_roles,
                },
                package_match_reason: 'AI unavailable — created a custom package from requirements.',
              },
              pkgs,
              { lockCustom: true },
            )
          }
        }
      } else {
        setErrors({ description: err.response?.data?.message || 'Could not generate brief' })
      }
    } finally {
      setGenerating(false)
    }
  }

  const handleAcceptPlan = () => {
    if (!suggestedPlan) return
    setAcceptedPlan(suggestedPlan)
    setSuggestedPlan(null)
    setEditingPlan(false)
  }

  const updateActivePlan = (patch) => {
    if (suggestedPlan) {
      setSuggestedPlan((prev) => ({ ...prev, ...patch }))
      return
    }
    if (acceptedPlan) {
      setAcceptedPlan((prev) => ({ ...prev, ...patch }))
    }
  }

  const updatePlanMilestone = (index, field, value) => {
    const source = suggestedPlan || acceptedPlan
    if (!source) return
    const milestones = [...(source.milestones || [])]
    milestones[index] = { ...milestones[index], [field]: value }
    updateActivePlan({ milestones })
  }

  const updatePlanTaskTitle = (mIndex, tIndex, value) => {
    const source = suggestedPlan || acceptedPlan
    if (!source) return
    const milestones = [...(source.milestones || [])]
    const tasks = [...(milestones[mIndex]?.tasks || [])]
    tasks[tIndex] = { ...tasks[tIndex], title: value }
    milestones[mIndex] = { ...milestones[mIndex], tasks }
    updateActivePlan({ milestones })
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Project name is required'
    if (form.client_id === '__new__') {
      if (!form.new_client_name.trim()) e.new_client_name = 'Client name is required'
      if (!form.new_client_email.trim()) {
        e.new_client_email = 'Contact email is required'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.new_client_email.trim())) {
        e.new_client_email = 'Enter a valid email'
      }
    } else if (!form.client_id) {
      e.client_id = 'Client is required'
    }
    if (!form.project_type) e.project_type = 'Service is required'
    if (packageOptions.length > 0 && !form.package_id) {
      e.package_id = 'Pick a package or generate one with AI'
    }
    if (!form.due_date) e.due_date = 'Due date is required'
    return e
  }

  const handleClose = (nextOpen) => {
    if (!nextOpen) onClose?.()
  }

  const handleClientChange = (value) => {
    setForm((f) => ({
      ...f,
      client_id: value,
      ...(value !== '__new__' ? { new_client_name: '', new_client_email: '' } : {}),
    }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next.client_id
      delete next.new_client_name
      delete next.new_client_email
      return next
    })
  }

  const handleSubmit = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSubmitting(true)
    try {
      let clientId = form.client_id
      if (clientId === '__new__') {
        const company = form.new_client_name.trim()
        const created = await clientsApi.store({
          company_name: company,
          contact_name: company,
          contact_email: form.new_client_email.trim(),
          send_email: false,
        })
        const newClient = created.data?.data
        clientId = String(newClient.id)
        setClients((prev) => {
          if (prev.some((c) => String(c.id) === clientId)) return prev
          return [...prev, newClient]
        })
        setForm((f) => ({ ...f, client_id: clientId }))
      }

      const plan = acceptedPlan
      const milestonePayload = (plan?.milestones || []).map((m) => ({
        title: m.title,
        due_offset_days: m.due_offset_days,
        description: m.description || null,
        tasks: (m.tasks || []).map((t) => ({
          title: t.title,
          priority: t.priority || 'medium',
          estimated_hours: t.estimated_hours ?? null,
        })),
      }))

      const res = await projectsApi.store({
        name: form.name,
        client_id: clientId,
        type: form.project_type,
        status: form.status,
        budget: form.budget || null,
        estimated_hours: form.estimated_hours ? Number(form.estimated_hours) : null,
        end_date: form.due_date,
        description: form.description || null,
        color: DEFAULT_PROJECT_COLOR,
        team_member_ids: assignees,
        ...(acceptedPlan && milestonePayload.length ? { milestones: milestonePayload } : {}),
      })
      const newProject = res.data.data
      onCreated?.()
      onClose?.()
      navigate(`/projects/${newProject.id}/kanban`)
    } catch (err) {
      const apiErrors = err.response?.data?.errors || {}
      const mapped = { ...apiErrors }
      if (apiErrors.company_name) mapped.new_client_name = apiErrors.company_name[0] || apiErrors.company_name
      if (apiErrors.contact_email) mapped.new_client_email = apiErrors.contact_email[0] || apiErrors.contact_email
      if (apiErrors.end_date) mapped.due_date = apiErrors.end_date[0] || apiErrors.end_date
      setErrors(mapped)
    } finally {
      setSubmitting(false)
    }
  }

  const clientOptions = [
    ...clients.map((c) => ({ value: String(c.id), label: c.company_name })),
    { value: '__new__', label: '+ Add new client' },
  ]
  const typeOptions = projectTypes.map((t) => ({ value: t, label: t }))
  const planPreview = suggestedPlan || acceptedPlan
  const planRisks = useMemo(() => {
    const plan = suggestedPlan || acceptedPlan
    const risks = Array.isArray(plan?.risks) ? [...plan.risks] : []
    const notes = Array.isArray(plan?.scope_creep_notes) ? plan.scope_creep_notes : []
    notes.forEach((n) => {
      const text = String(n || '').trim()
      if (text && !risks.includes(text)) risks.push(text)
    })
    return risks
  }, [suggestedPlan, acceptedPlan])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sd-team-form-dialog sm:max-w-5xl border-0">
        <DialogHeader className="sd-team-form-dialog__header">
          <DialogTitle>Create new project</DialogTitle>
          <DialogDescription>
            Describe requirements, then let AI pick the best package and plan — or choose package, budget, and hours yourself.
          </DialogDescription>
        </DialogHeader>

        <div className="sd-team-form">
          <div className="sd-team-form__row">
            <div className="sd-team-form__field">
              <Label htmlFor="np-name">Project name</Label>
              <Input
                id="np-name"
                className="sd-team-field"
                placeholder="e.g. NovaTech Brand Refresh"
                value={form.name}
                onChange={setInputField('name')}
              />
              <FieldError message={errors.name} />
            </div>
          </div>

          <div className="sd-team-form__row sd-team-form__row--2">
            <div className="sd-team-form__field">
              <Label htmlFor="np-client">Client</Label>
              <TeamSelect
                id="np-client"
                value={form.client_id}
                onValueChange={handleClientChange}
                options={clientOptions}
                placeholder="Select client"
              />
              <FieldError message={errors.client_id} />
              {form.client_id === '__new__' ? (
                <div className="mt-2 flex flex-col gap-2">
                  <Input
                    className="sd-team-field"
                    placeholder="Client / company name"
                    value={form.new_client_name}
                    onChange={setInputField('new_client_name')}
                    autoFocus
                  />
                  <FieldError message={errors.new_client_name} />
                  <Input
                    type="email"
                    className="sd-team-field"
                    placeholder="Contact email"
                    value={form.new_client_email}
                    onChange={setInputField('new_client_email')}
                  />
                  <FieldError message={errors.new_client_email} />
                </div>
              ) : null}
            </div>
            <div className="sd-team-form__field">
              <Label htmlFor="np-type">Service</Label>
              <TeamSelect
                id="np-type"
                value={form.project_type}
                onValueChange={handleTypeChange}
                options={typeOptions}
                placeholder="Select service"
              />
              <FieldError message={errors.project_type} />
            </div>
          </div>

          <div className="sd-team-form__row">
            <div className="sd-team-form__field">
              <Label htmlFor="np-description">Requirements</Label>
              <Textarea
                id="np-description"
                className="sd-team-field sd-team-field--textarea"
                placeholder="Describe goals, scope, must-haves, and constraints — AI uses this to pick a package and plan the project"
                value={form.description}
                onChange={setInputField('description')}
              />
              <FieldError message={errors.description} />
            </div>
          </div>

          <div className="sd-team-form__row">
            <div className="sd-team-form__field">
              <Label htmlFor="np-due">Due date</Label>
              <TeamDatePicker
                id="np-due"
                value={form.due_date}
                onValueChange={setField('due_date')}
                placeholder="Select due date"
              />
              <FieldError message={errors.due_date} />
            </div>
          </div>

          <div className="sd-np-ai-box">
            <div className="sd-np-ai-box__head">
              <div className="flex items-start gap-2.5 min-w-0">
                <IconSparkles size={16} className="mt-0.5 shrink-0 text-[#ea580c]" />
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[#9a3412]">AI project planner</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-[#9a3412]/80">
                    {packageLocked || form.package_id === CUSTOM_PACKAGE_ID
                      ? 'Your custom package is locked — regenerate will enhance it and rebuild the plan (won’t switch to a catalog package).'
                      : 'Matches a catalog package when it fits, or builds a custom one — edit with the pencil, then regenerate.'}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                className="sd-btn-gradient h-8 shrink-0 rounded-full px-3.5 text-[11px]"
                onClick={handleGenerate}
                disabled={
                  generating
                  || !form.name
                  || !form.project_type
                  || !form.description.trim()
                }
              >
                {generating
                  ? 'Generating…'
                  : planPreview
                    ? 'Regenerate ✦'
                    : 'Generate ✦'}
              </Button>
            </div>

            <div className="sd-np-ai-box__body">
              <div className="sd-team-form__row">
                <div className="sd-team-form__field">
                  <Label htmlFor="np-package">Package</Label>
                  <TeamSelect
                    id="np-package"
                    value={form.package_id}
                    onValueChange={handlePackageChange}
                    options={packageOptions}
                    placeholder={
                      !form.project_type
                        ? 'Select a service first'
                        : 'Generate or choose a package'
                    }
                    disabled={!form.project_type}
                  />
                  <FieldError message={errors.package_id} />

                  {form.package_id || packageEdit.name || packageEdit.includes ? (
                    <div className="mt-2 rounded-xl border border-[#fdba74]/60 bg-white/80 px-3 py-2.5">
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <p className="text-[11px] font-medium text-muted-foreground">
                          {editingPackage ? 'Editing package' : 'Package details'}
                        </p>
                        <button
                          type="button"
                          className="inline-flex size-7 items-center justify-center rounded-full text-[#ea580c] hover:bg-[#fff7ed]"
                          title={editingPackage ? 'Done editing' : 'Edit package'}
                          aria-label={editingPackage ? 'Done editing package' : 'Edit package'}
                          onClick={() => setEditingPackage((v) => !v)}
                        >
                          {editingPackage ? <IconX size={14} stroke={1.75} /> : <IconPencil size={14} stroke={1.75} />}
                        </button>
                      </div>

                      {editingPackage ? (
                        <div className="space-y-2">
                          <div>
                            <label
                              className="mb-1 block text-[11px] font-medium text-muted-foreground"
                              htmlFor="np-pkg-name"
                            >
                              Package name
                            </label>
                            <Input
                              id="np-pkg-name"
                              className="sd-team-field h-9 text-[13px]"
                              value={packageEdit.name}
                              placeholder="e.g. Internal Booking Portal"
                              onChange={(e) => handlePackageNameEdit(e.target.value)}
                            />
                          </div>
                          <div>
                            <label
                              className="mb-1 block text-[11px] font-medium text-muted-foreground"
                              htmlFor="np-pkg-includes"
                            >
                              Includes
                            </label>
                            <Textarea
                              id="np-pkg-includes"
                              className="sd-team-field sd-team-field--textarea min-h-[7rem] text-[12px]"
                              value={packageEdit.includes}
                              placeholder="What this package includes"
                              onChange={(e) => handlePackageIncludesEdit(e.target.value)}
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            Save your edits, then Regenerate to rebuild the plan from these includes.
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-[13px] font-medium text-foreground">
                            {packageEdit.name || selectedPackage?.name}
                          </p>
                          {packageEdit.includes ? (
                            <p className="mt-1 whitespace-pre-line text-[12px] text-muted-foreground">
                              {packageEdit.includes}
                            </p>
                          ) : null}
                          {planPreview?.package_match_reason ? (
                            <p className="mt-1.5 text-[11px] text-[#9a3412]/85">
                              {planPreview.package_match_reason}
                            </p>
                          ) : null}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="mt-1.5 text-[11px] text-[#9a3412]/75">
                      Generate a package from requirements, or pick one manually.
                    </p>
                  )}
                </div>
              </div>

              <div className="sd-team-form__row sd-team-form__row--2">
                <div className="sd-team-form__field">
                  <Label htmlFor="np-budget">Budget ({currency})</Label>
                  <Input
                    id="np-budget"
                    className="sd-team-field"
                    placeholder="e.g. 5,000"
                    value={form.budget}
                    onChange={setInputField('budget')}
                  />
                </div>
                <div className="sd-team-form__field">
                  <Label htmlFor="np-hours">Estimated hours</Label>
                  <Input
                    id="np-hours"
                    type="number"
                    min="0"
                    className="sd-team-field"
                    placeholder="e.g. 80"
                    value={form.estimated_hours}
                    onChange={setInputField('estimated_hours')}
                  />
                </div>
              </div>

              <div className="sd-team-form__row">
                <div className="sd-team-form__field">
                  <div className="sd-team-form__label-row">
                    <Label>Assign team members</Label>
                    {assignees.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {assignees.length} selected
                      </span>
                    )}
                  </div>
                  {suggestedRoles.length > 0 ? (
                    <p className="mb-2 text-[11px] text-muted-foreground">
                      Suggested roles: {suggestedRoles.join(', ')}
                    </p>
                  ) : null}
                  {capacityWarnings.length > 0 ? (
                    <div className="mb-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                      <IconAlertTriangle size={14} className="mt-0.5 shrink-0" />
                      <div>
                        {capacityWarnings.map((w) => (
                          <div key={w}>{w}</div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2">
                    {team.map((member) => {
                      const selected = assignees.includes(member.id)
                      const suggested = suggestedRoles.some((r) => memberMatchesRole(member, r))
                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => toggleAssignee(member.id)}
                          title={`${member.name}${suggested ? ' · suggested role' : ''}`}
                          className={cn(
                            'rounded-full p-0 outline outline-2 outline-offset-2 transition-opacity',
                            selected ? 'outline-primary' : suggested ? 'outline-amber-400/80' : 'outline-transparent',
                            assignees.length > 0 && !selected && !suggested && 'opacity-45',
                          )}
                        >
                          <Avatar name={member.name} role={member.role} size="sm" />
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {planPreview ? (
                <div className="rounded-xl border border-[#fdba74]/70 bg-white/70 px-3.5 py-3">
                  <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium text-[#ea580c]">
                          {acceptedPlan && !suggestedPlan ? '✓ Plan accepted' : '✦ AI project plan'}
                        </span>
                        <button
                          type="button"
                          className="inline-flex size-6 items-center justify-center rounded-full text-[#ea580c] hover:bg-[#fff7ed]"
                          title={editingPlan ? 'Done editing' : 'Edit plan'}
                          aria-label={editingPlan ? 'Done editing plan' : 'Edit plan'}
                          onClick={() => setEditingPlan((v) => !v)}
                        >
                          {editingPlan ? <IconX size={13} stroke={1.75} /> : <IconPencil size={13} stroke={1.75} />}
                        </button>
                      </div>
                      {planPreview.suggested_package ? (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          Package:{' '}
                          <span className="font-medium text-foreground">
                            {planPreview.package_match === 'custom' ? 'Custom · ' : ''}
                            {planPreview.suggested_package}
                          </span>
                        </p>
                      ) : null}
                      {planPreview.confidence ? (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          Confidence: {planPreview.confidence}
                          {planPreview.confidence_reason ? ` — ${planPreview.confidence_reason}` : ''}
                        </p>
                      ) : null}
                    </div>
                    {suggestedPlan ? (
                      <Button
                        type="button"
                        size="sm"
                        className="sd-btn-gradient h-6 rounded-full px-2.5 text-[10px]"
                        onClick={handleAcceptPlan}
                      >
                        Accept plan
                      </Button>
                    ) : null}
                  </div>

                  {editingPlan ? (
                    <div className="mb-2 space-y-2">
                      <label className="block text-[11px] font-medium text-muted-foreground" htmlFor="np-plan-summary">
                        Brief summary
                      </label>
                      <Textarea
                        id="np-plan-summary"
                        className="sd-team-field sd-team-field--textarea min-h-[4rem] text-[12px]"
                        value={planPreview.brief_summary || ''}
                        onChange={(e) => updateActivePlan({ brief_summary: e.target.value })}
                      />
                    </div>
                  ) : planPreview.brief_summary ? (
                    <p className="mb-2 text-[12px] leading-relaxed text-foreground/90">
                      {planPreview.brief_summary}
                    </p>
                  ) : null}

                  {(planPreview.milestones || []).map((m, i) => (
                    <div key={`ms-${i}`} className="border-t border-border/60 py-1.5 first:border-t-0">
                      {editingPlan ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[#fff7ed] text-[10px] font-medium text-[#ea580c]">
                              {i + 1}
                            </span>
                            <Input
                              className="sd-team-field h-8 text-[12px]"
                              value={m.title || ''}
                              onChange={(e) => updatePlanMilestone(i, 'title', e.target.value)}
                            />
                          </div>
                          {(m.tasks || []).map((t, ti) => (
                            <Input
                              key={`task-${i}-${ti}`}
                              className="sd-team-field ml-6 h-8 text-[11px]"
                              value={t.title || ''}
                              onChange={(e) => updatePlanTaskTitle(i, ti, e.target.value)}
                            />
                          ))}
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                            <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[#fff7ed] text-[10px] font-medium text-[#ea580c]">
                              {i + 1}
                            </span>
                            <span className="flex-1 font-medium text-foreground">{m.title}</span>
                            {typeof m.due_offset_days === 'number' && (
                              <span className="text-[11px]">
                                Week {Math.max(1, Math.round(m.due_offset_days / 7))}
                              </span>
                            )}
                          </div>
                          {(m.tasks || []).length > 0 ? (
                            <ul className="ml-6 mt-1 space-y-0.5 text-[11px] text-muted-foreground">
                              {m.tasks.map((t, ti) => (
                                <li key={`${t.title}-${ti}`}>
                                  · {t.title}
                                  {t.estimated_hours ? ` (${t.estimated_hours}h)` : ''}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </>
                      )}
                    </div>
                  ))}

                  {(planPreview.suggested_phases || []).length > 0 ? (
                    <div className="mt-2 text-[11px] text-muted-foreground">
                      <span className="font-medium text-foreground">Phases: </span>
                      {planPreview.suggested_phases.join(' → ')}
                    </div>
                  ) : null}

                  {editingPlan ? (
                    <div className="mt-2 space-y-1">
                      <label className="block text-[11px] font-medium text-muted-foreground" htmlFor="np-plan-risks">
                        Risks
                      </label>
                      <Textarea
                        id="np-plan-risks"
                        className="sd-team-field sd-team-field--textarea min-h-[3.5rem] text-[11px]"
                        value={planRisks.join('\n')}
                        placeholder="One risk per line"
                        onChange={(e) => {
                          const lines = e.target.value
                            .split('\n')
                            .map((l) => l.trim())
                            .filter(Boolean)
                          updateActivePlan({ risks: lines, scope_creep_notes: [], scope_creep_risk: false })
                        }}
                      />
                    </div>
                  ) : planRisks.length > 0 ? (
                    <div className="mt-1 text-[11px] text-amber-700">
                      <span className="font-medium">Risks: </span>
                      {planRisks.join(' · ')}
                    </div>
                  ) : null}

                  {planPreview.suggested_duration_weeks ? (
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      Suggested duration: ~{planPreview.suggested_duration_weeks} weeks
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <div className="sd-team-form__row">
            <div className="sd-team-form__field">
              <Label>Status</Label>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {STATUS_OPTIONS.map((opt) => {
                  const active = form.status === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setField('status')(opt.value)}
                      className="rounded-full px-3 py-1.5 text-[12px] font-medium transition-[box-shadow,transform] active:scale-[0.97]"
                      style={{
                        background: opt.bg,
                        color: opt.color,
                        boxShadow: active ? `0 0 0 2px ${opt.color}` : '0 0 0 1px transparent',
                      }}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="sd-team-form-dialog__footer gap-2 sm:gap-2 sm:justify-between">
          <div className="hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:flex">
            <IconShieldCheck size={13} className="text-emerald-600" />
            Isolated to your agency workspace
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-full px-5"
              onClick={() => handleClose(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="sd-btn-gradient h-10 rounded-full px-6"
              onClick={handleSubmit}
              disabled={submitting}
            >
              <IconFolderPlus size={16} />
              {submitting ? 'Creating…' : 'Create project'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
