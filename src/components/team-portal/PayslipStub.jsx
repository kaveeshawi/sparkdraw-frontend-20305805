import { agencyLogoSrc } from '@/lib/media'
import { formatMoney } from '@/lib/currency'
import { cn } from '@/lib/utils'

function fmtDate(value) {
  if (!value) return '—'
  if (value === 'Just now') return new Date().toLocaleDateString('en-GB').replace(/\//g, '-')
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(-2)
  return `${dd}-${mm}-${yy}`
}

/** Format pay period as a clear month label, e.g. "December 2023". */
export function formatPayMonth(value) {
  if (!value) return '—'
  const raw = String(value).trim()
  if (!raw) return '—'

  // Already "March 2026" / "Mar 2026"
  if (/^[A-Za-z]+\s+\d{4}$/.test(raw)) return raw

  // YYYY-MM or YYYY-MM-DD
  const iso = raw.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/)
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3] || 1))
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    }
  }

  // DD-MM-YYYY / DD/MM/YYYY
  const dmy = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/)
  if (dmy) {
    const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3]
    const d = new Date(Number(year), Number(dmy[2]) - 1, Number(dmy[1]))
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    }
  }

  const parsed = new Date(raw)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  }

  return raw
}

function LeafLogo({ color = '#1a4d4e' }) {
  return (
    <svg className="sd-payslip__leaf" viewBox="0 0 48 48" width="48" height="48" aria-hidden>
      <path fill={color} d="M24 6c-2 8-10 14-10 22a10 10 0 0020 0c0-8-8-14-10-22z" opacity="0.95" />
      <path fill={color} d="M14 18c6 2 10 8 10 14a8 8 0 01-14-6c0-3 1-6 4-8z" opacity="0.75" />
      <path fill={color} d="M34 18c-6 2-10 8-10 14a8 8 0 0014-6c0-3-1-6-4-8z" opacity="0.75" />
      <path fill={color} d="M24 20c0 8 0 12-4 16 6 0 10-4 12-10-2 0-6-2-8-6z" opacity="0.85" />
    </svg>
  )
}

function CompanyBlock({ company, logo, compact = false }) {
  return (
    <div className={cn('sd-payslip__company', compact && 'is-compact')}>
      <div className="sd-payslip__logo">
        {logo ? (
          <img src={logo} alt="" />
        ) : (
          <LeafLogo />
        )}
      </div>
      <div className="sd-payslip__company-text">
        <strong>[{company?.name || 'Sparkdraw'}]</strong>
        {company?.address ? <p>{company.address}</p> : <p>42 Galle Road, Colombo 03, Sri Lanka</p>}
        <p>Phone: {company?.phone || '+94 11 234 5678'}</p>
        <p>Email: {company?.email || 'hello@sparkdraw.com'}</p>
        <p>Website: {company?.website || 'www.sparkdraw.com'}</p>
      </div>
    </div>
  )
}

function EarningsTable({ padEarn, money, gross }) {
  return (
    <table className="sd-payslip__grid is-earn">
      <thead>
        <tr>
          <th>Earnings</th>
          <th>Rate</th>
          <th>Hours</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        {padEarn.map((row, i) => (
          <tr key={`e-${i}`}>
            <td className="is-label">{row.label || '\u00A0'}</td>
            <td className="is-num">{row.rate != null && row.rate !== '' ? row.rate : ''}</td>
            <td className="is-num">{row.hours != null && row.hours !== '' ? row.hours : ''}</td>
            <td className="is-num">{row.amount == null ? '' : money(row.amount)}</td>
          </tr>
        ))}
        <tr className="is-total">
          <td className="is-label">Total</td>
          <td />
          <td />
          <td className="is-num">{money(gross)}</td>
        </tr>
      </tbody>
    </table>
  )
}

