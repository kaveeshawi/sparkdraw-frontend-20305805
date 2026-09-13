/**
 * Default LaTeX sources for document templates (Overleaf-style editing).
 * Preview is HTML A4 compiled from macros — not a full TeX engine.
 */

function esc(s = '') {
  return String(s).replace(/[{}%\\]/g, '')
}

export function buildLetterheadLatex({
  who = 'Firstname Lastname',
  title = 'Title',
  where = 'Department',
  address = 'Address',
  cityZip = 'City, Country',
  email = 'hello@agency.com',
  phone = 'Phone: +94 00 000 0000',
  mobile = 'Mobile: +94 00 000 0000',
  url = 'https://agency.com',
  recipient = 'Recipient name \\\\ Street\\\\ City\\\\ Country \\\\ \\medskip Re:',
  opening = 'Dear Professor Recipient Name,',
  agency = 'Sparkdraw Agency',
} = {}) {
  return `%%
% ${esc(agency)} Modern Letterhead
% Sparkdraw LaTeX Template (Overleaf-style)
% Adapted from UC Berkeley stationery layout patterns
%%

\\documentclass[12pt,a4paper]{letter}
\\usepackage{graphicx}
\\usepackage{geometry}
\\usepackage{fancyhdr}
\\usepackage{xcolor}
\\usepackage{lastpage}
\\pagestyle{fancy}
\\renewcommand{\\headrulewidth}{0pt}
\\fancyhead{}
\\lfoot{\\footnotesize {\\textit{Letter from \\Who{} }}}
\\cfoot{}
\\rfoot{\\footnotesize Page \\thepage\\ of \\pageref{LastPage}}
\\renewcommand{\\footrulewidth}{0pt}

% Sender Information -- Edit these macros; Recompile to update the preview
\\def\\Who{${esc(who)}}
\\def\\Title{${esc(title)}}
\\def\\Where{${esc(where)}}
\\def\\Address{${esc(address)}}
\\def\\CityZip{${esc(cityZip)}}
\\def\\Email{E-mail: ${esc(email)}}
\\def\\TEL{${esc(phone)}}
\\def\\TELM{${esc(mobile)}}
\\def\\URL{${esc(url)}}
\\def\\Agency{${esc(agency)}}
\\def\\Accent{003262}

\\topmargin=-1.1in
\\textheight=9.5in
\\oddsidemargin=-10pt
\\textwidth=7in
\\let\\raggedleft\\raggedright

\\begin{document}

\\begin{letter}{${recipient}}

% Header band (preview renders as branded A4 banner)
\\begin{center}
\\begin{picture}(1000,1)
    \\put(0,-50){\\includegraphics[width=\\textwidth]{header-banner.png}}
    \\textcolor{white}{
    \\put(190,12){\\textbf{\\footnotesize \\Who{}}}
    \\put(190,2){\\footnotesize \\Title{}}
    \\put(190,-8){\\footnotesize \\Where{}}
    \\put(320,12){\\footnotesize \\Address{}}
    \\put(320,2){\\footnotesize \\TEL{}}
    \\put(320,-8){\\footnotesize \\TELM{}}
    \\put(320,-18){\\footnotesize \\Email{}}
    \\put(320,-28){\\footnotesize \\URL{}}}
\\end{picture}
\\end{center}
\\vspace{16mm}

\\opening{${esc(opening)}}

Replace these contents with your own!

Write your letter body here. Use blank lines for paragraphs.

You can keep editing the macros above (\\\\Who, \\\\Title, \\\\Address, …)
and click Recompile — the live A4 preview updates like Overleaf.

\\closing{Sincerely,}
\\Who{}

\\ps{P.S. Looking forward to working together.}

\\cc{Carbon Copy 1\\\\Carbon Copy 2}

\\encl{Memorandum}

\\end{letter}

\\end{document}
`
}

export function buildPayslipLatex({ agency = 'Sparkdraw Agency', accent = '1a4d4e' } = {}) {
  return `%% Sparkdraw Payslip (header editable via macros)
\\documentclass[11pt,a4paper]{article}
\\def\\Agency{${esc(agency)}}
\\def\\Accent{${esc(accent.replace('#', ''))}}
\\def\\Address{Agency address}
\\def\\Email{payroll@agency.com}
\\def\\TEL{Phone}
\\begin{document}
\\textbf{EMPLOYEE PAY STUB}\\\\
\\Agency{} — earnings and deductions fill from Team Portal payroll.
\\end{document}
`
}

export function buildGenericLatex(kind, { agency = 'Sparkdraw Agency' } = {}) {
  const title = {
    contract: 'Service Agreement',
    invoice: 'TAX INVOICE',
    certificate: 'Certificate of Achievement',
    offer_letter: 'Offer of Employment',
  }[kind] || 'Document'
  return `%% Sparkdraw ${title}
\\documentclass[11pt,a4paper]{article}
\\def\\Who{Author Name}
\\def\\Title{${title}}
\\def\\Where{Department}
\\def\\Address{Address}
\\def\\CityZip{City}
\\def\\Email{hello@agency.com}
\\def\\TEL{Phone}
\\def\\URL{https://agency.com}
\\def\\Agency{${esc(agency)}}
\\def\\Accent{2563eb}
\\begin{document}
\\opening{Dear Recipient,}

Edit this LaTeX source on the left. Click Recompile to refresh the A4 preview.

\\closing{Sincerely,}
\\Who{}
\\end{document}
`
}

/** Starter LaTeX for a template category + layout. */
export function getDefaultLatex(categoryId, layout, company = {}) {
  const agency = company.name || 'Sparkdraw Agency'
  const base = {
    who: company.contactName || company.name || 'Firstname Lastname',
    title: company.title || 'Project Manager',
    where: company.department || agency,
    address: company.address || 'Address',
    cityZip: company.cityZip || 'City, Country',
    email: (company.email || 'hello@agency.com').replace(/^E-mail:\s*/i, ''),
    phone: company.phone?.startsWith('Phone') ? company.phone : `Phone: ${company.phone || '—'}`,
    mobile: company.mobile || 'Mobile: —',
    url: company.website || 'https://agency.com',
    agency,
  }

  if (categoryId === 'payslip' || String(layout).startsWith('payslip')) {
    return buildPayslipLatex({ agency, accent: company.accent })
  }
  if (categoryId === 'letterhead' || String(layout).startsWith('letter')) {
    return buildLetterheadLatex(base)
  }
  if (categoryId === 'offer_letter' || String(layout).startsWith('offer')) {
    return buildLetterheadLatex({
      ...base,
      opening: 'Dear Candidate,',
      recipient: 'Candidate name \\\\ Address \\\\ City \\\\ \\medskip Re: Offer of employment',
    })
  }
  return buildGenericLatex(categoryId, { agency })
}
