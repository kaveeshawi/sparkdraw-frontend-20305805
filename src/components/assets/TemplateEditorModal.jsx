import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  IconX, IconDownload, IconCheck, IconMaximize, IconMinimize,
  IconZoomIn, IconZoomOut, IconDeviceFloppy, IconPlayerPlay,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { agencyApi } from '@/services/api'
import { agencyLogoSrc } from '@/lib/media'
import { fitA4Scale } from '@/lib/a4'
import {
  TEMPLATE_CATEGORIES,
  upsertCustomTemplate,
  setSelectedTemplate,
  loadTemplateSettings,
  saveTemplateSettings,
} from '@/lib/documentTemplates'
import { getDefaultLatex } from '@/lib/latexTemplates'
import { compileLatexPreview } from '@/lib/latexPreview'
import A4Document from './A4Document'
import { capturePageThumbnail } from '@/lib/captureThumbnail'

const FONTS = [
  'Georgia, serif',
  'Inter, sans-serif',
  'Merriweather, serif',
  'Arial, sans-serif',
  '"Times New Roman", serif',
]

/**
 * latexMode=true → Overleaf-style LaTeX editor (Create manually only)
 * latexMode=false → invoice-style form + A4 preview (gallery Edit)
 */
export default function TemplateEditorModal({
  open,
  onOpenChange,
  agencyId,
  categoryId,
  template,
  canManage = false,
  latexMode = false,
  onSaved,
}) {
  if (!open || !template) return null

  const useLatex = Boolean(latexMode || template.latexMode)

  return createPortal(
    useLatex ? (
      <OverleafStyleEditor
        key={`latex-${template.id}`}
        onOpenChange={onOpenChange}
        agencyId={agencyId}
        categoryId={categoryId}
        template={template}
        canManage={canManage}
        onSaved={onSaved}
      />
    ) : (
      <InvoiceStyleEditor
        key={`form-${template.id}`}
        onOpenChange={onOpenChange}
        agencyId={agencyId}
        categoryId={categoryId}
        template={template}
        canManage={canManage}
        onSaved={onSaved}
      />
    ),
    document.body,
  )
}

