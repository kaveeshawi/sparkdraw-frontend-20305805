import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  IconDownload, IconEye, IconFileInvoice, IconPlus, IconRefresh,
  IconSearch, IconSend, IconSparkles, IconTemplate, IconX,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import PageWrapper from '../components/layout/PageWrapper'
import FloatPageHeader from '../components/layout/FloatPageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import NewInvoiceEditor from '../components/finance/NewInvoiceEditor'
import InvoiceDetailModal from '../components/modals/InvoiceDetailModal'
import FinanceOverview from '../components/finance/FinanceOverview'
import InvoiceDocument from '../components/finance/InvoiceDocument'
import { captureInvoicePdf, downloadPdfBlob } from '../lib/invoicePdf'
import { aiApi, invoicesApi } from '../services/api'
import useAuthStore from '../store/authStore'
import { useFormatMoney } from '@/hooks/useAgencyCurrency'
import { getAgencyId } from '@/lib/media'
import { getSelectedTemplateId, getTemplateById } from '../lib/documentTemplates'

const STATUS_VARIANTS = {
  draft: 'outline', sent: 'info', paid: 'success', overdue: 'destructive',
}

const FILTERS = ['all', 'draft', 'sent', 'paid', 'overdue']

export default function InvoicesPage() {
  const { user } = useAuthStore()
  const money = useFormatMoney()
  const isAdmin = user?.role === 'admin'
  const agencyId = getAgencyId(user)
  const pdfRef = useRef(null)

  const [invoices, setInvoices] = useState([])
  const [summary, setSummary] = useState(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [detailId, setDetailId] = useState(null)
  const [sendingId, setSendingId] = useState(null)
  const [pdfInvoice, setPdfInvoice] = useState(null)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [reminderOpen, setReminderOpen] = useState(false)
  const [reminderLoading, setReminderLoading] = useState(false)
  const [reminderDraft, setReminderDraft] = useState({ subject: '', body: '' })
  const [reminderFor, setReminderFor] = useState(null)
  const [templateTick, setTemplateTick] = useState(0)

  const activeTemplate = useMemo(() => {
    const id = getSelectedTemplateId(agencyId, 'invoice')
    return getTemplateById(agencyId, id)
  }, [agencyId, templateTick])

  useEffect(() => {
    const onTpl = () => setTemplateTick((n) => n + 1)
    window.addEventListener('sparkdraw:document-templates', onTpl)
    return () => window.removeEventListener('sparkdraw:document-templates', onTpl)
  }, [])

  const fetchData = useCallback(() => {
    setIsLoading(true)
    const params = filter !== 'all' ? { status: filter } : {}
    Promise.all([
      invoicesApi.index(params),
      isAdmin ? invoicesApi.revenue() : Promise.resolve({ data: { data: null } }),
    ])
      .then(([invRes, revRes]) => {
        const raw = invRes.data.data
        setInvoices(Array.isArray(raw) ? raw : (raw?.data ?? []))
        setSummary(revRes.data.data)
      })
      .catch(() => {
        setInvoices([])
        setSummary(null)
      })
      .finally(() => setIsLoading(false))
  }, [filter, isAdmin])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return invoices
    return invoices.filter((inv) => {
      const hay = `${inv.invoice_number || ''} ${inv.client_name || ''} ${inv.project_name || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [invoices, search])

  const handleSend = async (id) => {
    setSendingId(id)
    try {
      await invoicesApi.send(id)
      toast.success('Invoice sent')
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send invoice')
    } finally {
      setSendingId(null)
    }
  }

  const runPdf = async (invoice) => {
    setPdfBusy(true)
    setPdfInvoice(invoice)
    try {
      // Wait for hidden document to mount
      await new Promise((r) => setTimeout(r, 80))
      const el = pdfRef.current
      if (!el) throw new Error('Preview not ready')
      const { blob, filename } = await captureInvoicePdf(el, {
        filename: invoice.invoice_number || 'invoice',
        title: invoice.invoice_number || 'Invoice',
      })
      downloadPdfBlob(blob, filename)
      toast.success('PDF downloaded')
    } catch (err) {
      toast.error(err.message || 'PDF export failed')
    } finally {
      setPdfBusy(false)
      setPdfInvoice(null)
    }
  }

  const openReminder = async (invoice) => {
    setReminderFor(invoice)
    setReminderOpen(true)
    setReminderLoading(true)
    setReminderDraft({ subject: '', body: '' })
    try {
      const res = await aiApi.invoiceReminder(invoice.id)
      setReminderDraft({
        subject: res.data.data?.subject || '',
        body: res.data.data?.body || '',
      })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not draft reminder')
      setReminderOpen(false)
    } finally {
      setReminderLoading(false)
    }
  }

  const copyReminder = async () => {
    const text = `${reminderDraft.subject}\n\n${reminderDraft.body}`
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Reminder copied — paste into email')
    } catch {
      toast.error('Could not copy to clipboard')
    }
  }

  return (
    <PageWrapper
      pageActions={
        <FloatPageHeader
          title="Finance"
          subtitle="Revenue, invoices, and collections"
        >
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/assets?tab=invoice">
              <IconTemplate size={16} />
              Invoice templates
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={fetchData}
          >
            <IconRefresh size={16} />
            Refresh
          </Button>
          <Button
            variant="default"
            className="sd-header-new-project sd-btn-gradient inline-flex shrink-0 border-0 shadow-none"
            onClick={() => setShowNew(true)}
          >
            <IconPlus size={16} />
            New invoice
          </Button>
        </FloatPageHeader>
      }
    >
      <div className="sd-page sd-page--team sd-finance-page sd-animate-in">
        {isAdmin && summary ? <FinanceOverview summary={summary} /> : null}

        <div className="sd-finance-template-chip sd-card">
          <IconFileInvoice size={16} stroke={1.75} />
          <div className="min-w-0 flex-1">
            <strong>Active invoice template</strong>
            <p>
              {activeTemplate?.name || 'Classic Invoice'}
              {' · '}
              From Assets — new invoices use this layout
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="rounded-full shrink-0">
            <Link to="/assets?tab=invoice">Change</Link>
          </Button>
        </div>

        <div className="sd-team-toolbar sd-finance-toolbar">
          <div className="sd-team-search">
            <IconSearch size={16} stroke={1.75} className="sd-team-search__icon" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice #, client, or project…"
              className="sd-team-search__input"
            />
            {search ? (
              <button type="button" className="sd-team-search__clear" onClick={() => setSearch('')} aria-label="Clear search">
                <IconX size={14} />
              </button>
            ) : null}
          </div>

          <div className="sd-client-filters" role="group" aria-label="Filter invoices">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`sd-client-filter${filter === f ? ' is-active' : ''}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="sd-card overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col gap-2 p-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <IconFileInvoice size={22} stroke={1.5} />
              </div>
              <p className="text-sm font-medium">No invoices found</p>
              <p className="max-w-xs text-sm text-muted-foreground">
                Create an invoice — it will use your Assets template automatically.
              </p>
              <Button
                className="sd-header-new-project sd-btn-gradient rounded-full border-0 shadow-none"
                onClick={() => setShowNew(true)}
              >
                <IconPlus size={16} />
                New invoice
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Invoice #', 'Client', 'Project', 'Amount', 'Status', 'Due', 'Template', 'Actions'].map((h) => (
                      <th key={h} className="px-3.5 py-2.5 text-left text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => (
                    <tr key={inv.id} className="border-b border-border last:border-0">
                      <td className="px-3.5 py-3 font-medium">{inv.invoice_number}</td>
                      <td className="px-3.5 py-3">{inv.client_name || '—'}</td>
                      <td className="px-3.5 py-3 text-muted-foreground">{inv.project_name || '—'}</td>
                      <td className="px-3.5 py-3 tabular-nums font-medium">{money(inv.amount ?? inv.total)}</td>
                      <td className="px-3.5 py-3">
                        <Badge variant={STATUS_VARIANTS[inv.status] || 'outline'} className="capitalize">
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="px-3.5 py-3 text-muted-foreground">{inv.due_date || '—'}</td>
                      <td className="px-3.5 py-3 text-xs text-muted-foreground">
                        {inv.template_id
                          ? (getTemplateById(agencyId, inv.template_id)?.name || inv.template_id)
                          : (activeTemplate?.name || 'Default')}
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="flex flex-wrap items-center gap-1">
                          <Button type="button" size="sm" variant="ghost" className="h-8 rounded-full" onClick={() => setDetailId(inv.id)}>
                            <IconEye size={14} />
                            View
                          </Button>
                          {inv.status === 'draft' ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 rounded-full"
                              disabled={sendingId === inv.id}
                              onClick={() => handleSend(inv.id)}
                            >
                              <IconSend size={14} />
                              Send
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 rounded-full"
                            disabled={pdfBusy}
                            onClick={() => runPdf(inv)}
                          >
                            <IconDownload size={14} />
                            PDF
                          </Button>
                          {['sent', 'overdue'].includes(inv.status) ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 rounded-full"
                              onClick={() => openReminder(inv)}
                            >
                              <IconSparkles size={14} />
                              AI
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Off-screen render target for PDF capture */}
      {pdfInvoice ? (
        <div className="sd-invoice-pdf-capture" aria-hidden>
          <InvoiceDocument
            invoice={pdfInvoice}
            scale={1}
            pageRef={pdfRef}
          />
        </div>
      ) : null}

      <NewInvoiceEditor
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreated={() => {
          fetchData()
          setShowNew(false)
        }}
      />

      <InvoiceDetailModal
        open={Boolean(detailId)}
        invoiceId={detailId}
        onClose={() => setDetailId(null)}
        onUpdated={fetchData}
        onDownloadPdf={(inv) => runPdf(inv)}
      />

      <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
        <DialogContent className="sd-team-form-dialog sd-finance-reminder-dialog border-0">
          <DialogHeader className="sd-team-form-dialog__header">
            <DialogTitle>AI payment reminder</DialogTitle>
            <DialogDescription>
              Draft for {reminderFor?.invoice_number}. Review and copy — nothing is sent automatically.
            </DialogDescription>
          </DialogHeader>
          {reminderLoading ? (
            <div className="sd-finance-reminder-skeleton">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
          ) : (
            <div className="sd-team-form sd-finance-reminder-form">
              <div className="sd-team-form__field">
                <label htmlFor="finance-reminder-subject" className="sd-finance-reminder-label">
                  Subject
                </label>
                <Input
                  id="finance-reminder-subject"
                  className="sd-team-field"
                  value={reminderDraft.subject}
                  onChange={(e) => setReminderDraft((d) => ({ ...d, subject: e.target.value }))}
                />
              </div>
              <div className="sd-team-form__field">
                <label htmlFor="finance-reminder-body" className="sd-finance-reminder-label">
                  Body
                </label>
                <textarea
                  id="finance-reminder-body"
                  className="sd-team-field sd-team-field--textarea sd-finance-reminder-body"
                  rows={11}
                  value={reminderDraft.body}
                  onChange={(e) => setReminderDraft((d) => ({ ...d, body: e.target.value }))}
                />
              </div>
            </div>
          )}
          <DialogFooter className="sd-team-form-dialog__footer gap-2">
            <Button type="button" variant="outline" className="rounded-full" onClick={() => setReminderOpen(false)}>
              Close
            </Button>
            <Button
              type="button"
              className="sd-header-new-project sd-btn-gradient rounded-full border-0 shadow-none"
              disabled={reminderLoading || !reminderDraft.body}
              onClick={copyReminder}
            >
              Copy draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  )
}
