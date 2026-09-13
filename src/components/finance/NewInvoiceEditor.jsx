import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import {
  IconArrowLeft,
  IconDownload,
  IconMaximize,
  IconMinimize,
  IconPlus,
  IconTemplate,
  IconX,
  IconZoomIn,
  IconZoomOut,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import InvoiceDocument, { buildInvoiceTemplateSnapshot } from './InvoiceDocument'
import { captureInvoicePdf, downloadPdfBlob } from '@/lib/invoicePdf'
import { clientsApi, projectsApi, invoicesApi } from '@/services/api'
import { useFormatMoney } from '@/hooks/useAgencyCurrency'
import useAuthStore from '@/store/authStore'
import { getAgencyId } from '@/lib/media'
import {
  TEMPLATE_EVENT,
  getSelectedTemplateId,
  getTemplateById,
} from '@/lib/documentTemplates'

const EMPTY_LINE = { description: '', quantity: '1', rate: '' }

/**
 * Full-page New Invoice workspace — left form / right live A4 preview
 * (same pattern as my-invoice-app create page).
 */
export default function NewInvoiceEditor({ open, onClose, onCreated }) {
  const money = useFormatMoney()
  const user = useAuthStore((s) => s.user)
  const agencyId = getAgencyId(user)
  const previewRef = useRef(null)

  const [clients, setClients] = useState([])
  const [projects, setProjects] = useState([])
  const [clientId, setClientId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [lineItems, setLineItems] = useState([{ ...EMPTY_LINE }])
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [templateTick, setTemplateTick] = useState(0)
  const [previewScale, setPreviewScale] = useState(0.48)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [fullscreenZoom, setFullscreenZoom] = useState(0.6)
  const [pdfBusy, setPdfBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setClientId('')
    setProjectId('')
    setDueDate('')
    setNotes('')
    setLineItems([{ ...EMPTY_LINE }])
    setErrors({})
    setIsFullscreen(false)
    clientsApi.index().then((res) => setClients(res.data.data || [])).catch(() => {})
    projectsApi.index().then((res) => {
      const raw = res.data.data
      setProjects(Array.isArray(raw) ? raw : (raw?.projects ?? []))
    }).catch(() => {})
  }, [open])

  useEffect(() => {
    const onTpl = () => setTemplateTick((n) => n + 1)
    window.addEventListener(TEMPLATE_EVENT, onTpl)
    return () => window.removeEventListener(TEMPLATE_EVENT, onTpl)
  }, [])

  useEffect(() => {
    if (!open) return
    const calculateScale = () => {
      const mmToPx = 3.7795275591
      const a4HeightPx = 297 * mmToPx
      const a4WidthPx = 210 * mmToPx
      const availableHeight = window.innerHeight - 160
      const availableWidth = Math.max(280, window.innerWidth * 0.42 - 80)
      const scaleByHeight = availableHeight / a4HeightPx
      const scaleByWidth = availableWidth / a4WidthPx
      setPreviewScale(Math.min(scaleByHeight, scaleByWidth, 0.65))
    }
    calculateScale()
    window.addEventListener('resize', calculateScale)
    return () => window.removeEventListener('resize', calculateScale)
  }, [open])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  const filteredProjects = projects.filter(
    (p) => !clientId || String(p.client_id ?? p.client?.id) === String(clientId),
  )
  const selectedClient = clients.find((c) => String(c.id) === String(clientId))
  const selectedProject = projects.find((p) => String(p.id) === String(projectId))
  const templateMeta = useMemo(
    () => getTemplateById(agencyId, getSelectedTemplateId(agencyId, 'invoice')),
    [agencyId, templateTick],
  )

  const updateLine = (index, field, value) => {
    setLineItems((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
  }
  const addLine = () => setLineItems((rows) => [...rows, { ...EMPTY_LINE }])
  const removeLine = (index) => {
    if (lineItems.length <= 1) return
    setLineItems((rows) => rows.filter((_, i) => i !== index))
  }

  const previewLines = useMemo(() => (
    lineItems
      .filter((r) => r.description.trim())
      .map((r) => {
        const quantity = parseFloat(r.quantity) || 1
        const rate = parseFloat(r.rate) || 0
        return { description: r.description, quantity, rate, amount: quantity * rate }
      })
  ), [lineItems])

  const subtotal = previewLines.reduce((sum, row) => sum + row.amount, 0)

  const previewInvoice = useMemo(() => ({
    invoice_number: 'DRAFT',
    created_at: new Date().toISOString(),
    due_date: dueDate || null,
    notes: notes || null,
    client_name: selectedClient?.company_name || 'Client name',
    client: {
      company_name: selectedClient?.company_name,
      contact_name: selectedClient?.contact_name || selectedClient?.contact_user?.name,
      contact_email: selectedClient?.contact_email || selectedClient?.contact_user?.email,
    },
    project_name: selectedProject?.name || 'Project',
    line_items: previewLines.length
      ? previewLines
      : [{ description: 'Line item', quantity: 1, rate: 0, amount: 0 }],
    subtotal,
    tax: 0,
    total: subtotal,
    amount: subtotal,
  }), [dueDate, notes, selectedClient, selectedProject, previewLines, subtotal])

  const handleSubmit = async () => {
    const e = {}
    if (!clientId) e.client_id = 'Client is required'
    if (!projectId) e.project_id = 'Project is required'
    if (lineItems.every((r) => !r.description.trim())) e.line_items = 'At least one line item required'
    if (Object.keys(e).length) {
      setErrors(e)
      toast.error('Fill required invoice fields')
      return
    }

    const snapshot = buildInvoiceTemplateSnapshot(agencyId)
    setSubmitting(true)
    try {
      await invoicesApi.store({
        client_id: Number(clientId),
        project_id: Number(projectId),
        due_date: dueDate || null,
        notes: notes || null,
        template_id: snapshot.template_id,
        template_snapshot: snapshot,
        line_items: lineItems
          .filter((r) => r.description.trim())
          .map((r) => ({
            description: r.description,
            quantity: parseFloat(r.quantity) || 1,
            rate: parseFloat(r.rate) || 0,
          })),
      })
      toast.success('Invoice created')
      onCreated?.()
      onClose?.()
    } catch (err) {
      setErrors(err.response?.data?.errors || {})
      toast.error(err.response?.data?.message || 'Could not create invoice')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePreviewPdf = async () => {
    setPdfBusy(true)
    try {
      await new Promise((r) => setTimeout(r, 60))
      const el = previewRef.current
      if (!el) throw new Error('Preview not ready')
      const { blob, filename } = await captureInvoicePdf(el, {
        filename: 'invoice-draft',
        title: 'Invoice draft',
      })
      downloadPdfBlob(blob, filename)
      toast.success('PDF downloaded')
    } catch (err) {
      toast.error(err.message || 'PDF export failed')
    } finally {
      setPdfBusy(false)
    }
  }

  if (!open) return null

  const scale = isFullscreen ? fullscreenZoom : previewScale

  return createPortal(
    <div className="sd-invoice-create" role="dialog" aria-modal="true" aria-label="New invoice">
      <header className="sd-invoice-create__topbar">
        <div className="sd-invoice-create__topbar-left">
          <Button type="button" variant="ghost" className="rounded-full" onClick={onClose}>
            <IconArrowLeft size={16} />
            Back
          </Button>
          <div className="min-w-0">
            <h1>New invoice</h1>
            <p>
              Fill details on the left — live preview updates instantly ·{' '}
              {templateMeta?.name || 'Classic Invoice'}
            </p>
          </div>
        </div>
        <div className="sd-invoice-create__topbar-actions">
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/assets?tab=invoice">
              <IconTemplate size={16} />
              Templates
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={pdfBusy}
            onClick={handlePreviewPdf}
          >
            <IconDownload size={16} />
            {pdfBusy ? 'Generating…' : 'PDF'}
          </Button>
          <Button type="button" variant="outline" className="rounded-full" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            className="sd-header-new-project sd-btn-gradient rounded-full border-0 shadow-none"
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting ? 'Creating…' : 'Create invoice'}
          </Button>
        </div>
      </header>

      <div className="sd-invoice-create__body">
        {/* LEFT — form */}
        <aside className="sd-invoice-create__form-pane">
          <div className="sd-invoice-create__card sd-card">
            <div className="sd-invoice-create__card-head">
              <span className="sd-invoice-create__badge">Invoice</span>
              <span className="sd-invoice-create__draft-num">Draft</span>
              <span className="sd-invoice-create__template-chip">
                {templateMeta?.name || 'Classic Invoice'}
              </span>
            </div>

            <div className="sd-invoice-create__section">
              <h2>Bill to</h2>
              <div className="sd-invoice-create__grid2">
                <label className="sd-invoice-create__field">
                  <span>Client</span>
                  <select
                    className="sd-team-field"
                    value={clientId}
                    onChange={(e) => {
                      setClientId(e.target.value)
                      setProjectId('')
                    }}
                  >
                    <option value="">Select client</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.company_name}</option>
                    ))}
                  </select>
                  {errors.client_id ? <em>{errors.client_id}</em> : null}
                </label>
                <label className="sd-invoice-create__field">
                  <span>Project</span>
                  <select
                    className="sd-team-field"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                  >
                    <option value="">Select project</option>
                    {filteredProjects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  {errors.project_id ? <em>{errors.project_id}</em> : null}
                </label>
              </div>
            </div>

            <div className="sd-invoice-create__section">
              <h2>Invoice details</h2>
              <div className="sd-invoice-create__grid2">
                <label className="sd-invoice-create__field">
                  <span>Due date</span>
                  <Input
                    type="date"
                    className="sd-team-field"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </label>
                <label className="sd-invoice-create__field">
                  <span>Notes / payment terms</span>
                  <Input
                    className="sd-team-field"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional notes"
                  />
                </label>
              </div>
            </div>

            <div className="sd-invoice-create__section sd-invoice-create__section--last">
              <div className="sd-invoice-create__section-head">
                <h2>Line items</h2>
                <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={addLine}>
                  <IconPlus size={14} />
                  Add line
                </Button>
              </div>
              {errors.line_items ? <p className="sd-invoice-create__error">{errors.line_items}</p> : null}

              <div className="sd-invoice-create__lines">
                <div className="sd-invoice-create__lines-head">
                  <span>Description</span>
                  <span>Qty</span>
                  <span>Rate</span>
                  <span>Amount</span>
                  <span />
                </div>
                {lineItems.map((row, i) => {
                  const qty = parseFloat(row.quantity) || 0
                  const rate = parseFloat(row.rate) || 0
                  const amount = qty * rate
                  return (
                    <div key={i} className="sd-invoice-create__line">
                      <Input
                        className="sd-team-field"
                        placeholder="Description"
                        value={row.description}
                        onChange={(e) => updateLine(i, 'description', e.target.value)}
                      />
                      <Input
                        className="sd-team-field"
                        placeholder="1"
                        value={row.quantity}
                        onChange={(e) => updateLine(i, 'quantity', e.target.value)}
                      />
                      <Input
                        className="sd-team-field"
                        placeholder="0"
                        value={row.rate}
                        onChange={(e) => updateLine(i, 'rate', e.target.value)}
                      />
                      <span className="sd-invoice-create__line-amount">
                        {money(amount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="rounded-full"
                        disabled={lineItems.length <= 1}
                        onClick={() => removeLine(i)}
                        aria-label="Remove line"
                      >
                        <IconX size={14} />
                      </Button>
                    </div>
                  )
                })}
              </div>

              <div className="sd-invoice-create__totals">
                <div><span>Subtotal</span><strong>{money(subtotal, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
                <div className="is-grand"><span>Total</span><strong>{money(subtotal, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
              </div>
            </div>
          </div>
        </aside>

        {/* RIGHT — live preview only (aligned with form) */}
        <aside className="sd-invoice-create__preview-pane">
          <div className={`sd-invoice-create__preview-frame sd-card${isFullscreen ? ' is-fullscreen' : ''}`}>
            <div className="sd-invoice-create__preview-toolbar">
              <span>Live preview</span>
              <div className="sd-invoice-create__preview-controls">
                {isFullscreen ? (
                  <>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="rounded-full h-8 w-8"
                      onClick={() => setFullscreenZoom(Math.max(0.2, fullscreenZoom - 0.1))}
                    >
                      <IconZoomOut size={15} />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="rounded-full h-8 w-8"
                      onClick={() => setFullscreenZoom(Math.min(1.5, fullscreenZoom + 0.1))}
                    >
                      <IconZoomIn size={15} />
                    </Button>
                  </>
                ) : null}
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="rounded-full h-8 w-8"
                  onClick={() => {
                    if (isFullscreen) setFullscreenZoom(0.6)
                    setIsFullscreen((v) => !v)
                  }}
                >
                  {isFullscreen ? <IconMinimize size={15} /> : <IconMaximize size={15} />}
                </Button>
              </div>
            </div>

            <div className="sd-invoice-create__preview-stage">
              <div
                className="sd-invoice-create__preview-scale"
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: 'top center',
                }}
              >
                <InvoiceDocument
                  invoice={previewInvoice}
                  scale={1}
                  pageRef={previewRef}
                />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>,
    document.body,
  )
}
