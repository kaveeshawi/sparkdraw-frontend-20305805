/**
 * Capture an invoice A4 DOM node to PDF (same stack as payslips).
 */
import { capturePayslipPdf, downloadPdfBlob } from './payslipPdf'

export async function captureInvoicePdf(element, opts = {}) {
  return capturePayslipPdf(element, {
    filename: opts.filename || 'invoice',
    title: opts.title || 'Invoice',
  })
}

export { downloadPdfBlob }
