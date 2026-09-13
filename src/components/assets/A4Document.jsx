import { cn } from '@/lib/utils'
import PayslipStub from '@/components/team-portal/PayslipStub'

/**
 * True A4 HTML document — invoice-app sizing + Overleaf LaTeX preview model.
 */
export default function A4Document({
  layout = 'letter-formal',
  company = {},
  accent = '#2563eb',
  titleFont = 'Georgia, serif',
  bodyFont = 'Inter, sans-serif',
  letterBody,
  latex = null,
  invoice = null,
  className,
  pageRef,
}) {
  const name = latex?.agency || latex?.who || company.name || 'Your Agency'
  const address = [latex?.address, latex?.cityZip].filter(Boolean).join(', ') || company.address || 'Address line'
  const email = latex?.email || company.email || 'hello@agency.com'
  const phone = latex?.phone || company.phone || '—'
  const website = latex?.url || company.website || 'www.agency.com'
  const logo = latex?.logo || company.logo
  const resolvedAccent = latex?.accent || accent
  const body = latex
    ? [latex.opening, '', latex.body].filter((x) => x != null).join('\n')
    : (letterBody || 'Dear Recipient,\n\nEdit the LaTeX source and click Recompile.')

  const common = {
    name,
    address,
    email,
    phone,
    website,
    logo,
    accent: resolvedAccent,
    titleFont,
    bodyFont,
    body,
    latex,
    invoice,
  }

  const resolvedLayout = latex?.layoutHint || layout
  const useBerkeley = Boolean(latex) && (
    resolvedLayout === 'letter-berkeley'
    || resolvedLayout.startsWith('letter')
    || resolvedLayout.startsWith('offer')
    || !/^(payslip|contract|invoice|cert)/.test(resolvedLayout)
  )

  let page = null
  if (useBerkeley) page = <BerkeleyLetterLayout {...common} />
  else if (resolvedLayout.startsWith('payslip')) page = <PayslipLayout layout={resolvedLayout} {...common} />
  else if (resolvedLayout.startsWith('letter')) page = <LetterLayout layout={resolvedLayout} {...common} />
  else if (resolvedLayout.startsWith('contract')) page = <ContractLayout layout={resolvedLayout} {...common} />
  else if (resolvedLayout.startsWith('invoice')) page = <InvoiceLayout layout={resolvedLayout} {...common} />
  else if (resolvedLayout.startsWith('cert')) page = <CertLayout layout={resolvedLayout} {...common} />
  else if (resolvedLayout.startsWith('offer')) page = <OfferLayout layout={resolvedLayout} {...common} />
  else page = <LetterLayout layout="letter-formal" {...common} />

  return (
    <div
      ref={pageRef}
      className={cn('sd-a4-doc', className)}
      style={{ width: '210mm', height: '297mm', ['--a4-accent']: resolvedAccent }}
    >
      {page}
    </div>
  )
}

function Logo({ logo, accent, size = 56 }) {
  if (logo) {
    return <img src={logo} alt="" className="sd-a4-doc__logo-img" style={{ width: size, height: size }} crossOrigin="anonymous" />
  }
  return (
    <span className="sd-a4-doc__logo-mark" style={{ width: size, height: size, background: accent }}>
      A
    </span>
  )
}

/** Overleaf / Berkeley-style banner letterhead preview */
function BerkeleyLetterLayout({
  name, address, email, phone, website, logo, accent, titleFont, bodyFont, latex,
}) {
  const who = latex?.who || name
  const title = latex?.title || ''
  const where = latex?.where || name
  const mobile = latex?.mobile || ''
  const recipient = latex?.recipient || ''
  const opening = latex?.opening || 'Dear Recipient,'
  const closing = latex?.closing || 'Sincerely,'
  const bodyParas = String(latex?.body || '').split(/\n+/).filter(Boolean)
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="sd-a4-doc__inner is-berkeley" style={{ fontFamily: bodyFont, paddingTop: 0 }}>
      <header className="sd-a4-doc__berkeley-banner" style={{ backgroundColor: accent }}>
        <div className="sd-a4-doc__berkeley-brand">
          <Logo logo={logo} accent="#fff" size={52} />
          <div>
            <strong style={{ fontFamily: titleFont }}>{(latex?.agency || name).toUpperCase()}</strong>
            <em>Agency stationery</em>
          </div>
        </div>
        <div className="sd-a4-doc__berkeley-cols">
          <div>
            <strong>{who}</strong>
            {title ? <span>{title}</span> : null}
            {where ? <span>{where}</span> : null}
          </div>
          <div>
            {address ? <span>{address}</span> : null}
            {phone ? <span>{phone}</span> : null}
            {mobile ? <span>{mobile}</span> : null}
            {email ? <span>{email}</span> : null}
            {website ? <span>{website}</span> : null}
          </div>
        </div>
      </header>

      <div className="sd-a4-doc__berkeley-body">
        <p className="sd-a4-doc__berkeley-date">{today}</p>
        {recipient ? (
          <pre className="sd-a4-doc__berkeley-recipient">{recipient}</pre>
        ) : null}
        <p className="sd-a4-doc__berkeley-opening">{opening}</p>
        {bodyParas.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
        <div className="sd-a4-doc__berkeley-close">
          <p>{closing}</p>
          <p className="sd-a4-doc__berkeley-sign">{who}</p>
        </div>
        {latex?.ps ? <p className="is-muted">{latex.ps}</p> : null}
        {latex?.cc ? <p className="is-muted">cc: {latex.cc}</p> : null}
        {latex?.encl ? <p className="is-muted">encl: {latex.encl}</p> : null}
      </div>
    </div>
  )
}


