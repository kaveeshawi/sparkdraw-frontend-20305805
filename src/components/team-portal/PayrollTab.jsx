import { useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  IconCreditCard, IconWallet, IconTrendingUp, IconTrendingDown, IconFileText,
  IconPlus, IconTrash, IconCash, IconBuildingBank, IconChartAreaLine,
  IconAlertTriangle, IconCalendarEvent, IconReceipt, IconFileInvoice,
  IconEye, IconEyeOff, IconCopy, IconPencil, IconCheck, IconX, IconMail, IconPrinter,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { KpiCard, Panel, DataTable, StatusBadge } from './shared'
import PayslipStub from './PayslipStub'
import { cn } from '@/lib/utils'
import { useAgencyCurrency, useFormatMoney } from '@/hooks/useAgencyCurrency'
import { agencyApi } from '@/services/api'
import useAuthStore from '@/store/authStore'
import { getAgencyId } from '@/lib/media'
import { getPayslipVariant, TEMPLATE_EVENT } from '@/lib/documentTemplates'
import { capturePayslipPdf, downloadPdfBlob, printPdfBlob } from '@/lib/payslipPdf'

const EARNING_PRESETS = [
  { type: 'basic', label: 'Basic salary' },
  { type: 'allowance', label: 'Allowances' },
  { type: 'overtime', label: 'Overtime' },
  { type: 'incentive', label: 'Incentive' },
  { type: 'bonus', label: 'Bonus' },
  { type: 'other', label: 'Other earning' },
]

const DEDUCTION_PRESETS = [
  { type: 'tax', label: 'PAYE Tax' },
  { type: 'epf', label: 'EPF (Employee 8%)' },
  { type: 'etf', label: 'ETF (3%)' },
  { type: 'other', label: 'Other deduction' },
]

const SUMMARY_COLORS = {
  earnings: '#16a34a',
  incentives: '#d97706',
  deductions: '#ef4444',
  net: '#2563eb',
}

const CONTRACT_OPTIONS = [
  { id: 'full_time', label: 'Full time', mode: 'salary', note: 'Monthly salary with tax / EPF / ETF' },
  { id: 'part_time', label: 'Part time', mode: 'salary', note: 'Pro-rated salary with statutory deductions' },
  { id: 'contractor', label: 'Contractor / Freelancer', mode: 'invoice', note: 'Invoice payment — no EPF / ETF / PAYE' },
]

function normalizeContract(type) {
  if (type === 'contractor' || type === 'freelance' || type === 'freelancer') return 'contractor'
  if (type === 'part_time') return 'part_time'
  return 'full_time'
}

function isInvoiceContract(type) {
  return normalizeContract(type) === 'contractor'
}

function getPaySchedule(payDay = 25) {
  const day = Math.min(28, Math.max(1, Number(payDay) || 25))
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const thisMonthPay = new Date(y, m, day)
  const nextMonthPay = new Date(y, m + 1, day)
  const overdue = now > thisMonthPay
  const target = overdue ? thisMonthPay : thisMonthPay
  const upcoming = overdue ? nextMonthPay : thisMonthPay
  const fmt = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const daysLate = overdue ? Math.floor((now - thisMonthPay) / 86400000) : 0
  const daysUntil = !overdue ? Math.ceil((thisMonthPay - now) / 86400000) : Math.ceil((nextMonthPay - now) / 86400000)
  return {
    payDay: day,
    overdue,
    scheduledLabel: fmt(target),
    upcomingLabel: fmt(upcoming),
    daysLate,
    daysUntil,
  }
}

function smoothPath(points, width, height, padX, padTop, padBottom, maxY) {
  if (!points.length) return { line: '', area: '', coords: [] }
  const innerH = height - padTop - padBottom
  const step = points.length === 1 ? 0 : (width - padX * 2) / (points.length - 1)
  const coords = points.map((p, i) => ({
    x: padX + i * step,
    y: padTop + innerH * (1 - (maxY ? p / maxY : 0)),
  }))
  let line = `M ${coords[0].x} ${coords[0].y}`
  for (let i = 0; i < coords.length - 1; i += 1) {
    const c0 = coords[i === 0 ? i : i - 1]
    const c1 = coords[i]
    const c2 = coords[i + 1]
    const c3 = coords[i + 2] || c2
    line += ` C ${c1.x + (c2.x - c0.x) / 6} ${c1.y + (c2.y - c0.y) / 6}, ${c2.x - (c3.x - c1.x) / 6} ${c2.y - (c3.y - c1.y) / 6}, ${c2.x} ${c2.y}`
  }
  const last = coords[coords.length - 1]
  const first = coords[0]
  const baseY = height - padBottom
  return { line, area: `${line} L ${last.x} ${baseY} L ${first.x} ${baseY} Z`, coords }
}

function PayrollTrendChart({ trend }) {
  const gradId = useId().replace(/:/g, '')
  const width = 440
  const height = 176
  const padX = 10
  const padTop = 14
  const padBottom = 28
  const values = trend.map((t) => t.net)
  const maxY = Math.max(...values, 1) * 1.08
  const { line, area, coords } = smoothPath(values, width, height, padX, padTop, padBottom, maxY)

  return (
    <div className="sd-team-portal__pay-trend">
      <div className="sd-team-portal__pay-trend-chart">
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16a34a" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#16a34a" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {coords.map((c, i) => (
            <line key={trend[i].label} x1={c.x} y1={padTop} x2={c.x} y2={height - padBottom} className="sd-team-portal__pay-trend-grid" />
          ))}
          <path d={area} fill={`url(#${gradId})`} />
          <path d={line} fill="none" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="sd-team-portal__pay-trend-labels">
          {trend.map((t) => <span key={t.label}>{t.label}</span>)}
        </div>
      </div>
    </div>
  )
}

function PaySummaryChart({ earnings, incentives, deductions, net, invoiceMode, money }) {
  const size = 156
  const cx = size / 2
  const cy = size / 2
  const outerR = 58
  const innerR = 36

  // Visual slices are Net + Deductions (parts of gross). Legend lists all 4 figures.
  const slices = invoiceMode
    ? [{ key: 'net', label: 'Amount due', amount: net, color: SUMMARY_COLORS.net }]
    : [
      { key: 'net', label: 'Net', amount: net, color: SUMMARY_COLORS.net },
      { key: 'deductions', label: 'Deductions', amount: deductions, color: SUMMARY_COLORS.deductions },
    ].filter((s) => s.amount > 0)

  const total = slices.reduce((s, i) => s + i.amount, 0) || 1

  const polar = (r, angle) => {
    const rad = ((angle - 90) * Math.PI) / 180
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
  }

  const arc = (start, end) => {
    if (end - start >= 359.9) {
      return `M ${cx} ${cy - outerR} A ${outerR} ${outerR} 0 1 1 ${cx - 0.01} ${cy - outerR} L ${cx - 0.01} ${cy - innerR} A ${innerR} ${innerR} 0 1 0 ${cx} ${cy - innerR} Z`
    }
    const large = end - start > 180 ? 1 : 0
    const o1 = polar(outerR, start)
    const o2 = polar(outerR, end)
    const i2 = polar(innerR, end)
    const i1 = polar(innerR, start)
    return `M ${o1.x} ${o1.y} A ${outerR} ${outerR} 0 ${large} 1 ${o2.x} ${o2.y} L ${i2.x} ${i2.y} A ${innerR} ${innerR} 0 ${large} 0 ${i1.x} ${i1.y} Z`
  }

  let angle = 0
  const paths = slices.map((item) => {
    const sweep = (item.amount / total) * 360
    const start = angle
    const end = angle + Math.max(sweep, 0.01)
    angle = end
    return { ...item, d: arc(start, end) }
  })

  const legend = [
    { key: 'earnings', label: invoiceMode ? 'Invoice total' : 'Earnings', amount: earnings, color: SUMMARY_COLORS.earnings },
    { key: 'incentives', label: invoiceMode ? 'Extras' : 'Incentives', amount: incentives, color: SUMMARY_COLORS.incentives },
    ...(!invoiceMode ? [{ key: 'deductions', label: 'Deductions', amount: deductions, color: SUMMARY_COLORS.deductions }] : []),
    { key: 'net', label: invoiceMode ? 'Amount due' : 'Net', amount: net, color: SUMMARY_COLORS.net },
  ]

  return (
    <div className="sd-team-portal__pay-break">
      <div className="sd-team-portal__pay-break-chart is-lg">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
          {paths.length === 0 ? (
            <circle cx={cx} cy={cy} r={(outerR + innerR) / 2} fill="none" stroke="var(--border)" strokeWidth={outerR - innerR} />
          ) : (
            paths.map((p) => <path key={p.key} d={p.d} fill={p.color} />)
          )}
        </svg>
        <div className="sd-team-portal__pay-break-center">
          <strong>{money(net)}</strong>
          <span>Net</span>
        </div>
      </div>
      <ul className="sd-team-portal__pay-break-legend">
        {legend.map((item) => (
          <li key={item.key}>
            <span style={{ background: item.color }} />
            <em>{item.label}</em>
            <strong>{money(item.amount)}</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}

function maskAccount(accountNumber = '') {
  const digits = String(accountNumber).replace(/\s/g, '')
  if (digits.length <= 4) return digits
  return `${'•'.repeat(Math.max(4, digits.length - 4))}${digits.slice(-4)}`
}

function LineItem({ item, canEdit, onSave, onRemove, money }) {
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState(item.label)
  const [amount, setAmount] = useState(String(item.amount ?? ''))

  const startEdit = () => {
    setLabel(item.label)
    setAmount(String(item.amount ?? ''))
    setEditing(true)
  }

  const cancelEdit = () => {
    setLabel(item.label)
    setAmount(String(item.amount ?? ''))
    setEditing(false)
  }

  const saveEdit = () => {
    const nextAmount = Number(amount)
    const nextLabel = label.trim()
    if (!nextLabel) {
      toast.error('Enter a label')
      return
    }
    if (!Number.isFinite(nextAmount) || nextAmount < 0) {
      toast.error('Enter a valid amount')
      return
    }
    onSave?.(item.id, { label: nextLabel, amount: nextAmount })
    setEditing(false)
  }

  if (editing && canEdit) {
    return (
      <div className="sd-team-portal__pay-line is-editing">
        <input
          className="sd-team-portal__pay-input"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          aria-label="Item label"
        />
        <input
          className="sd-team-portal__pay-input is-amount"
          type="number"
          min="0"
          step="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-label="Item amount"
        />
        <div className="sd-team-portal__pay-line-right">
          <button type="button" className="sd-team-portal__pay-icon-btn is-save" onClick={saveEdit} aria-label="Save">
            <IconCheck size={14} stroke={2} />
          </button>
          <button type="button" className="sd-team-portal__pay-icon-btn" onClick={cancelEdit} aria-label="Cancel">
            <IconX size={14} stroke={2} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="sd-team-portal__pay-line">
      <div>
        <strong>{item.label}</strong>
        {item.type ? <em>{String(item.type).replace(/_/g, ' ')}</em> : null}
      </div>
      <div className="sd-team-portal__pay-line-right">
        <span>{money(item.amount)}</span>
        {canEdit ? (
          <>
            <button type="button" className="sd-team-portal__pay-icon-btn" onClick={startEdit} aria-label={`Edit ${item.label}`}>
              <IconPencil size={14} stroke={1.75} />
            </button>
            {onRemove ? (
              <button type="button" className="sd-team-portal__pay-icon-btn" onClick={() => onRemove(item.id)} aria-label={`Remove ${item.label}`}>
                <IconTrash size={14} stroke={1.75} />
              </button>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  )
}

export default function PayrollTab({ data, member, canManage = false }) {
  const money = useFormatMoney()
  const currency = useAgencyCurrency()
  const authUser = useAuthStore((s) => s.user)
  const agencyId = getAgencyId(authUser)
  const [payslipVariant, setPayslipVariant] = useState(() => getPayslipVariant(agencyId))
  const seed = data.payroll
  const initialContract = normalizeContract(member?.employment_type || seed.contractType || 'full_time')
  const [period] = useState(seed.period)
  const [status, setStatus] = useState(seed.status)
  const [contractType, setContractType] = useState(initialContract)
  const [earnings, setEarnings] = useState(() => (seed.earnings || []).map((e) => ({ ...e, locked: false })))
  const [deductions, setDeductions] = useState(() => (seed.deductionsList || []).map((d) => ({ ...d, locked: false })))
  const [history, setHistory] = useState(() => [...(seed.history || [])])
  const [payMethod, setPayMethod] = useState(seed.bank?.method || 'Bank transfer')
  const [showEarningForm, setShowEarningForm] = useState(false)
  const [showDeduction, setShowDeduction] = useState(false)
  const [earningForm, setEarningForm] = useState({ type: 'basic', label: 'Basic salary', amount: '' })
  const [deductionForm, setDeductionForm] = useState({ type: 'other', label: 'Other deduction', amount: '' })
  const [paying, setPaying] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [showAccount, setShowAccount] = useState(false)
  const [company, setCompany] = useState(() => authUser?.agency || null)
  const [slipOpen, setSlipOpen] = useState(false)
  const [slipPayload, setSlipPayload] = useState(null)
  const [emailOpen, setEmailOpen] = useState(false)
  const [emailTo, setEmailTo] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [pendingPdf, setPendingPdf] = useState(null)
  const slipSheetRef = useRef(null)

  useEffect(() => {
    agencyApi
      .show()
      .then((res) => setCompany(res.data.data))
      .catch(() => setCompany(authUser?.agency || null))
  }, [authUser?.agency])

  useEffect(() => {
    setPayslipVariant(getPayslipVariant(agencyId))
    const refresh = () => setPayslipVariant(getPayslipVariant(agencyId))
    window.addEventListener(TEMPLATE_EVENT, refresh)
    return () => window.removeEventListener(TEMPLATE_EVENT, refresh)
  }, [agencyId])

  const accountNumber = seed.bank?.accountNumber || ''
  const accountHolder = seed.bank?.holder || member?.name || ''
  const accountDisplay = showAccount ? accountNumber : maskAccount(accountNumber)

  const copyText = async (value, successMessage) => {
    if (!value) {
      toast.error('Nothing to copy')
      return
    }
    try {
      await navigator.clipboard.writeText(value)
      toast.success(successMessage)
    } catch {
      toast.error('Could not copy')
    }
  }

  const copyAccount = () => copyText(accountNumber, 'Account number copied')
  const copyHolder = () => copyText(accountHolder, 'Account holder copied')

  const invoiceMode = isInvoiceContract(contractType)
  const schedule = useMemo(() => getPaySchedule(seed.payDay), [seed.payDay])
  const contractMeta = CONTRACT_OPTIONS.find((c) => c.id === contractType) || CONTRACT_OPTIONS[0]

  const gross = useMemo(() => earnings.reduce((s, e) => s + Number(e.amount || 0), 0), [earnings])
  const deductionsTotal = useMemo(
    () => (invoiceMode ? 0 : deductions.reduce((s, d) => s + Number(d.amount || 0), 0)),
    [deductions, invoiceMode],
  )
  const net = Math.max(0, gross - deductionsTotal)
  const incentivesTotal = earnings
    .filter((e) => e.type === 'incentive' || e.type === 'bonus')
    .reduce((s, e) => s + Number(e.amount || 0), 0)

  const trend = useMemo(() => {
    const base = seed.trend || []
    if (!base.length) return [{ label: 'Now', net, gross, deductions: deductionsTotal }]
    return base.map((t, i) => (i === base.length - 1 ? { ...t, net, gross, deductions: deductionsTotal } : t))
  }, [seed.trend, net, gross, deductionsTotal])

  const addEarning = (e) => {
    e.preventDefault()
    const amount = Number(earningForm.amount)
    const preset = EARNING_PRESETS.find((p) => p.type === earningForm.type)
    const label = earningForm.label.trim() || preset?.label || (invoiceMode ? 'Invoice line' : 'Earning')
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error('Enter a valid amount')
      return
    }
    setEarnings((prev) => [...prev, {
      id: `earn-${Date.now()}`,
      label,
      amount,
      type: invoiceMode ? 'line' : earningForm.type,
      locked: false,
    }])
    setEarningForm({ type: 'incentive', label: 'Incentive', amount: '' })
    setShowEarningForm(false)
    toast.success('Earning added')
  }

  const addDeduction = (e) => {
    e.preventDefault()
    if (invoiceMode) return
    const amount = Number(deductionForm.amount)
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error('Enter a valid deduction amount')
      return
    }
    const preset = DEDUCTION_PRESETS.find((p) => p.type === deductionForm.type)
    setDeductions((prev) => [
      ...prev,
      {
        id: `ded-${Date.now()}`,
        type: deductionForm.type,
        label: deductionForm.label.trim() || preset?.label || 'Deduction',
        amount,
        locked: false,
      },
    ])
    setDeductionForm({ type: 'other', label: 'Other deduction', amount: '' })
    setShowDeduction(false)
    toast.success('Deduction added')
  }

  const updateEarning = (id, patch) => {
    setEarnings((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)))
    toast.success('Earning updated')
  }

  const updateDeduction = (id, patch) => {
    setDeductions((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)))
    toast.success('Deduction updated')
  }

  const removeEarning = (id) => {
    setEarnings((prev) => prev.filter((x) => x.id !== id))
    toast.success('Earning removed')
  }

  const removeDeduction = (id) => {
    setDeductions((prev) => prev.filter((x) => x.id !== id))
    toast.success('Deduction removed')
  }

  const paidHistory = history.filter((h) => h.status === 'paid')

  const employeeMeta = {
    name: member?.name || seed.bank?.holder || 'Employee',
    employeeId: member?.employee_id || member?.employeeId || `EMP-${member?.id || '—'}`,
    email: member?.email || '',
  }

  const buildSlipFromLive = () => ({
    periodLabel: period,
    periodEnding: period,
    payDate: new Date().toISOString(),
    earnings: earnings.map((e) => ({
      label: e.label,
      rate: e.rate ?? '',
      hours: e.hours ?? '',
      amount: Number(e.amount || 0),
    })),
    deductions: deductions.map((d) => ({
      label: d.label,
      amount: Number(d.amount || 0),
    })),
    invoiceMode,
  })

  const buildSlipFromHistory = (h) => {
    if (h.earnings?.length || h.deductionsList?.length) {
      return {
        periodLabel: h.month,
        periodEnding: h.month,
        payDate: h.paidAt || h.month,
        earnings: (h.earnings || []).map((e) => ({
          label: e.label,
          rate: e.rate ?? '',
          hours: e.hours ?? '',
          amount: Number(e.amount || 0),
        })),
        deductions: (h.deductionsList || []).map((d) => ({
          label: d.label,
          amount: Number(d.amount || 0),
        })),
        invoiceMode: invoiceMode || h.doc === 'invoice',
      }
    }

    const grossAmt = Number(h.gross || 0)
    const incentivesAmt = Number(h.incentives || 0)
    const base = Math.max(0, grossAmt - incentivesAmt)
    const earnRows = [
      { label: 'Basic salary', rate: '', hours: '', amount: base },
    ]
    if (incentivesAmt > 0) {
      earnRows.push({ label: 'Incentives / bonus', rate: '', hours: '', amount: incentivesAmt })
    }
    const dedAmt = Number(h.deductions || 0)
    const dedRows = dedAmt > 0
      ? [
        { label: 'PAYE Tax', amount: Math.round(dedAmt * 0.45) },
        { label: 'EPF (Employee 8%)', amount: Math.round(dedAmt * 0.4) },
        { label: 'ETF (3%)', amount: Math.max(0, dedAmt - Math.round(dedAmt * 0.45) - Math.round(dedAmt * 0.4)) },
      ]
      : []

    return {
      periodLabel: h.month,
      periodEnding: h.month,
      payDate: h.paidAt || h.month,
      earnings: earnRows,
      deductions: dedRows,
      invoiceMode: invoiceMode || h.doc === 'invoice',
    }
  }

  const openPayslip = (payload) => {
    setPendingPdf(null)
    setSlipPayload(payload)
    setSlipOpen(true)
  }

  const openEmailFor = (payload) => {
    setSlipPayload(payload)
    setEmailTo(employeeMeta.email || company?.email || '')
    setEmailOpen(true)
  }

  const payslipFilenameBase = () => {
    const month = slipPayload?.periodLabel || period || 'payslip'
    const who = employeeMeta.name || 'employee'
    return `payslip-${who}-${month}`
  }

  const buildPayslipPdf = async () => {
    const root = slipSheetRef.current
    const target = root?.querySelector?.('.sd-payslip') || root
    if (!target) throw new Error('Open the payslip preview first')
    return capturePayslipPdf(target, {
      filename: payslipFilenameBase(),
      title: `${invoiceMode ? 'Invoice' : 'Pay stub'} — ${slipPayload?.periodLabel || period}`,
    })
  }

  const sendPayslipEmail = async () => {
    const to = emailTo.trim()
    if (!to || !to.includes('@')) {
      toast.error('Enter a valid email address')
      return
    }
    setEmailSending(true)
    try {
      let file = pendingPdf
      if (!file?.blob) {
        // Slip dialog may still be open behind the email modal
        file = await buildPayslipPdf()
        setPendingPdf(file)
      }
      downloadPdfBlob(file.blob, file.filename)
      await new Promise((r) => setTimeout(r, 400))
      setEmailOpen(false)
      toast.success(`Payslip PDF ready for ${to}`, {
        description: `${file.filename} downloaded — attach it to your email.`,
      })
    } catch (err) {
      toast.error(err?.message || 'Could not create payslip PDF')
    } finally {
      setEmailSending(false)
    }
  }

  const printPayslip = async () => {
    setPdfBusy(true)
    try {
      const { blob } = await buildPayslipPdf()
      await printPdfBlob(blob)
    } catch (err) {
      toast.error(err?.message || 'Could not open print dialog')
    } finally {
      setPdfBusy(false)
    }
  }

  const startEmailSlip = async () => {
    setPdfBusy(true)
    try {
      const file = await buildPayslipPdf()
      setPendingPdf(file)
      openEmailFor(slipPayload || buildSlipFromLive())
    } catch (err) {
      toast.error(err?.message || 'Could not prepare PDF for email')
    } finally {
      setPdfBusy(false)
    }
  }

  const confirmPay = async () => {
    if (!canManage) return
    setPaying(true)
    await new Promise((r) => setTimeout(r, 800))
    const snapEarnings = earnings.map((e) => ({ ...e }))
    const snapDeductions = deductions.map((d) => ({ ...d }))
    setStatus('paid')
    setHistory((prev) => prev.map((h, i) => (
      i === prev.length - 1
        ? {
          ...h,
          status: 'paid',
          net,
          gross,
          deductions: deductionsTotal,
          incentives: incentivesTotal,
          paidAt: 'Just now',
          method: payMethod,
          doc: invoiceMode ? 'invoice' : 'payslip',
          earnings: snapEarnings,
          deductionsList: snapDeductions,
        }
        : h
    )))
    setPaying(false)
    setConfirmOpen(false)
    toast.success(
      invoiceMode
        ? `Invoice of ${money(net)} paid via ${payMethod}`
        : `Salary of ${money(net)} paid via ${payMethod}`,
    )
  }

  return (
    <div className="sd-dash-v2 sd-team-portal__payroll">
      <div className="sd-dash-v2__kpi-grid sd-team-portal__pay-kpi">
        <KpiCard icon={IconCreditCard} label={invoiceMode ? 'Invoice total' : 'Gross pay'} value={money(gross)} sub={period} subTone="" tone="green" />
        <KpiCard icon={IconWallet} label={invoiceMode ? 'Amount due' : 'Net pay'} value={money(net)} sub={status === 'paid' ? 'Paid' : 'Payable'} subTone="" tone="blue" />
        <KpiCard icon={IconTrendingUp} label={invoiceMode ? 'Extras' : 'Incentives'} value={money(incentivesTotal)} sub={invoiceMode ? 'Additional lines' : 'Bonuses & extras'} subTone="" tone="orange" />
        <KpiCard
          icon={invoiceMode ? IconFileInvoice : IconTrendingDown}
          label={invoiceMode ? 'Contract' : 'Deductions'}
          value={invoiceMode ? 'Invoice' : money(deductionsTotal)}
          sub={invoiceMode ? 'No EPF / ETF / PAYE' : 'Tax · EPF · ETF'}
          subTone=""
          tone={invoiceMode ? 'violet' : 'red'}
        />
      </div>

      {status !== 'paid' && (
        <div className={cn('sd-team-portal__pay-schedule', schedule.overdue ? 'is-overdue' : 'is-upcoming')}>
          {schedule.overdue ? (
            <>
              <IconAlertTriangle size={16} stroke={1.75} />
              <div>
                <strong>Salary payment overdue</strong>
                <p>
                  Scheduled payday was <b>{schedule.scheduledLabel}</b> (day {schedule.payDay})
                  {' '}· {schedule.daysLate} day{schedule.daysLate === 1 ? '' : 's'} late.
                  Next cycle: {schedule.upcomingLabel}.
                </p>
              </div>
            </>
          ) : (
            <>
              <IconCalendarEvent size={16} stroke={1.75} />
              <div>
                <strong>Upcoming wage</strong>
                <p>
                  Next payday is <b>{schedule.upcomingLabel}</b> (day {schedule.payDay} of each month)
                  {' '}· in {schedule.daysUntil} day{schedule.daysUntil === 1 ? '' : 's'}.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      <div className="sd-team-portal__pay-top-grid">
        <Panel
          title={invoiceMode ? 'Current invoice' : 'Current payslip'}
          desc={`${period} · payday day ${schedule.payDay}`}
          action={(
            <span className={cn('sd-team-portal__pay-status', `is-${status}`)}>
              {status === 'paid' ? 'Paid' : status === 'ready' ? 'Ready to pay' : 'Draft'}
            </span>
          )}
        >
          <div className="sd-team-portal__pay-current sd-team-portal__pay-current--stack">
            <div className="sd-team-portal__pay-account">
              <div className="sd-team-portal__pay-account-head">
                <IconBuildingBank size={16} stroke={1.75} />
                <strong>Account details</strong>
              </div>
              <div className="sd-team-portal__pay-account-grid">
                <div><span>Bank</span><strong>{seed.bank?.name || '—'}</strong></div>
                <div className="is-holder">
                  <span>Account holder</span>
                  <div className="sd-team-portal__pay-account-no">
                    <strong>{accountHolder || '—'}</strong>
                    <button type="button" className="sd-team-portal__pay-icon-btn" onClick={copyHolder} aria-label="Copy account holder" disabled={!accountHolder}>
                      <IconCopy size={14} stroke={1.75} />
                    </button>
                  </div>
                </div>
                <div className="is-account">
                  <span>Account no.</span>
                  <div className="sd-team-portal__pay-account-no">
                    <strong className={showAccount ? 'is-visible' : 'is-masked'}>{accountDisplay || '—'}</strong>
                    <button type="button" className="sd-team-portal__pay-icon-btn" onClick={() => setShowAccount((v) => !v)} aria-label={showAccount ? 'Hide account number' : 'View account number'}>
                      {showAccount ? <IconEyeOff size={14} stroke={1.75} /> : <IconEye size={14} stroke={1.75} />}
                    </button>
                    <button type="button" className="sd-team-portal__pay-icon-btn" onClick={copyAccount} aria-label="Copy account number">
                      <IconCopy size={14} stroke={1.75} />
                    </button>
                  </div>
                </div>
                <div><span>Branch</span><strong>{seed.bank?.branch || '—'}</strong></div>
              </div>
            </div>

            <div className="sd-team-portal__pay-paybox">
              <div className="sd-team-portal__pay-paybox-row">
                <span>Contract type</span>
                {canManage && status !== 'paid' ? (
                  <select
                    className="sd-team-portal__pay-select"
                    value={contractType}
                    onChange={(e) => {
                      const next = normalizeContract(e.target.value)
                      setContractType(next)
                      setShowDeduction(false)
                      toast.message(
                        isInvoiceContract(next)
                          ? 'Switched to invoice mode — statutory deductions hidden'
                          : 'Switched to salary mode — tax / EPF / ETF apply',
                      )
                    }}
                  >
                    {CONTRACT_OPTIONS.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                ) : (
                  <strong>{contractMeta.label}</strong>
                )}
              </div>
              <p className="sd-team-portal__pay-contract-note">{contractMeta.note}</p>
              <div className="sd-team-portal__pay-paybox-row">
                <span>Payment method</span>
                {canManage && status !== 'paid' ? (
                  <select
                    className="sd-team-portal__pay-select"
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                  >
                    <option>Bank transfer</option>
                    <option>PayPal</option>
                    <option>Cash</option>
                  </select>
                ) : (
                  <strong>{payMethod}</strong>
                )}
              </div>
              <div className="sd-team-portal__pay-paybox-row">
                <span>Payday</span>
                <strong>Day {schedule.payDay} · {schedule.overdue ? schedule.scheduledLabel : schedule.upcomingLabel}</strong>
              </div>
              <div className="sd-team-portal__pay-paybox-row is-net">
                <span>{invoiceMode ? 'Invoice due' : 'Amount due'}</span>
                <strong>{money(net)}</strong>
              </div>
              {canManage ? (
                <button
                  type="button"
                  className="sd-btn-gradient sd-team-portal__pay-now"
                  disabled={paying || status === 'paid' || net <= 0}
                  onClick={() => setConfirmOpen(true)}
                >
                  {invoiceMode ? <IconReceipt size={16} stroke={1.75} /> : <IconCash size={16} stroke={1.75} />}
                  {status === 'paid' ? 'Payment completed' : invoiceMode ? 'Pay invoice' : 'Pay now'}
                </button>
              ) : (
                <p className="sd-team-portal__pay-hint">
                  <IconBuildingBank size={14} stroke={1.75} />
                  Payments are processed by agency admin.
                </p>
              )}
              {status === 'paid' ? (
                <div className="sd-team-portal__pay-slip-actions">
                  <button
                    type="button"
                    className="sd-team-portal__pay-slip-btn"
                    onClick={() => openPayslip(buildSlipFromLive())}
                  >
                    <IconFileText size={14} stroke={1.75} />
                    View payslip
                  </button>
                  {canManage ? (
                    <button
                      type="button"
                      className="sd-team-portal__pay-slip-btn"
                      onClick={() => openEmailFor(buildSlipFromLive())}
                    >
                      <IconMail size={14} stroke={1.75} />
                      Email slip
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </Panel>

        <div className="sd-team-portal__pay-right-stack">
          <Panel title="Pay summary" desc="Earnings, incentives, deductions and net">
            <div className="sd-team-portal__pay-panel-pad">
              <PaySummaryChart
                earnings={gross}
                incentives={incentivesTotal}
                deductions={deductionsTotal}
                net={net}
                invoiceMode={invoiceMode}
                money={money}
              />
            </div>
          </Panel>

          <Panel
            title="Net pay trend"
            desc="Last 6 pay cycles"
            action={<IconChartAreaLine size={16} stroke={1.75} className="sd-team-portal__pay-chart-icon" />}
          >
            <div className="sd-team-portal__pay-panel-pad">
              <div className="sd-team-portal__pay-trend-score">
                <strong>{money(net)}</strong>
                <em>this period</em>
              </div>
              <PayrollTrendChart trend={trend} />
            </div>
          </Panel>
        </div>
      </div>

      <div className="sd-team-portal__pay-breakdown">
        <div className="sd-team-portal__pay-split-grid">
          <Panel
            title={invoiceMode ? 'Invoice lines & extras' : 'Earnings & incentives'}
            desc={invoiceMode ? 'Billable lines for this invoice' : 'Basic pay, allowances, OT and bonuses'}
            action={canManage ? (
              <button type="button" className="sd-dash-v2__panel-link" onClick={() => { setShowEarningForm((v) => !v); setShowDeduction(false) }}>
                <IconPlus size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
                {invoiceMode ? 'Add line' : 'Add earning'}
              </button>
            ) : null}
          >
            <div className="sd-team-portal__pay-lines">
              {showEarningForm && canManage ? (
                <form className="sd-team-portal__pay-add-form is-earn" onSubmit={addEarning}>
                  {!invoiceMode ? (
                    <select
                      className="sd-team-portal__pay-input"
                      value={earningForm.type}
                      onChange={(e) => {
                        const type = e.target.value
                        const preset = EARNING_PRESETS.find((p) => p.type === type)
                        setEarningForm((f) => ({ ...f, type, label: preset?.label || f.label }))
                      }}
                    >
                      {EARNING_PRESETS.map((p) => (
                        <option key={p.type} value={p.type}>{p.label}</option>
                      ))}
                    </select>
                  ) : null}
                  <input
                    className="sd-team-portal__pay-input"
                    placeholder={invoiceMode ? 'Line label' : 'Label'}
                    value={earningForm.label}
                    onChange={(e) => setEarningForm((f) => ({ ...f, label: e.target.value }))}
                  />
                  <input
                    className="sd-team-portal__pay-input"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Amount"
                    value={earningForm.amount}
                    onChange={(e) => setEarningForm((f) => ({ ...f, amount: e.target.value }))}
                  />
                  <button type="submit" className="sd-btn-gradient rounded-full px-3 py-2 text-[12px] font-medium text-white border-0">Add</button>
                  <button type="button" className="sd-team-portal__pay-cancel" onClick={() => setShowEarningForm(false)}>Cancel</button>
                </form>
              ) : null}
              {earnings.map((item) => (
                <LineItem
                  key={item.id}
                  item={item}
                  canEdit={canManage}
                  onSave={updateEarning}
                  onRemove={canManage ? removeEarning : undefined}
                  money={money}
                />
              ))}
              <div className="sd-team-portal__pay-line is-total">
                <div><strong>{invoiceMode ? 'Invoice total' : 'Gross earnings'}</strong></div>
                <div className="sd-team-portal__pay-line-right"><span>{money(gross)}</span></div>
              </div>
            </div>
          </Panel>

          <Panel
            title="Deductions"
            desc={invoiceMode ? 'Not used for freelancers / contractors' : 'Tax, EPF, ETF and other withholdings'}
            action={!invoiceMode && canManage ? (
              <button type="button" className="sd-dash-v2__panel-link" onClick={() => { setShowDeduction((v) => !v); setShowEarningForm(false) }}>
                <IconPlus size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
                Add deduction
              </button>
            ) : null}
          >
            {invoiceMode ? (
              <div className="sd-team-portal__pay-invoice-empty">
                <IconFileInvoice size={22} stroke={1.75} />
                <strong>Statutory deductions don’t apply</strong>
                <p>
                  This contract is invoice-based. Freelancers / contractors are paid on invoice —
                  PAYE, EPF and ETF are not withheld here.
                </p>
              </div>
            ) : (
              <div className="sd-team-portal__pay-lines">
                {showDeduction && canManage ? (
                  <form className="sd-team-portal__pay-add-form is-ded" onSubmit={addDeduction}>
                    <select
                      className="sd-team-portal__pay-input"
                      value={deductionForm.type}
                      onChange={(e) => {
                        const type = e.target.value
                        const preset = DEDUCTION_PRESETS.find((p) => p.type === type)
                        setDeductionForm((f) => ({ ...f, type, label: preset?.label || f.label }))
                      }}
                    >
                      {DEDUCTION_PRESETS.map((p) => (
                        <option key={p.type} value={p.type}>{p.label}</option>
                      ))}
                    </select>
                    <input
                      className="sd-team-portal__pay-input"
                      placeholder="Label"
                      value={deductionForm.label}
                      onChange={(e) => setDeductionForm((f) => ({ ...f, label: e.target.value }))}
                    />
                    <input
                      className="sd-team-portal__pay-input"
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Amount"
                      value={deductionForm.amount}
                      onChange={(e) => setDeductionForm((f) => ({ ...f, amount: e.target.value }))}
                    />
                    <button type="submit" className="sd-btn-gradient rounded-full px-3 py-2 text-[12px] font-medium text-white border-0">Add</button>
                    <button type="button" className="sd-team-portal__pay-cancel" onClick={() => setShowDeduction(false)}>Cancel</button>
                  </form>
                ) : null}
                {deductions.map((item) => (
                  <LineItem
                    key={item.id}
                    item={item}
                    canEdit={canManage}
                    onSave={updateDeduction}
                    onRemove={canManage ? removeDeduction : undefined}
                    money={money}
                  />
                ))}
                <div className="sd-team-portal__pay-line is-total is-ded-total">
                  <div><strong>Total deductions</strong></div>
                  <div className="sd-team-portal__pay-line-right"><span>{money(deductionsTotal)}</span></div>
                </div>
              </div>
            )}
          </Panel>
        </div>

        <div className="sd-team-portal__pay-net-summary">
          <div>
            <span>Gross</span>
            <strong>{money(gross)}</strong>
          </div>
          <span className="sd-team-portal__pay-net-op">−</span>
          <div>
            <span>Deductions</span>
            <strong className="is-ded">{money(deductionsTotal)}</strong>
          </div>
          <span className="sd-team-portal__pay-net-op">=</span>
          <div className="is-net">
            <span>Net payable</span>
            <strong>{money(net)}</strong>
          </div>
        </div>
      </div>

      <Panel
        title="Payment history"
        desc={`${paidHistory.length} payment${paidHistory.length === 1 ? '' : 's'} recorded`}
      >
        <DataTable columns={['#', 'Period', 'Paid on', 'Method', 'Status', 'Payslip']}>
          {history.map((h, index) => {
            const paid = h.status === 'paid'
            const slip = () => buildSlipFromHistory(h)
            return (
              <tr key={h.id || h.month}>
                <td>{index + 1}</td>
                <td><strong>{h.month}</strong></td>
                <td>{paid ? (h.paidAt || '—') : '—'}</td>
                <td>{paid ? (h.method || '—') : '—'}</td>
                <td>
                  <StatusBadge status={h.status === 'ready' ? 'pending' : h.status === 'draft' ? 'processing' : h.status} />
                </td>
                <td>
                  {paid ? (
                    <div className="sd-team-portal__pay-hist-actions">
                      <button
                        type="button"
                        className="sd-dash-v2__panel-link"
                        onClick={() => openPayslip(slip())}
                      >
                        <IconFileText size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
                        View
                      </button>
                      {canManage ? (
                        <button
                          type="button"
                          className="sd-dash-v2__panel-link"
                          onClick={() => openEmailFor(slip())}
                        >
                          <IconMail size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
                          Email
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </DataTable>
      </Panel>

      <Dialog open={confirmOpen} onOpenChange={(open) => !paying && setConfirmOpen(open)}>
        <DialogContent className="sd-team-profile-dialog sm:max-w-md border-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Confirm payment</DialogTitle>
            <DialogDescription>Confirm sending this payroll or invoice payment.</DialogDescription>
          </DialogHeader>
          <div className="sd-team-portal__pay-confirm">
            <div className="sd-team-portal__pay-confirm-icon">
              {invoiceMode ? <IconReceipt size={22} stroke={1.75} /> : <IconCash size={22} stroke={1.75} />}
            </div>
            <h3>{invoiceMode ? 'Confirm invoice payment?' : 'Confirm salary payment?'}</h3>
            <p>
              You are about to pay <strong>{money(net)}</strong> to{' '}
              <strong>{seed.bank?.holder || member?.name || 'this member'}</strong> via{' '}
              <strong>{payMethod}</strong>
              {accountNumber ? <> ({seed.bank.name} {showAccount ? accountNumber : maskAccount(accountNumber)})</> : null}.
            </p>
            <ul>
              <li><span>Period</span><strong>{period}</strong></li>
              <li><span>Contract</span><strong>{contractMeta.label}</strong></li>
              <li><span>{invoiceMode ? 'Invoice total' : 'Net pay'}</span><strong>{money(net)}</strong></li>
            </ul>
            <div className="sd-team-portal__pay-confirm-actions">
              <button type="button" className="sd-team-portal__pay-cancel is-lg" disabled={paying} onClick={() => setConfirmOpen(false)}>
                Cancel
              </button>
              <button type="button" className="sd-btn-gradient sd-team-portal__pay-confirm-btn" disabled={paying} onClick={confirmPay}>
                {paying ? 'Processing…' : invoiceMode ? 'Confirm & pay invoice' : 'Confirm & pay salary'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={slipOpen} onOpenChange={setSlipOpen}>
        <DialogContent className="sd-payslip-dialog border-0 sm:max-w-4xl">
          <DialogHeader className="sd-payslip-dialog__header">
            <DialogTitle>{invoiceMode ? 'Invoice slip' : 'Employee pay stub'}</DialogTitle>
            <DialogDescription>
              Template from Assets → Templates · company details from Settings · {slipPayload?.periodLabel || period}
            </DialogDescription>
          </DialogHeader>
          <div className="sd-payslip-dialog__actions no-print">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              disabled={pdfBusy}
              onClick={printPayslip}
            >
              <IconPrinter size={15} stroke={1.75} />
              {pdfBusy ? 'Preparing…' : 'Print'}
            </Button>
            <Button
              type="button"
              className="sd-btn-gradient rounded-full"
              disabled={pdfBusy}
              onClick={startEmailSlip}
            >
              <IconMail size={15} stroke={1.75} />
              Email slip
            </Button>
          </div>
          {slipPayload ? (
            <div className="sd-payslip-dialog__sheet" ref={slipSheetRef}>
              <PayslipStub
                company={company}
                employee={employeeMeta}
                periodLabel={slipPayload.periodLabel}
                periodEnding={slipPayload.periodEnding}
                payDate={slipPayload.payDate}
                earnings={slipPayload.earnings}
                deductions={slipPayload.deductions}
                currency={currency}
                invoiceMode={slipPayload.invoiceMode}
                variant={payslipVariant}
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={emailOpen} onOpenChange={(open) => !emailSending && setEmailOpen(open)}>
        <DialogContent className="sd-team-profile-dialog sm:max-w-md border-0">
          <DialogHeader>
            <DialogTitle>Email payslip</DialogTitle>
            <DialogDescription>
              A PDF of the {slipPayload?.periodLabel || period} pay stub will download so you can attach it to your email
              {pendingPdf?.filename ? ` (${pendingPdf.filename})` : ''}.
            </DialogDescription>
          </DialogHeader>
          <div className="sd-team-form" style={{ gap: '0.85rem' }}>
            <div className="sd-team-form__field">
              <Label htmlFor="payslip-email">Recipient email</Label>
              <Input
                id="payslip-email"
                type="email"
                className="sd-team-field"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="name@example.com"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Slip uses company name, address, phone, email and website from Settings.
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" className="rounded-full" disabled={emailSending} onClick={() => setEmailOpen(false)}>
                Cancel
              </Button>
              <Button type="button" className="sd-btn-gradient rounded-full" disabled={emailSending} onClick={sendPayslipEmail}>
                <IconMail size={15} stroke={1.75} />
                {emailSending ? 'Sending…' : 'Send email'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