function InvoiceStyleEditor({
  onOpenChange,
  agencyId,
  categoryId,
  template,
  canManage,
  onSaved,
}) {
  const accentDefault = TEMPLATE_CATEGORIES.find((c) => c.id === categoryId)?.accent || '#2563eb'
  const saved = loadTemplateSettings(agencyId, template.id)

  const [name, setName] = useState(template.name || '')
  const [company, setCompany] = useState({
    name: saved.companyName || 'Your Agency',
    address: saved.address || '',
    email: saved.email || '',
    phone: saved.phone || '',
    website: saved.website || '',
    logo: null,
  })
  const [accent, setAccent] = useState(saved.accent || template.accent || accentDefault)
  const [titleFont, setTitleFont] = useState(saved.titleFont || 'Georgia, serif')
  const [bodyFont, setBodyFont] = useState(saved.bodyFont || 'Inter, sans-serif')
  const [letterBody, setLetterBody] = useState(
    saved.letterBody || 'Dear Recipient,\n\nThis is your letter body. Edit details on the left — the A4 preview updates live.',
  )
  const [saving, setSaving] = useState(false)
  const [previewScale, setPreviewScale] = useState(0.48)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [fullscreenZoom, setFullscreenZoom] = useState(0.6)
  const pageRef = useRef(null)

  const layout = template.layout || template.preview || 'letter-formal'

  useEffect(() => {
    let cancelled = false
    agencyApi.show().then((res) => {
      if (cancelled) return
      const a = res.data?.data || res.data || {}
      setCompany((prev) => ({
        name: saved.companyName || a.company_name || a.name || prev.name,
        address: saved.address || a.address || prev.address,
        email: saved.email || a.email || prev.email,
        phone: saved.phone || a.phone || prev.phone,
        website: saved.website || a.website || prev.website,
        logo: agencyLogoSrc(a) || null,
      }))
      if (!saved.accent && a.brand_colors?.primary) setAccent(a.brand_colors.primary)
    }).catch(() => {})
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId, template.id])

  useEffect(() => {
    const calculateScale = () => {
      const availableHeight = isFullscreen ? window.innerHeight - 80 : 600 - 32
      const availableWidth = isFullscreen
        ? window.innerWidth - 80
        : Math.max(280, (window.innerWidth * 0.45) - 80)
      setPreviewScale(fitA4Scale(availableWidth, availableHeight, 0.65))
    }
    calculateScale()
    window.addEventListener('resize', calculateScale)
    return () => window.removeEventListener('resize', calculateScale)
  }, [isFullscreen])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape') onOpenChange(false) }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onOpenChange])

  const scale = isFullscreen ? fullscreenZoom : previewScale

  const handleSave = async ({ activate } = {}) => {
    if (!canManage) return
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error('Enter a template name')
      return
    }
    setSaving(true)
    try {
      const settings = {
        companyName: company.name,
        address: company.address,
        email: company.email,
        phone: company.phone,
        website: company.website,
        accent,
        titleFont,
        bodyFont,
        letterBody,
      }
      let thumbnail = null
      try {
        thumbnail = await capturePageThumbnail(pageRef.current)
      } catch {
        thumbnail = null
      }

      const isExistingCustom = Boolean(template.custom) || String(template.id).startsWith('custom-')
      const savedTpl = {
        id: isExistingCustom ? template.id : `custom-${categoryId}-${Date.now()}`,
        categoryId,
        name: trimmed,
        desc: template.desc || 'Custom agency template',
        layout: template.layout || layout,
        variant: template.variant,
        accent,
        thumbnail,
        custom: true,
        latexMode: false,
        basedOn: (template.builtIn || !isExistingCustom) ? template.id : template.basedOn,
      }
      upsertCustomTemplate(agencyId, savedTpl)
      saveTemplateSettings(agencyId, savedTpl.id, settings)
      if (activate) setSelectedTemplate(agencyId, categoryId, savedTpl.id)
      onSaved?.(savedTpl)
      toast.success(activate ? 'Saved & selected' : 'Template saved')
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  const categoryLabel = useMemo(
    () => TEMPLATE_CATEGORIES.find((c) => c.id === categoryId)?.label || 'Template',
    [categoryId],
  )

  return (
    <div className="sd-inv-editor" role="dialog" aria-modal="true" aria-label="Template editor">
      <header className="sd-inv-editor__top">
        <div className="sd-inv-editor__top-left">
          <button type="button" className="sd-inv-editor__icon" onClick={() => onOpenChange(false)} aria-label="Close">
            <IconX size={18} stroke={1.75} />
          </button>
          <div>
            <input
              className="sd-inv-editor__title"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canManage}
            />
            <p className="sd-inv-editor__sub">{categoryLabel} · form editor</p>
          </div>
        </div>
        <div className="sd-inv-editor__top-right">
          <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => toast.message('Use Save — PDF download can hook here later')}>
            <IconDownload size={15} />
            Generate PDF
          </Button>
          {canManage ? (
            <>
              <Button type="button" variant="secondary" size="sm" className="rounded-full" disabled={saving} onClick={() => handleSave({ activate: false })}>
                <IconDeviceFloppy size={15} />
                Save
              </Button>
              <Button type="button" size="sm" className="sd-btn-gradient rounded-full" disabled={saving} onClick={() => handleSave({ activate: true })}>
                <IconCheck size={15} />
                Save & use
              </Button>
            </>
          ) : null}
        </div>
      </header>

      <div className="sd-inv-editor__body">
        <section className="sd-inv-editor__form">
          <div className="sd-inv-editor__card">
            <h2>Company details</h2>
            <p>Filled from Settings — change anything and the live preview updates.</p>

            <div className="sd-inv-editor__field">
              <Label>Company name</Label>
              <Input className="sd-team-field" value={company.name} disabled={!canManage} onChange={(e) => setCompany((c) => ({ ...c, name: e.target.value }))} />
            </div>
            <div className="sd-inv-editor__field">
              <Label>Address</Label>
              <Input className="sd-team-field" value={company.address} disabled={!canManage} onChange={(e) => setCompany((c) => ({ ...c, address: e.target.value }))} />
            </div>
            <div className="sd-inv-editor__field">
              <Label>Email</Label>
              <Input className="sd-team-field" value={company.email} disabled={!canManage} onChange={(e) => setCompany((c) => ({ ...c, email: e.target.value }))} />
            </div>
            <div className="sd-inv-editor__field">
              <Label>Phone</Label>
              <Input className="sd-team-field" value={company.phone} disabled={!canManage} onChange={(e) => setCompany((c) => ({ ...c, phone: e.target.value }))} />
            </div>
            <div className="sd-inv-editor__field">
              <Label>Website</Label>
              <Input className="sd-team-field" value={company.website} disabled={!canManage} onChange={(e) => setCompany((c) => ({ ...c, website: e.target.value }))} />
            </div>
            <div className="sd-inv-editor__field">
              <Label>Accent color</Label>
              <input type="color" value={accent} disabled={!canManage} onChange={(e) => setAccent(e.target.value)} />
            </div>
            <div className="sd-inv-editor__field">
              <Label>Title font</Label>
              <select className="sd-inv-editor__select" value={titleFont} disabled={!canManage} onChange={(e) => setTitleFont(e.target.value)}>
                {FONTS.map((f) => <option key={f} value={f}>{f.split(',')[0].replace(/"/g, '')}</option>)}
              </select>
            </div>
            <div className="sd-inv-editor__field">
              <Label>Body font</Label>
              <select className="sd-inv-editor__select" value={bodyFont} disabled={!canManage} onChange={(e) => setBodyFont(e.target.value)}>
                {FONTS.map((f) => <option key={f} value={f}>{f.split(',')[0].replace(/"/g, '')}</option>)}
              </select>
            </div>
            {!String(layout).startsWith('payslip') && !String(layout).startsWith('letter') && (
              <div className="sd-inv-editor__field">
                <Label>Letter / body text</Label>
                <textarea
                  className="sd-inv-editor__textarea"
                  rows={6}
                  value={letterBody}
                  disabled={!canManage}
                  onChange={(e) => setLetterBody(e.target.value)}
                />
              </div>
            )}
            {String(layout).startsWith('letter') && (
              <p className="sd-inv-editor__hint">
                Letterhead is stationery only — header, contact block and footer. No letter body on the page.
              </p>
            )}
            {String(layout).startsWith('payslip') && (
              <p className="sd-inv-editor__hint">
                Payslip header uses company details above. Earnings, deductions, and net stay dynamic from Team Portal payroll.
              </p>
            )}
          </div>
        </section>

        <section className="sd-inv-editor__preview-col">
          <div className="sd-inv-editor__card is-preview">
            <div className="sd-inv-editor__preview-head">
              <div>
                <h2>Live preview</h2>
                <p>A4 · 210mm × 297mm</p>
              </div>
              <div className="sd-inv-editor__preview-actions">
                {isFullscreen ? (
                  <>
                    <button type="button" className="sd-inv-editor__icon" onClick={() => setFullscreenZoom((z) => Math.max(0.2, z - 0.1))} aria-label="Zoom out">
                      <IconZoomOut size={16} />
                    </button>
                    <button type="button" className="sd-inv-editor__icon" onClick={() => setFullscreenZoom((z) => Math.min(1.5, z + 0.1))} aria-label="Zoom in">
                      <IconZoomIn size={16} />
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  className="sd-inv-editor__icon"
                  onClick={() => {
                    setIsFullscreen((v) => !v)
                    setFullscreenZoom(0.6)
                  }}
                  aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                >
                  {isFullscreen ? <IconMinimize size={16} /> : <IconMaximize size={16} />}
                </button>
              </div>
            </div>

            <div
              className={isFullscreen ? 'sd-inv-editor__stage is-fullscreen' : 'sd-inv-editor__stage'}
              style={{ height: isFullscreen ? '100vh' : 600 }}
            >
              <div
                className="sd-inv-editor__sheet"
                style={{
                  width: '210mm',
                  height: '297mm',
                  transform: `scale(${scale})`,
                  transformOrigin: 'center center',
                }}
              >
                <A4Document
                  pageRef={pageRef}
                  layout={layout}
                  company={company}
                  accent={accent}
                  titleFont={titleFont}
                  bodyFont={bodyFont}
                  letterBody={letterBody}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function OverleafStyleEditor({
  onOpenChange,
  agencyId,
  categoryId,
  template,
  canManage,
  onSaved,
}) {
  const accentDefault = TEMPLATE_CATEGORIES.find((c) => c.id === categoryId)?.accent || '#003262'
  const saved = loadTemplateSettings(agencyId, template.id)
  const layout = template.layout || template.preview || 'letter-formal'

  const [name, setName] = useState(template.name || '')
  const [logo, setLogo] = useState(null)
  const [agencySeed, setAgencySeed] = useState({
    name: saved.companyName || 'Your Agency',
    address: saved.address || '',
    email: saved.email || '',
    phone: saved.phone || '',
    website: saved.website || '',
    accent: saved.accent || template.accent || accentDefault,
  })
  const [latexSource, setLatexSource] = useState(
    saved.latexSource || getDefaultLatex(categoryId, layout, {
      ...agencySeed,
      accent: agencySeed.accent,
    }),
  )
  const [compiled, setCompiled] = useState(null)
  const [compiling, setCompiling] = useState(false)
  const [logLine, setLogLine] = useState('Ready')
  const [saving, setSaving] = useState(false)
  const [previewScale, setPreviewScale] = useState(0.48)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [fullscreenZoom, setFullscreenZoom] = useState(0.6)
  const [dirty, setDirty] = useState(false)
  const pageRef = useRef(null)
  const seededRef = useRef(false)

  const recompile = (source = latexSource, seed = agencySeed, logoUrl = logo) => {
    setCompiling(true)
    try {
      const model = compileLatexPreview(source, {
        ...seed,
        logo: logoUrl,
        accent: seed.accent,
      })
      setCompiled(model)
      setLogLine(`Compiled · ${new Date().toLocaleTimeString()}`)
      setDirty(false)
    } catch (err) {
      setLogLine(`Error: ${err?.message || 'compile failed'}`)
      toast.error('Could not compile LaTeX preview')
    } finally {
      setCompiling(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    agencyApi.show().then((res) => {
      if (cancelled) return
      const a = res.data?.data || res.data || {}
      const seed = {
        name: saved.companyName || a.company_name || a.name || 'Your Agency',
        address: saved.address || a.address || '',
        email: saved.email || a.email || '',
        phone: saved.phone || a.phone || '',
        website: saved.website || a.website || '',
        accent: saved.accent || template.accent || a.brand_colors?.primary || accentDefault,
        title: 'Title',
        department: a.company_name || a.name || 'Department',
      }
      const logoUrl = agencyLogoSrc(a) || null
      setAgencySeed(seed)
      setLogo(logoUrl)

      if (!seededRef.current && !saved.latexSource) {
        seededRef.current = true
        const starter = getDefaultLatex(categoryId, layout, seed)
        setLatexSource(starter)
        recompile(starter, seed, logoUrl)
      } else {
        recompile(latexSource, seed, logoUrl)
      }
    }).catch(() => {
      recompile(latexSource, agencySeed, null)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId, template.id])

  useEffect(() => {
    const calculateScale = () => {
      const availableHeight = isFullscreen ? window.innerHeight - 80 : window.innerHeight - 140
      const availableWidth = isFullscreen
        ? window.innerWidth - 80
        : Math.max(260, (window.innerWidth * 0.48) - 48)
      setPreviewScale(fitA4Scale(availableWidth, availableHeight, 0.72))
    }
    calculateScale()
    window.addEventListener('resize', calculateScale)
    return () => window.removeEventListener('resize', calculateScale)
  }, [isFullscreen])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') onOpenChange(false)
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        recompile()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onOpenChange, latexSource])

  const scale = isFullscreen ? fullscreenZoom : previewScale
  const categoryLabel = useMemo(
    () => TEMPLATE_CATEGORIES.find((c) => c.id === categoryId)?.label || 'Template',
    [categoryId],
  )

  const previewLayout = compiled?.layoutHint
    || (String(layout).startsWith('letter') ? 'letter-berkeley' : layout)

  const handleSave = async ({ activate } = {}) => {
    if (!canManage) return
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error('Enter a template name')
      return
    }
    setSaving(true)
    try {
      const model = compiled || compileLatexPreview(latexSource, { ...agencySeed, logo })
      const settings = {
        latexSource,
        companyName: model.agency || model.who,
        address: [model.address, model.cityZip].filter(Boolean).join(', '),
        email: model.email,
        phone: model.phone,
        website: model.url,
        accent: model.accent,
        letterBody: [model.opening, '', model.body].join('\n'),
        titleFont: 'Georgia, serif',
        bodyFont: 'Inter, sans-serif',
      }
      let thumbnail = null
      try {
        thumbnail = await capturePageThumbnail(pageRef.current)
      } catch {
        thumbnail = null
      }

      const isExistingCustom = Boolean(template.custom) || String(template.id).startsWith('custom-')
      const savedTpl = {
        id: isExistingCustom ? template.id : `custom-${categoryId}-${Date.now()}`,
        categoryId,
        name: trimmed,
        desc: template.desc || 'Custom LaTeX template',
        layout: template.layout || layout,
        variant: template.variant,
        accent: model.accent,
        thumbnail,
        custom: true,
        latexMode: true,
        basedOn: (template.builtIn || !isExistingCustom) ? template.id : template.basedOn,
      }
      upsertCustomTemplate(agencyId, savedTpl)
      saveTemplateSettings(agencyId, savedTpl.id, settings)
      if (activate) setSelectedTemplate(agencyId, categoryId, savedTpl.id)
      onSaved?.(savedTpl)
      toast.success(activate ? 'Saved & selected' : 'Template saved')
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sd-ov-editor" role="dialog" aria-modal="true" aria-label="LaTeX template editor">
      <header className="sd-ov-editor__top">
        <div className="sd-ov-editor__top-left">
          <button type="button" className="sd-ov-editor__icon" onClick={() => onOpenChange(false)} aria-label="Close">
            <IconX size={18} stroke={1.75} />
          </button>
          <div className="sd-ov-editor__file">
            <input
              className="sd-ov-editor__title"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canManage}
            />
            <p className="sd-ov-editor__sub">{categoryLabel} · main.tex · Create manually</p>
          </div>
        </div>
        <div className="sd-ov-editor__top-right">
          <Button
            type="button"
            size="sm"
            className="sd-ov-editor__recompile"
            disabled={compiling}
            onClick={() => recompile()}
          >
            <IconPlayerPlay size={15} />
            {compiling ? 'Compiling…' : 'Recompile'}
          </Button>
          <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => toast.message('PDF export can hook to a TeX backend later')}>
            <IconDownload size={15} />
            Download PDF
          </Button>
          {canManage ? (
            <>
              <Button type="button" variant="secondary" size="sm" className="rounded-full" disabled={saving} onClick={() => handleSave({ activate: false })}>
                <IconDeviceFloppy size={15} />
                Save
              </Button>
              <Button type="button" size="sm" className="sd-btn-gradient rounded-full" disabled={saving} onClick={() => handleSave({ activate: true })}>
                <IconCheck size={15} />
                Save & use
              </Button>
            </>
          ) : null}
        </div>
      </header>

      <div className="sd-ov-editor__body">
        <section className="sd-ov-editor__code-pane">
          <div className="sd-ov-editor__code-toolbar">
            <span className="sd-ov-editor__mode is-on">Code</span>
            <span className="sd-ov-editor__hint">Ctrl/⌘ + Enter to recompile{dirty ? ' · unsaved preview' : ''}</span>
          </div>
          <textarea
            className="sd-ov-editor__textarea"
            spellCheck={false}
            value={latexSource}
            disabled={!canManage}
            onChange={(e) => {
              setLatexSource(e.target.value)
              setDirty(true)
            }}
            aria-label="LaTeX source"
          />
          <div className="sd-ov-editor__log">{logLine}</div>
        </section>

        <section className="sd-ov-editor__preview-pane">
          <div className="sd-ov-editor__preview-toolbar">
            <strong>PDF preview</strong>
            <div className="sd-ov-editor__preview-actions">
              {isFullscreen ? (
                <>
                  <button type="button" className="sd-ov-editor__icon" onClick={() => setFullscreenZoom((z) => Math.max(0.2, z - 0.1))} aria-label="Zoom out">
                    <IconZoomOut size={16} />
                  </button>
                  <button type="button" className="sd-ov-editor__icon" onClick={() => setFullscreenZoom((z) => Math.min(1.5, z + 0.1))} aria-label="Zoom in">
                    <IconZoomIn size={16} />
                  </button>
                </>
              ) : null}
              <button
                type="button"
                className="sd-ov-editor__icon"
                onClick={() => {
                  setIsFullscreen((v) => !v)
                  setFullscreenZoom(0.6)
                }}
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <IconMinimize size={16} /> : <IconMaximize size={16} />}
              </button>
            </div>
          </div>

          <div className={isFullscreen ? 'sd-ov-editor__stage is-fullscreen' : 'sd-ov-editor__stage'}>
            <div
              className="sd-ov-editor__sheet"
              style={{
                width: '210mm',
                height: '297mm',
                transform: `scale(${scale})`,
                transformOrigin: 'center center',
              }}
            >
              <A4Document
                pageRef={pageRef}
                layout={previewLayout}
                company={{
                  name: agencySeed.name,
                  address: agencySeed.address,
                  email: agencySeed.email,
                  phone: agencySeed.phone,
                  website: agencySeed.website,
                  logo,
                }}
                accent={compiled?.accent || agencySeed.accent}
                latex={compiled}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