function PayslipLayout({ layout, name, address, email, phone, website, logo, bodyFont }) {
  const variant = layout === 'payslip-modern' ? 'modern' : layout === 'payslip-minimal' ? 'minimal' : 'classic'
  return (
    <div className="sd-a4-doc__payslip-wrap" style={{ fontFamily: bodyFont }}>
      <PayslipStub
        demo
        variant={variant}
        company={{ name, address, email, phone, website, logo }}
        currency="USD"
      />
    </div>
  )
}

function LetterLayout({ layout, logo, accent, titleFont, bodyFont }) {
  if (layout.startsWith('letter-corporate') || layout === 'letter-formal' || layout === 'letter-banner' || layout === 'letter-rail') {
    const palette = layout === 'letter-corporate-teal'
      ? { primary: '#0f766e', mid: '#14b8a6', light: '#5eead4', deep: '#115e59' }
      : layout === 'letter-corporate-ink'
        ? { primary: '#1e3a8a', mid: '#2563eb', light: '#60a5fa', deep: '#0f172a' }
        : { primary: accent && accent !== '#2563eb' ? accent : '#c62828', mid: '#e53935', light: '#ef9a9a', deep: '#8e0000' }

    return (
      <CorporateLetterhead
        logo={logo}
        palette={palette}
        bodyFont={bodyFont}
        titleFont={titleFont}
      />
    )
  }

  return (
    <CorporateLetterhead
      logo={logo}
      palette={{ primary: '#c62828', mid: '#e53935', light: '#ef9a9a', deep: '#8e0000' }}
      bodyFont={bodyFont}
      titleFont={titleFont}
    />
  )
}