function DeductionsTable({ padDed, money, dedTotal, invoiceMode }) {
  return (
    <table className="sd-payslip__grid is-ded">
      <thead>
        <tr>
          <th>Deductions</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        {invoiceMode ? (
          <tr>
            <td colSpan={2} className="is-empty">No statutory deductions (invoice contract)</td>
          </tr>
        ) : (
          padDed.map((row, i) => (
            <tr key={`d-${i}`}>
              <td className="is-label">{row.label || '\u00A0'}</td>
              <td className="is-num">{row.amount == null ? '' : money(row.amount)}</td>
            </tr>
          ))
        )}
        <tr className="is-total">
          <td className="is-label">Total</td>
          <td className="is-num">{money(dedTotal)}</td>
        </tr>
      </tbody>
    </table>
  )
}

function SummaryBox({ money, gross, dedTotal, net }) {
  return (
    <div className="sd-payslip__summary">
      <table>
        <tbody>
          <tr>
            <th>Total Earnings</th>
            <td>{money(gross)}</td>
          </tr>
          <tr>
            <th>Total Deductions</th>
            <td>{money(dedTotal)}</td>
          </tr>
          <tr className="is-net">
            <th>Net pay</th>
            <td>{money(net)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

/** Demo rows matching the corporate pay-stub reference (Assets gallery / editor). */
export const PAYSLIP_DEMO = {
  employee: {
    name: 'James William Patrick',
    employeeId: 'ID_145546',
  },
  periodEnding: 'December 2023',
  payDate: '2023-12-31',
  earnings: [
    { label: 'Regular Pay', rate: '$80.00', hours: '160.00', amount: 12800 },
    { label: 'Overtime Pay', rate: '$100.00', hours: '10.00', amount: 1000 },
    { label: 'Holiday Pay', rate: '$120.00', hours: '1.00', amount: 120 },
    { label: 'Vacation Pay', rate: '$150.00', hours: '2.00', amount: 300 },
    { label: 'Others', rate: '', hours: '', amount: 1000 },
  ],
  deductions: [
    { label: 'Income Tax', amount: 500 },
    { label: 'Federal Tax', amount: 20 },
    { label: 'Medical', amount: 50 },
    { label: 'Life Insurance', amount: 100 },
    { label: 'Provident Fund', amount: 300 },
  ],
}

/**
 * Printable Employee Pay Stub — classic layout matches corporate reference 100%.
 * Company block auto-fills from Settings agency profile when provided.
 */
export default function PayslipStub({
  company,
  employee,
  periodLabel,
  payDate,
  periodEnding,
  earnings = [],
  deductions = [],
  currency = 'USD',
  invoiceMode = false,
  variant = 'classic',
  demo = false,
  className,
}) {
  const money = (n, opts) => formatMoney(n, currency, opts)
  const logo = agencyLogoSrc(company) || company?.logo || null

  const emp = demo ? { ...PAYSLIP_DEMO.employee, ...employee } : employee
  const earnSrc = demo && !earnings.length ? PAYSLIP_DEMO.earnings : earnings
  const dedSrc = demo && !deductions.length ? PAYSLIP_DEMO.deductions : deductions
  const ending = demo && !periodEnding && !periodLabel ? PAYSLIP_DEMO.periodEnding : (periodEnding || periodLabel)
  const payMonth = formatPayMonth(ending)
  const paidOn = demo && !payDate ? PAYSLIP_DEMO.payDate : payDate

  const brand = {
    name: company?.name || company?.company_name || 'Sparkdraw',
    address: company?.address || '42 Galle Road, Colombo 03, Sri Lanka',
    phone: company?.phone || '+94 11 234 5678',
    email: company?.email || 'hello@sparkdraw.com',
    website: company?.website || 'www.sparkdraw.com',
  }

  const gross = earnSrc.reduce((s, e) => s + Number(e.amount || 0), 0)
  const dedTotal = invoiceMode ? 0 : dedSrc.reduce((s, d) => s + Number(d.amount || 0), 0)
  const net = Math.max(0, gross - dedTotal)
  const title = invoiceMode ? 'INVOICE PAYMENT' : 'EMPLOYEE PAY STUB'
  const style = ['classic', 'modern', 'minimal'].includes(variant) ? variant : 'classic'

  const earningRows = earnSrc.length
    ? earnSrc
    : [{ label: invoiceMode ? 'Invoice total' : 'Basic salary', rate: '', hours: '', amount: 0 }]
  const deductionRows = invoiceMode
    ? []
    : (dedSrc.length ? dedSrc : [{ label: '—', amount: 0 }])

  const maxRows = Math.max(earningRows.length, deductionRows.length, 5)
  const padEarn = [...earningRows]
  const padDed = [...deductionRows]
  while (padEarn.length < maxRows) padEarn.push({ label: '', rate: '', hours: '', amount: null })
  while (padDed.length < maxRows) padDed.push({ label: '', amount: null })

  if (style === 'modern') {
    return (
      <div className={cn('sd-payslip is-modern', className)}>
        <div className="sd-payslip__banner">
          <CompanyBlock company={brand} logo={logo} compact />
          <div className="sd-payslip__banner-title">
            <h2>{title}</h2>
            <p>Pay month · {payMonth}</p>
          </div>
        </div>
        <div className="sd-payslip__meta is-modern-meta">
          <div className="sd-payslip__chips">
            <div><span>Employee</span><strong>{emp?.name || '—'}</strong></div>
            <div><span>Employee ID</span><strong>{emp?.employeeId || '—'}</strong></div>
            <div><span>Pay month</span><strong>{payMonth}</strong></div>
            <div><span>Pay date</span><strong>{fmtDate(paidOn)}</strong></div>
          </div>
        </div>
        <div className="sd-payslip__tables">
          <EarningsTable padEarn={padEarn} money={money} gross={gross} />
          <DeductionsTable padDed={padDed} money={money} dedTotal={dedTotal} invoiceMode={invoiceMode} />
        </div>
        <SummaryBox money={money} gross={gross} dedTotal={dedTotal} net={net} />
      </div>
    )
  }

  if (style === 'minimal') {
    return (
      <div className={cn('sd-payslip is-minimal', className)}>
        <div className="sd-payslip__minimal-head">
          <CompanyBlock company={brand} logo={logo} compact />
          <div className="sd-payslip__minimal-title">
            <h2>{title}</h2>
            <p>Pay month {payMonth} · Pay date {fmtDate(paidOn)}</p>
          </div>
        </div>
        <div className="sd-payslip__minimal-meta">
          <span><em>Employee</em> {emp?.name || '—'}</span>
          <span><em>ID</em> {emp?.employeeId || '—'}</span>
          <span><em>Pay month</em> {payMonth}</span>
        </div>
        <div className="sd-payslip__tables is-stacked">
          <EarningsTable padEarn={padEarn} money={money} gross={gross} />
          <DeductionsTable padDed={padDed} money={money} dedTotal={dedTotal} invoiceMode={invoiceMode} />
        </div>
        <SummaryBox money={money} gross={gross} dedTotal={dedTotal} net={net} />
      </div>
    )
  }

  /* Default — corporate reference layout */
  return (
    <div className={cn('sd-payslip is-classic', className)}>
      <div className="sd-payslip__top">
        <CompanyBlock company={brand} logo={logo} />
        <div className="sd-payslip__title-block">
          <h2>{title}</h2>
          <div className="sd-payslip__title-rule" />
        </div>
      </div>

      <div className="sd-payslip__meta">
        <table className="sd-payslip__info">
          <tbody>
            <tr>
              <th>Employee Name</th>
              <td>{emp?.name || '—'}</td>
            </tr>
            <tr>
              <th>Employee ID</th>
              <td>{emp?.employeeId || '—'}</td>
            </tr>
            <tr>
              <th>Pay Month</th>
              <td>{payMonth}</td>
            </tr>
          </tbody>
        </table>

        <div className="sd-payslip__paydate">
          <span>Pay Date</span>
          <strong>{fmtDate(paidOn)}</strong>
        </div>
      </div>

      <div className="sd-payslip__tables">
        <EarningsTable padEarn={padEarn} money={money} gross={gross} />
        <DeductionsTable padDed={padDed} money={money} dedTotal={dedTotal} invoiceMode={invoiceMode} />
      </div>
      <SummaryBox money={money} gross={gross} dedTotal={dedTotal} net={net} />
    </div>
  )
}
