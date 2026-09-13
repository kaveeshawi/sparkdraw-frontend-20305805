import { getAgencyId } from '@/lib/media'

const STORAGE_PREFIX = 'sparkdraw.documentTemplates'
const CUSTOM_PREFIX = 'sparkdraw.customDocumentTemplates'
const SETTINGS_PREFIX = 'sparkdraw.templateSettings'
export const TEMPLATE_EVENT = 'sparkdraw:document-templates'

/** Built-in document template catalog (invoice-app style layouts). */
export const TEMPLATE_CATEGORIES = [
  {
    id: 'payslip',
    label: 'Payslips',
    desc: 'Employee pay stubs used in Team Portal payroll',
    accent: '#1a4d4e',
    templates: [
      { id: 'payslip-classic', name: 'Corporate Pay Stub', desc: 'Exact teal landscape stub — earnings, deductions & net summary', variant: 'classic', layout: 'payslip-classic', topPick: true },
      { id: 'payslip-modern', name: 'Modern Split', desc: 'Bold header band with chip meta row', variant: 'modern', layout: 'payslip-modern', topPick: false },
      { id: 'payslip-minimal', name: 'Minimal Clean', desc: 'Light borders and compact stacked tables', variant: 'minimal', layout: 'payslip-minimal', topPick: false },
    ],
  },
  {
    id: 'letterhead',
    label: 'Letterheads',
    desc: 'Official agency stationery for letters and notices',
    accent: '#c62828',
    templates: [
      { id: 'letterhead-corporate', name: 'Sparkdraw Corporate', desc: 'Red accent bars with logo, contact block and footer — no letter body', layout: 'letter-corporate', topPick: true },
      { id: 'letterhead-corporate-teal', name: 'Corporate Teal', desc: 'Same layout with teal accent for softer branding', layout: 'letter-corporate-teal', topPick: true },
      { id: 'letterhead-corporate-ink', name: 'Corporate Ink', desc: 'Same layout with deep navy accent', layout: 'letter-corporate-ink', topPick: true },
    ],
  },
  {
    id: 'contract',
    label: 'Contracts',
    desc: 'Employment and service agreement layouts',
    accent: '#9a3412',
    templates: [
      { id: 'contract-standard', name: 'Standard Agreement', desc: 'Classic multi-clause employment contract', layout: 'contract-standard', topPick: true },
      { id: 'contract-freelancer', name: 'Freelancer SOW', desc: 'Scope of work style contractor agreement', layout: 'contract-sow', topPick: true },
      { id: 'contract-nda', name: 'NDA Compact', desc: 'Short confidentiality agreement layout', layout: 'contract-nda', topPick: true },
    ],
  },
  {
    id: 'invoice',
    label: 'Invoices',
    desc: 'Client billing layouts for printable invoices',
    accent: '#0023D7',
    templates: [
      { id: 'invoice-classic', name: 'Classic Invoice', desc: 'Bill-to block with line items table', layout: 'invoice-classic', topPick: true },
      { id: 'invoice-compact', name: 'Compact Invoice', desc: 'Dense single-column short invoice', layout: 'invoice-compact', topPick: true },
      { id: 'invoice-detailed', name: 'Detailed Invoice', desc: 'Tax, notes, and payment terms sections', layout: 'invoice-detailed', topPick: true },
    ],
  },
  {
    id: 'certificate',
    label: 'Certificates',
    desc: 'Completion and recognition certificates',
    accent: '#b45309',
    templates: [
      { id: 'cert-achievement', name: 'Achievement', desc: 'Ornate border with centered title and seal', layout: 'cert-ornate', topPick: true },
      { id: 'cert-completion', name: 'Course Completion', desc: 'Clean certificate layout', layout: 'cert-clean', topPick: true },
      { id: 'cert-appreciation', name: 'Appreciation', desc: 'Warm-tone thank you certificate', layout: 'cert-warm', topPick: true },
    ],
  },
  {
    id: 'offer_letter',
    label: 'Offer letters',
    desc: 'Employment offer and appointment letter layouts',
    accent: '#0f766e',
    templates: [
      { id: 'offer-standard', name: 'Standard Offer', desc: 'Formal letter with salary and start date', layout: 'offer-standard', topPick: true },
      { id: 'offer-modern', name: 'Modern Offer', desc: 'Two-column summary plus letter body', layout: 'offer-modern', topPick: true },
      { id: 'offer-brief', name: 'Brief Offer', desc: 'Short one-page appointment confirmation', layout: 'offer-brief', topPick: true },
    ],
  },
]

const DEFAULT_SELECTIONS = Object.fromEntries(
  TEMPLATE_CATEGORIES.map((cat) => [cat.id, cat.templates[0].id]),
)

function storageKey(agencyId) {
  return `${STORAGE_PREFIX}.${agencyId || 'default'}`
}

function customStorageKey(agencyId) {
  return `${CUSTOM_PREFIX}.${agencyId || 'default'}`
}

function settingsKey(agencyId) {
  return `${SETTINGS_PREFIX}.${agencyId || 'default'}`
}

function notify(agencyId, selections) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TEMPLATE_EVENT, {
      detail: { agencyId, selections, custom: loadCustomTemplates(agencyId) },
    }))
  }
}