/** Exact corporate letterhead — header/footer only, empty letter area (no body content). */
function CorporateLetterhead({
  logo,
  palette,
  bodyFont,
}) {
  const brand = 'Sparkdraw'
  const tagline = 'Client-relationship intelligence'
  const contactName = 'Kaveesha Wijesiriwardana'
  const contactTitle = 'Agency Director'
  const displayPhone = '+94 11 234 5678'
  const displayWeb = 'www.sparkdraw.com'
  const displayEmail = 'hello@sparkdraw.com'
  const displayAddr = '42 Galle Road, Colombo 03, Sri Lanka'
  const addrLines = displayAddr.split(',').map((s) => s.trim()).filter(Boolean)
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).replace(/ /g, '-')
  const signName = 'Alex Rivera'
  const signTitle = 'Creative Lead'
  const { primary, mid, light, deep } = palette

  return (
    <div className="sd-lh" style={{ fontFamily: bodyFont, ['--lh']: primary, ['--lh-mid']: mid, ['--lh-light']: light, ['--lh-deep']: deep }}>
      <div className="sd-lh__top-bar" aria-hidden>
        <span style={{ background: light }} />
        <span style={{ background: mid }} />
        <span style={{ background: deep }} />
      </div>

      <header className="sd-lh__brand">
        <div className="sd-lh__logo-wrap">
          {logo ? (
            <img src={logo} alt="" className="sd-lh__logo" crossOrigin="anonymous" />
          ) : (
            <span className="sd-lh__logo-fallback" style={{ background: primary }} aria-hidden>
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#fff" strokeWidth="2">
                <path d="M8 7h3v10H8zM13 7h3v10h-3z" />
                <path d="M7 9h10M7 15h10" />
              </svg>
            </span>
          )}
        </div>
        <div>
          <strong className="sd-lh__company">{brand.toUpperCase()}</strong>
          <p className="sd-lh__tagline">{tagline.toUpperCase()}</p>
        </div>
      </header>

      <div className="sd-lh__meta">
        <div className="sd-lh__sender">
          <strong>{contactName.toUpperCase()}</strong>
          <em>{contactTitle.toUpperCase()}</em>
          <div className="sd-lh__facts">
            <p><span>PHONE :</span> {displayPhone}</p>
            <p><span>WEB :</span> {displayWeb}</p>
            <p>
              <span>ADDR :</span>
              {' '}
              {addrLines.length > 1 ? (
                <>
                  {addrLines.slice(0, -1).join(', ').toUpperCase()}
                  <br />
                  {addrLines[addrLines.length - 1].toUpperCase()}
                </>
              ) : displayAddr.toUpperCase()}
            </p>
          </div>
        </div>
        <div className="sd-lh__date">
          <span>DATE :</span> {dateStr}
        </div>
      </div>

      {/* Empty letter area — stationery only */}
      <div className="sd-lh__blank" aria-hidden />

      <div className="sd-lh__sign">
        <p className="sd-lh__sign-script">{signName}</p>
        <strong style={{ color: primary }}>{signName.toUpperCase()}</strong>
        <em>{signTitle.toUpperCase()}</em>
      </div>

      <footer className="sd-lh__footer">
        <div className="sd-lh__foot-col">
          <span className="sd-lh__icon" style={{ color: primary }} aria-hidden>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.2 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1L6.6 10.8z" /></svg>
          </span>
          <p>{displayPhone}</p>
          <p>+94 77 123 4567</p>
        </div>
        <div className="sd-lh__foot-col">
          <span className="sd-lh__icon" style={{ color: primary }} aria-hidden>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm7.9 9h-3.2a15 15 0 00-1.3-5 8 8 0 014.5 5zM12 4c.9 1.3 1.7 3.4 2.1 7H9.9C10.3 7.4 11.1 5.3 12 4zM4.1 11h3.2a15 15 0 011.3-5 8 8 0 00-4.5 5zm0 2a8 8 0 004.5 5 15 15 0 01-1.3-5H4.1zm5.8 0h4.2c-.4 3.6-1.2 5.7-2.1 7-.9-1.3-1.7-3.4-2.1-7zm5.5 5a15 15 0 001.3-5h3.2a8 8 0 01-4.5 5z" /></svg>
          </span>
          <p>{displayWeb}</p>
          <p>{displayEmail}</p>
        </div>
        <div className="sd-lh__foot-col">
          <span className="sd-lh__icon" style={{ color: primary }} aria-hidden>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1112 6a2.5 2.5 0 010 5.5z" /></svg>
          </span>
          {addrLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </footer>

      <div className="sd-lh__bottom-bar" aria-hidden>
        <span style={{ background: light }} />
        <span style={{ background: mid }} />
        <span style={{ background: primary }} />
        <span style={{ background: deep }} />
      </div>
    </div>
  )
}

function ContractLayout({ layout, name, address, email, phone, logo, accent, titleFont, bodyFont }) {
  const title = layout === 'contract-nda' ? 'NON-DISCLOSURE AGREEMENT' : layout === 'contract-sow' ? 'SCOPE OF WORK' : 'EMPLOYMENT AGREEMENT'
  return (
    <div className="sd-a4-doc__inner is-contract" style={{ fontFamily: bodyFont }}>
      <header className="sd-a4-doc__row is-between">
        <Logo logo={logo} accent={accent} size={40} />
        <strong style={{ fontFamily: titleFont, color: accent }}>{title}</strong>
      </header>
      <p className="is-muted">{name} · {address} · {email} · {phone}</p>
      <section>
        <h4 style={{ color: accent }}>1. Parties</h4>
        <p>This agreement is entered into by {name} and the Client.</p>
        <h4 style={{ color: accent }}>2. Terms</h4>
        <p>Services, timelines, and payment terms are defined herein.</p>
        <h4 style={{ color: accent }}>3. Signatures</h4>
        <div className="sd-a4-doc__signs"><span /><span /></div>
      </section>
    </div>
  )
}

