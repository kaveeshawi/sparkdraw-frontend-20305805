import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconDownload,
  IconFileInvoice,
  IconSend,
  IconZoomIn,
  IconZoomOut,
  IconZoomReset,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import InvoiceDocument from '../finance/InvoiceDocument'
import { captureInvoicePdf, downloadPdfBlob } from '../../lib/invoicePdf'
import useAuthStore from '../../store/authStore'
import { invoicesApi } from '../../services/api'
import { useFormatMoney } from '@/hooks/useAgencyCurrency'

const STATUS_VARIANTS = {
  draft: 'outline',
  sent: 'info',
  paid: 'success',
  overdue: 'destructive',
}

const ZOOM_MIN = 0.42
const ZOOM_MAX = 0.95
const ZOOM_STEP = 0.08
const ZOOM_DEFAULT = 0.58

export default function InvoiceDetailModal({
  open,
  onClose,
  invoiceId,
  onUpdated,
  onDownloadPdf,
}) {
  const money = useFormatMoney()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const pageRef = useRef(null)
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [zoom, setZoom] = useState(ZOOM_DEFAULT)

  const isAdminOrPm = ['admin', 'pm'].includes(user?.role)
  const isClient = user?.role === 'client'

  useEffect(() => {
    if (!open || !invoiceId) return
    setLoading(true)
    setZoom(ZOOM_DEFAULT)
    invoicesApi.show(invoiceId)
      .then((res) => setInvoice(res.data.data))
      .catch(() => setInvoice(null))
      .finally(() => setLoading(false))
  }, [open, invoiceId])

  const handleSend = async () => {
    setSending(true)
    try {
      await invoicesApi.send(invoiceId)
      const res = await invoicesApi.show(invoiceId)
      setInvoice(res.data.data)
      onUpdated?.()
      toast.success('Invoice sent')
    } finally {
      setSending(false)
    }
  }

  const handlePay = () => {
    onClose?.()
    navigate(`/invoices/${invoiceId}/pay`)
  }

  const handlePdf = async () => {
    if (!invoice) return
    if (onDownloadPdf) {
      onDownloadPdf(invoice)
      return
    }
    setPdfBusy(true)
    try {
      await new Promise((r) => setTimeout(r, 50))
      const el = pageRef.current
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
    }
  }

  const metaBits = []
  if (invoice?.client_name || invoice?.client?.company_name) {
    metaBits.push(invoice.client_name || invoice.client?.company_name)
  }
  if (invoice?.project_name || invoice?.project?.name) {
    metaBits.push(invoice.project_name || invoice.project?.name)
  }
  if (invoice?.due_date) metaBits.push(`Due ${invoice.due_date}`)
  if (invoice?.amount != null || invoice?.total != null) {
    metaBits.push(money(invoice.total ?? invoice.amount))
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose?.() }}>
      <DialogContent className="sd-invoice-view-dialog border-0 p-0 overflow-hidden gap-0 flex flex-col">
        <DialogTitle className="sr-only">
          {invoice?.invoice_number || 'Invoice'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Invoice document preview
        </DialogDescription>

        <header className="sd-invoice-view-dialog__chrome">
          <div className="sd-invoice-view-dialog__chrome-left">
            <div className="sd-invoice-view-dialog__icon" aria-hidden>
              <IconFileInvoice size={18} stroke={1.75} />
            </div>
            <div className="min-w-0">
              <div className="sd-invoice-view-dialog__title-row">
                <strong>{invoice?.invoice_number || (loading ? 'Loading…' : 'Invoice')}</strong>
                {invoice?.status ? (
                  <Badge variant={STATUS_VARIANTS[invoice.status] || 'outline'} className="capitalize">
                    {invoice.status}
                  </Badge>
                ) : null}
              </div>
              <p className="sd-invoice-view-dialog__meta">
                {loading ? 'Fetching invoice…' : (metaBits.join(' · ') || 'Invoice document')}
              </p>
            </div>
          </div>

          <div className="sd-invoice-view-dialog__chrome-actions">
            {invoice ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                disabled={pdfBusy}
                onClick={handlePdf}
              >
                <IconDownload size={15} />
                {pdfBusy ? 'Preparing…' : 'PDF'}
              </Button>
            ) : null}
            {isAdminOrPm && invoice?.status === 'draft' ? (
              <Button
                type="button"
                size="sm"
                className="sd-btn-gradient rounded-full border-0 shadow-none"
                disabled={sending}
                onClick={handleSend}
              >
                <IconSend size={15} />
                {sending ? 'Sending…' : 'Send'}
              </Button>
            ) : null}
            {(isClient || isAdminOrPm) && ['sent', 'overdue'].includes(invoice?.status) ? (
              <Button
                type="button"
                size="sm"
                className="sd-btn-gradient rounded-full border-0 shadow-none"
                onClick={handlePay}
              >
                Pay now
              </Button>
            ) : null}
          </div>
        </header>

        <div className="sd-invoice-view-dialog__toolbar">
          <span className="sd-invoice-view-dialog__toolbar-label">Document preview</span>
          <div className="sd-sheet-preview__zoom" role="group" aria-label="Zoom">
            <button
              type="button"
              className="sd-sheet-preview__zoom-btn"
              aria-label="Zoom out"
              disabled={zoom <= ZOOM_MIN}
              onClick={() => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))}
            >
              <IconZoomOut size={16} stroke={1.75} />
            </button>
            <button
              type="button"
              className="sd-sheet-preview__zoom-value"
              aria-label="Reset zoom"
              onClick={() => setZoom(ZOOM_DEFAULT)}
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              className="sd-sheet-preview__zoom-btn"
              aria-label="Zoom in"
              disabled={zoom >= ZOOM_MAX}
              onClick={() => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))}
            >
              <IconZoomIn size={16} stroke={1.75} />
            </button>
            <button
              type="button"
              className="sd-sheet-preview__zoom-btn"
              aria-label="Reset zoom"
              onClick={() => setZoom(ZOOM_DEFAULT)}
            >
              <IconZoomReset size={16} stroke={1.75} />
            </button>
          </div>
        </div>

        <div className="sd-invoice-view-dialog__stage">
          {loading ? (
            <div className="sd-invoice-view-dialog__loading">
              <Skeleton className="h-[28rem] w-[min(100%,21rem)] rounded-xl" />
            </div>
          ) : !invoice ? (
            <div className="sd-invoice-view-dialog__empty">
              <IconFileInvoice size={28} stroke={1.5} />
              <p>Invoice not found</p>
            </div>
          ) : (
            <div className="sd-invoice-view-dialog__page">
              <InvoiceDocument invoice={invoice} scale={zoom} pageRef={pageRef} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
