/**
 * Capture a payslip DOM node to an A4 PDF (html2canvas + jsPDF).
 * Used for Print and Email slip actions.
 */

function safeName(value, fallback = 'payslip') {
  const base = String(value || fallback)
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
  return base || fallback
}

/**
 * @param {HTMLElement} element
 * @param {{ filename?: string, title?: string }} [opts]
 * @returns {Promise<{ blob: Blob, filename: string, pdf: import('jspdf').jsPDF }>}
 */
export async function capturePayslipPdf(element, opts = {}) {
  if (!element) throw new Error('Payslip element not found')

  const html2canvas = (await import('html2canvas')).default
  const { jsPDF } = await import('jspdf')

  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: Math.min(2.5, window.devicePixelRatio || 2),
    useCORS: true,
    allowTaint: true,
    logging: false,
    scrollX: 0,
    scrollY: 0,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  })

  const imgData = canvas.toDataURL('image/png', 1)
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })

  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const margin = 10
  const maxW = pageW - margin * 2
  const maxH = pageH - margin * 2

  const imgW = canvas.width
  const imgH = canvas.height
  const ratio = Math.min(maxW / imgW, maxH / imgH)
  const renderW = imgW * ratio
  const renderH = imgH * ratio
  const x = (pageW - renderW) / 2
  const y = margin

  pdf.setProperties({
    title: opts.title || 'Employee pay stub',
    subject: 'Sparkdraw payslip',
    creator: 'Sparkdraw',
  })
  pdf.addImage(imgData, 'PNG', x, y, renderW, renderH, undefined, 'FAST')

  const filename = safeName(opts.filename, 'payslip') + '.pdf'
  const blob = pdf.output('blob')

  return { blob, filename, pdf }
}

export function downloadPdfBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

/** Print a PDF blob via a hidden iframe — no file download. */
export async function printPdfBlob(blob) {
  const url = URL.createObjectURL(blob)
  const iframe = document.createElement('iframe')
  iframe.setAttribute('title', 'Payslip print')
  iframe.style.cssText = [
    'position:fixed',
    'right:0',
    'bottom:0',
    'width:0',
    'height:0',
    'border:0',
    'opacity:0',
    'pointer-events:none',
  ].join(';')
  iframe.src = url
  document.body.appendChild(iframe)

  await new Promise((resolve) => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      resolve()
    }
    iframe.onload = finish
    setTimeout(finish, 1200)
  })

  try {
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
  } catch {
    throw new Error('Could not open print dialog')
  }

  // Keep iframe until print dialog closes (best-effort cleanup)
  setTimeout(() => {
    iframe.remove()
    URL.revokeObjectURL(url)
  }, 120000)
}