export function loadTemplateSelections(agencyId) {
  try {
    const raw = localStorage.getItem(storageKey(agencyId))
    if (!raw) return { ...DEFAULT_SELECTIONS }
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_SELECTIONS, ...(parsed && typeof parsed === 'object' ? parsed : {}) }
  } catch {
    return { ...DEFAULT_SELECTIONS }
  }
}

export function saveTemplateSelections(agencyId, selections) {
  const next = { ...DEFAULT_SELECTIONS, ...selections }
  localStorage.setItem(storageKey(agencyId), JSON.stringify(next))
  notify(agencyId, next)
  return next
}

export function loadCustomTemplates(agencyId) {
  try {
    const raw = localStorage.getItem(customStorageKey(agencyId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveCustomTemplates(agencyId, templates) {
  localStorage.setItem(customStorageKey(agencyId), JSON.stringify(templates))
  notify(agencyId, loadTemplateSelections(agencyId))
  return templates
}

export function upsertCustomTemplate(agencyId, template) {
  const list = loadCustomTemplates(agencyId)
  const idx = list.findIndex((t) => t.id === template.id)
  const next = idx >= 0
    ? list.map((t, i) => (i === idx ? template : t))
    : [...list, template]
  return saveCustomTemplates(agencyId, next)
}

export function setSelectedTemplate(agencyId, categoryId, templateId) {
  const builtIn = TEMPLATE_CATEGORIES.find((c) => c.id === categoryId)?.templates.some((t) => t.id === templateId)
  const custom = loadCustomTemplates(agencyId).some((t) => t.id === templateId && t.categoryId === categoryId)
  if (!builtIn && !custom) return loadTemplateSelections(agencyId)
  return saveTemplateSelections(agencyId, {
    ...loadTemplateSelections(agencyId),
    [categoryId]: templateId,
  })
}

export function getSelectedTemplateId(agencyId, categoryId) {
  const selections = loadTemplateSelections(agencyId)
  return selections[categoryId] || DEFAULT_SELECTIONS[categoryId]
}

export function getTemplateById(agencyId, templateId) {
  for (const cat of TEMPLATE_CATEGORIES) {
    const found = cat.templates.find((t) => t.id === templateId)
    if (found) return { ...found, categoryId: cat.id, categoryLabel: cat.label, builtIn: true, accent: cat.accent }
  }
  const custom = loadCustomTemplates(agencyId).find((t) => t.id === templateId)
  if (custom) {
    const cat = TEMPLATE_CATEGORIES.find((c) => c.id === custom.categoryId)
    return {
      ...custom,
      categoryLabel: cat?.label || custom.categoryId,
      accent: custom.accent || cat?.accent,
      builtIn: false,
      topPick: false,
    }
  }
  return null
}

export function getTemplatesForCategory(agencyId, categoryId) {
  const cat = TEMPLATE_CATEGORIES.find((c) => c.id === categoryId)
  const builtIn = (cat?.templates || []).map((t) => ({
    ...t,
    accent: cat.accent,
    categoryId,
    builtIn: true,
  }))
  const custom = loadCustomTemplates(agencyId).filter((t) => t.categoryId === categoryId)
  return [...builtIn, ...custom]
}

export function createBlankTemplate(categoryId) {
  const cat = TEMPLATE_CATEGORIES.find((c) => c.id === categoryId)
  const base = cat?.templates[0]
  return {
    id: `custom-${categoryId}-${Date.now()}`,
    categoryId,
    name: `Untitled ${cat?.label?.replace(/s$/, '') || 'document'}`,
    desc: 'Custom LaTeX template (Create manually)',
    layout: base?.layout || 'letter-corporate',
    variant: base?.variant,
    accent: cat?.accent,
    custom: true,
    latexMode: true,
    topPick: false,
  }
}

/** Per-template style overrides (company copy, fonts) — invoice-app form fields. */
export function loadTemplateSettings(agencyId, templateId) {
  try {
    const raw = localStorage.getItem(settingsKey(agencyId))
    if (!raw) return {}
    const all = JSON.parse(raw)
    return (all && all[templateId]) || {}
  } catch {
    return {}
  }
}

export function saveTemplateSettings(agencyId, templateId, settings) {
  let all = {}
  try {
    all = JSON.parse(localStorage.getItem(settingsKey(agencyId)) || '{}') || {}
  } catch {
    all = {}
  }
  all[templateId] = settings
  localStorage.setItem(settingsKey(agencyId), JSON.stringify(all))
  notify(agencyId, loadTemplateSelections(agencyId))
  return settings
}

export function galleryPastelFor(id = '') {
  const colors = ['#dcefe4', '#d9e8f5', '#f3e7c8', '#f0dde6', '#e4e2f5', '#ddeceb', '#f5e6d8', '#e2eef0']
  let hash = 0
  String(id).split('').forEach((ch) => { hash = (hash + ch.charCodeAt(0) * 17) % colors.length })
  return colors[hash]
}

export function getPayslipVariant(agencyId) {
  const id = getSelectedTemplateId(agencyId, 'payslip')
  const tpl = getTemplateById(agencyId, id)
  // Corporate Pay Stub (classic) is the default — matches reference template exactly
  return tpl?.variant || 'classic'
}

export function resolveAgencyId(userOrId) {
  if (typeof userOrId === 'string' || typeof userOrId === 'number') return userOrId
  return getAgencyId(userOrId)
}