function formatMoney(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function InvoiceLayout({ layout, name, address, email, phone, website, logo, accent, titleFont, bodyFont, invoice }) {
  const number = invoice?.invoice_number || 'INV-0100'
  const date = invoice?.issue_date || invoice?.created_at
    ? new Date(invoice.issue_date || invoice.created_at).toLocaleDateString('en-GB')
    : '—'
  const due = invoice?.due_date
    ? new Date(`${invoice.due_date}T00:00:00`).toLocaleDateString('en-GB')
    : '—'
  const billToName = invoice?.client_name || invoice?.client?.company_name || 'Client name'
  const billToContact = invoice?.client?.contact_name || invoice?.client?.contact_email || 'Client address'
  const lines = Array.isArray(invoice?.line_items) && invoice.line_items.length
    ? invoice.line_items
    : [
        { description: 'Service line', quantity: 1, rate: null, amount: null },
        { description: 'Additional line', quantity: 1, rate: null, amount: null },
      ]
  const subtotal = invoice?.subtotal != null
    ? invoice.subtotal
    : lines.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
  const tax = invoice?.tax != null ? Number(invoice.tax) : 0
  const total = invoice?.total ?? invoice?.amount ?? subtotal + tax
  const notes = invoice?.notes || null

  return (
    <div className="sd-a4-doc__inner is-invoice" style={{ fontFamily: bodyFont }}>
      <header className="sd-a4-doc__row is-between" style={{ borderBottom: `2px solid ${accent}`, paddingBottom: 16 }}>
        <Logo logo={logo} accent={accent} size={layout === 'invoice-compact' ? 48 : 72} />
        <div className="sd-a4-doc__title-block" style={{ textAlign: 'right' }}>
          <strong style={{ fontFamily: titleFont, color: accent, fontSize: layout === 'invoice-detailed' ? 28 : 32 }}>
            INVOICE
          </strong>
          <p>No: {number}</p>
          <p>Date: {date}</p>
          {invoice?.due_date ? <p>Due: {due}</p> : null}
        </div>
      </header>
      <div className="sd-a4-doc__split" style={{ marginTop: 20 }}>
        <div>
          <h4 className="is-muted">From</h4>
          <strong>{name}</strong>
          <p>{address}</p>
          <p>{email}</p>
          <p>{phone}</p>
        </div>
        <div>
          <h4 className="is-muted">Bill to</h4>
          <strong>{billToName}</strong>
          <p>{billToContact}</p>
          {invoice?.project_name || invoice?.project?.name ? (
            <p>Project: {invoice.project_name || invoice.project?.name}</p>
          ) : null}
        </div>
      </div>
      <table className="sd-a4-doc__table">
        <thead>
          <tr style={{ background: accent, color: '#fff' }}>
            <th>Item</th>
            <th>Qty</th>
            <th>Rate</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((row, i) => (
            <tr key={`${row.description}-${i}`} className={i % 2 ? 'is-alt' : undefined}>
              <td>{row.description || '—'}</td>
              <td>{row.quantity ?? '—'}</td>
              <td>{row.rate == null ? '—' : formatMoney(row.rate)}</td>
              <td>{row.amount == null ? '—' : formatMoney(row.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="sd-a4-doc__totals">
        <p>Subtotal: {formatMoney(subtotal)}</p>
        {layout === 'invoice-detailed' && <p>Tax: {formatMoney(tax)}</p>}
        <div className="sd-a4-doc__net" style={{ background: accent }}>
          Grand total {formatMoney(total)}
        </div>
      </div>
      {layout === 'invoice-detailed' && notes ? (
        <p style={{ marginTop: 16, fontSize: 12 }}><strong>Notes:</strong> {notes}</p>
      ) : null}
      {layout !== 'invoice-compact' && (
        <p className="is-muted" style={{ marginTop: 24 }}>{website} · Thank you for your business</p>
      )}
    </div>
  )
}

function CertLayout({ layout, name, logo, accent, titleFont, bodyFont }) {
  const title = layout === 'cert-warm' ? 'Certificate of Appreciation' : layout === 'cert-clean' ? 'Certificate of Completion' : 'Certificate of Achievement'
  return (
    <div className="sd-a4-doc__inner is-cert" style={{ fontFamily: bodyFont, borderColor: accent }}>
      <Logo logo={logo} accent={accent} size={48} />
      <strong style={{ fontFamily: titleFont, color: accent, fontSize: 26 }}>{title}</strong>
      <p>Presented to</p>
      <em style={{ fontFamily: titleFont, fontSize: 28 }}>Employee Name</em>
      <p>{name}</p>
      <div className="sd-a4-doc__signs"><span /><span /></div>
    </div>
  )
}

function OfferLayout({ layout, name, address, email, phone, logo, accent, titleFont, bodyFont, body }) {
  return (
    <div className="sd-a4-doc__inner is-offer" style={{ fontFamily: bodyFont }}>
      <header className="sd-a4-doc__row">
        <Logo logo={logo} accent={accent} size={44} />
        <div>
          <strong style={{ fontFamily: titleFont, color: accent }}>{name}</strong>
          <p className="is-muted">{address} · {phone} · {email}</p>
        </div>
      </header>
      <h3 style={{ fontFamily: titleFont }}>{layout === 'offer-brief' ? 'Appointment confirmation' : 'Offer of employment'}</h3>
      {layout === 'offer-modern' && (
        <div className="sd-a4-doc__chips">
          <span>Role</span>
          <span>Start date</span>
          <span>Salary</span>
          <span>Location</span>
        </div>
      )}
      <div className="sd-a4-doc__letter-body">
        {String(body).split('\n').map((line, i) => <p key={i}>{line || '\u00A0'}</p>)}
      </div>
      <footer className="sd-a4-doc__sign">Yours sincerely,<br />{name}</footer>
    </div>
  )
}
