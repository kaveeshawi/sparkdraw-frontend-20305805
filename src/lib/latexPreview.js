/**
 * Lightweight LaTeX → preview model for Sparkdraw (Overleaf-like UX).
 * Supports sender \\def macros, letter env, opening/closing/body — not full TeX.
 */

function stripComments(src) {
  return String(src || '')
    .split('\n')
    .map((line) => {
      const i = line.indexOf('%')
      if (i === -1) return line
      // keep \% 
      let out = ''
      for (let j = 0; j < line.length; j += 1) {
        if (line[j] === '%' && line[j - 1] !== '\\') {
          break
        }
        out += line[j]
      }
      return out
    })
    .join('\n')
}

/** Extract balanced {...} starting at openBraceIndex. */
function extractBraceGroup(src, openBraceIndex) {
  if (src[openBraceIndex] !== '{') return null
  let depth = 0
  for (let i = openBraceIndex; i < src.length; i += 1) {
    const ch = src[i]
    if (ch === '\\') {
      i += 1
      continue
    }
    if (ch === '{') depth += 1
    else if (ch === '}') {
      depth -= 1
      if (depth === 0) return src.slice(openBraceIndex + 1, i)
    }
  }
  return null
}

function findCommandArg(src, command) {
  const re = new RegExp(`\\\\${command}\\s*\\{`)
  const m = re.exec(src)
  if (!m) return null
  return extractBraceGroup(src, m.index + m[0].length - 1)
}

function findAllDefs(src) {
  const defs = {}
  const re = /\\def\\([A-Za-z]+)\s*\{/g
  let m
  while ((m = re.exec(src))) {
    const name = m[1]
    const body = extractBraceGroup(src, m.index + m[0].length - 1)
    if (body != null) defs[name] = body.trim()
  }
  return defs
}

function expandMacros(text, defs, depth = 0) {
  if (!text || depth > 8) return text || ''
  return text.replace(/\\([A-Za-z]+)(\{\})?/g, (full, name) => {
    if (defs[name] != null) return expandMacros(defs[name], defs, depth + 1)
    return full
  })
}

function latexInlineToText(raw) {
  return String(raw || '')
    .replace(/\\\\/g, '\n')
    .replace(/\\medskip/g, '\n')
    .replace(/\\textbf\{([^}]*)\}/g, '$1')
    .replace(/\\textit\{([^}]*)\}/g, '$1')
    .replace(/\\emph\{([^}]*)\}/g, '$1')
    .replace(/\\&/g, '&')
    .replace(/\\%/g, '%')
    .replace(/\\\$/g, '$')
    .replace(/~/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function extractLetterBody(src) {
  const openingMatch = /\\opening\s*\{/.exec(src)
  if (!openingMatch) {
    const beginDoc = src.indexOf('\\begin{document}')
    const endDoc = src.indexOf('\\end{document}')
    if (beginDoc >= 0) {
      return src.slice(beginDoc + '\\begin{document}'.length, endDoc >= 0 ? endDoc : undefined)
    }
    return ''
  }
  const openArgEnd = (() => {
    const start = openingMatch.index + openingMatch[0].length - 1
    const inner = extractBraceGroup(src, start)
    return start + 1 + (inner?.length || 0) + 1
  })()

  const endMarkers = [
    /\\closing\s*\{/,
    /\\newpage/,
    /\\end\{letter\}/,
    /\\end\{document\}/,
  ]
  let end = src.length
  for (const re of endMarkers) {
    re.lastIndex = openArgEnd
    const m = re.exec(src)
    if (m && m.index < end) end = m.index
  }
  return src.slice(openArgEnd, end)
}

function cleanBodyLatex(body) {
  return body
    .replace(/\\lipsum(\[[^\]]*\])?/g, '')
    .replace(/\\begin\{itemize\}[\s\S]*?\\end\{itemize\}/g, (block) => {
      const items = [...block.matchAll(/\\item\s+([^\n\\]+)/g)].map((m) => `• ${m[1].trim()}`)
      return `\n${items.join('\n')}\n`
    })
    .replace(/\\begin\{enumerate\}[\s\S]*?\\end\{enumerate\}/g, (block) => {
      let n = 0
      const items = [...block.matchAll(/\\item\s+([^\n\\]+)/g)].map((m) => {
        n += 1
        return `${n}. ${m[1].trim()}`
      })
      return `\n${items.join('\n')}\n`
    })
    .replace(/\\begin\{quotation\}([\s\S]*?)\\end\{quotation\}/g, '\n$1\n')
    .replace(/\\begin\{verse\}([\s\S]*?)\\end\{verse\}/g, '\n$1\n')
    .replace(/\\textbf\{([^}]*)\}/g, '$1')
    .replace(/\\textit\{([^}]*)\}/g, '$1')
    .replace(/\\[A-Za-z]+(\[[^\]]*\])?(\{[^}]*\})?/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * @returns {{
 *  who, title, where, address, cityZip, email, phone, mobile, url, agency, accent,
 *  recipient, opening, closing, body, ps, cc, encl, layoutHint
 * }}
 */
export function compileLatexPreview(latexSource, fallback = {}) {
  const src = stripComments(latexSource)
  const defs = findAllDefs(src)

  const get = (key, alt) => {
    const raw = defs[key]
    if (raw == null || raw === '') return alt
    return latexInlineToText(expandMacros(raw, defs))
  }

  const accentHex = (defs.Accent || fallback.accent || '003262').replace(/^#/, '')
  const accent = `#${accentHex}`

  // letter env: \begin{letter}{...}
  let recipient = fallback.recipient || ''
  const letterEnv = /\\begin\{letter\}\s*\{/.exec(src)
  if (letterEnv) {
    const arg = extractBraceGroup(src, letterEnv.index + letterEnv[0].length - 1)
    recipient = latexInlineToText(expandMacros(arg || '', defs))
  }

  const opening = latexInlineToText(expandMacros(findCommandArg(src, 'opening') || fallback.opening || 'Dear Recipient,', defs))
  const closing = latexInlineToText(expandMacros(findCommandArg(src, 'closing') || 'Sincerely,', defs))
  const ps = latexInlineToText(expandMacros(findCommandArg(src, 'ps') || '', defs))
  const cc = latexInlineToText(expandMacros(findCommandArg(src, 'cc') || '', defs))
  const encl = latexInlineToText(expandMacros(findCommandArg(src, 'encl') || '', defs))

  let body = cleanBodyLatex(expandMacros(extractLetterBody(src), defs))
  body = latexInlineToText(body)
  if (!body) body = fallback.letterBody || 'Replace these contents with your own!'

  const email = get('Email', fallback.email || '')
  const phone = get('TEL', fallback.phone || '')
  const agency = get('Agency', fallback.name || 'Your Agency')

  return {
    who: get('Who', agency),
    title: get('Title', fallback.title || ''),
    where: get('Where', agency),
    address: get('Address', fallback.address || ''),
    cityZip: get('CityZip', ''),
    email: email.replace(/^E-mail:\s*/i, ''),
    phone,
    mobile: get('TELM', ''),
    url: get('URL', fallback.website || ''),
    agency,
    accent,
    recipient,
    opening,
    closing,
    body,
    ps,
    cc,
    encl,
    logo: fallback.logo || null,
    layoutHint: src.includes('header-banner') || src.includes('casualheader') || src.includes('\\begin{letter}')
      ? 'letter-berkeley'
      : null,
  }
}

export { stripComments, findAllDefs }
