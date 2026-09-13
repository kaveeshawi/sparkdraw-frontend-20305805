import { useLayoutEffect, useState } from 'react'
import { A4_HEIGHT_MM, A4_WIDTH_MM, MM_TO_PX } from '@/lib/a4'

const BREAK_RE = /<hr\b[^>]*\bsd-word-pagebreak\b[^>]*>/gi

/** Word-like margin presets (mm) — page size stays A4. */
const MARGINS_MM = {
  default: { top: 25.4, right: 25.4, bottom: 25.4, left: 25.4 }, // Normal 1"
  narrow: { top: 12.7, right: 12.7, bottom: 12.7, left: 12.7 },
  wide: { top: 25.4, right: 50.8, bottom: 25.4, left: 50.8 },
}

/** Leave ~1.25 lines so the last line never clips under overflow:hidden */
const SAFETY_PX = 28

function splitByExplicitBreaks(html) {
  const parts = String(html || '')
    .split(BREAK_RE)
    .map((s) => s.trim())
    .filter(Boolean)
  return parts.length ? parts : [html || '<p></p>']
}

function contentBox(marginClass) {
  const m = MARGINS_MM[marginClass] || MARGINS_MM.default
  return {
    contentW: (A4_WIDTH_MM - m.left - m.right) * MM_TO_PX,
    contentH: Math.max(200, (A4_HEIGHT_MM - m.top - m.bottom) * MM_TO_PX - SAFETY_PX),
    margins: m,
  }
}

/**
 * Measure host must mirror .sd-word-preview__page typography + block margins,
 * otherwise content measures short and the real page clips mid-line.
 */
function createMeasureHost(contentW) {
  const root = document.createElement('div')
  root.setAttribute('aria-hidden', 'true')
  root.style.cssText = 'position:absolute;left:-10000px;top:0;visibility:hidden;pointer-events:none;'
  root.innerHTML = `
    <style>
      .sd-word-measure {
        width: ${Math.round(contentW)}px;
        box-sizing: border-box;
        font-family: "Calibri", "Segoe UI", Arial, sans-serif;
        font-size: 11pt;
        line-height: 1.5;
        color: #000;
      }
      .sd-word-measure p { margin: 0 0 0.85em; }
      .sd-word-measure h1,
      .sd-word-measure h2,
      .sd-word-measure h3 {
        margin: 0 0 0.65em;
        font-weight: 600;
        line-height: 1.25;
      }
      .sd-word-measure h1 { font-size: 1.75em; }
      .sd-word-measure h2 { font-size: 1.35em; }
      .sd-word-measure h3 { font-size: 1.15em; }
      .sd-word-measure ul,
      .sd-word-measure ol { margin: 0 0 0.85em; padding-left: 1.35rem; }
      .sd-word-measure li { margin: 0.15em 0; }
      .sd-word-measure table {
        width: 100%;
        border-collapse: collapse;
        margin: 0 0 1em;
      }
      .sd-word-measure td,
      .sd-word-measure th {
        border: 1px solid #e5e7eb;
        padding: 0.35rem 0.5rem;
      }
      .sd-word-measure img { max-width: 100%; height: auto; }
    </style>
    <div class="sd-word-measure"></div>
  `
  document.body.appendChild(root)
  const host = root.querySelector('.sd-word-measure')
  return { root, host }
}

function exceeds(host, maxH) {
  return host.scrollHeight > maxH + 0.5
}

/**
 * Split a single oversized text block into pieces that each fit maxH.
 */
function splitOversizedBlock(block, host, maxH) {
  const tag = block.tagName?.toLowerCase() || 'p'
  if (!['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'blockquote', 'li'].includes(tag)) {
    return [block.cloneNode(true)]
  }

  const plain = block.textContent || ''
  if (!plain.trim()) return [block.cloneNode(true)]

  const tokens = plain.split(/(\s+)/).filter((t) => t.length)
  if (tokens.length <= 1) return [block.cloneNode(true)]

  const pieces = []
  let start = 0

  while (start < tokens.length) {
    let lo = start + 1
    let hi = tokens.length
    let best = lo

    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2)
      const slice = tokens.slice(start, mid).join('')
      host.replaceChildren()
      const probe = document.createElement(tag)
      probe.textContent = slice
      host.appendChild(probe)
      if (!exceeds(host, maxH) || mid === start + 1) {
        best = mid
        lo = mid + 1
      } else {
        hi = mid - 1
      }
    }

    const slice = tokens.slice(start, best).join('')
    const node = document.createElement(tag)
    node.textContent = slice
    pieces.push(node)

    // Always advance; if a single token is taller than the page, skip past it
    start = Math.max(best, start + 1)
  }

  return pieces.length ? pieces : [block.cloneNode(true)]
}

function paginateHtml(html, marginClass) {
  const { contentW, contentH } = contentBox(marginClass)
  const sections = splitByExplicitBreaks(html)
  const pages = []
  const { root, host } = createMeasureHost(contentW)

  const syncHost = (nodes) => {
    host.replaceChildren()
    nodes.forEach((n) => host.appendChild(n))
  }

  try {
    for (const sectionHtml of sections) {
      const section = document.createElement('div')
      section.innerHTML = sectionHtml || '<p></p>'
      const blocks = [...section.childNodes].filter((n) => {
        if (n.nodeType === Node.ELEMENT_NODE) return true
        if (n.nodeType === Node.TEXT_NODE && n.textContent?.trim()) return true
        return false
      }).map((n) => {
        if (n.nodeType === Node.TEXT_NODE) {
          const p = document.createElement('p')
          p.textContent = n.textContent
          return p
        }
        return n
      })

      if (!blocks.length) {
        pages.push('<p></p>')
        continue
      }

      let pageNodes = []

      const flush = () => {
        if (!pageNodes.length) return
        const wrap = document.createElement('div')
        pageNodes.forEach((n) => wrap.appendChild(n))
        pages.push(wrap.innerHTML || '<p></p>')
        pageNodes = []
        host.replaceChildren()
      }

      for (const block of blocks) {
        syncHost([])
        const alone = block.cloneNode(true)
        host.appendChild(alone)
        let candidates
        if (exceeds(host, contentH)) {
          candidates = splitOversizedBlock(block, host, contentH)
        } else {
          candidates = [block.cloneNode(true)]
        }

        for (const piece of candidates) {
          syncHost(pageNodes)
          host.appendChild(piece)

          if (exceeds(host, contentH) && pageNodes.length > 0) {
            flush()
            syncHost([])
            host.appendChild(piece)
            pageNodes = [piece]
            if (exceeds(host, contentH)) {
              // Still too tall alone — try another split pass against empty page
              const more = splitOversizedBlock(piece, host, contentH)
              if (more.length > 1) {
                pageNodes = []
                host.replaceChildren()
                for (const part of more) {
                  syncHost(pageNodes)
                  host.appendChild(part)
                  if (exceeds(host, contentH) && pageNodes.length > 0) {
                    flush()
                    syncHost([])
                    host.appendChild(part)
                    pageNodes = [part]
                  } else {
                    pageNodes.push(part)
                  }
                }
              } else {
                flush()
              }
            }
          } else {
            pageNodes.push(piece)
            if (exceeds(host, contentH) && pageNodes.length === 1) {
              flush()
            }
          }
        }
      }
      flush()
    }
  } finally {
    root.remove()
  }

  return pages.length ? pages : ['<p></p>']
}

/**
 * Official A4 print-layout pages (210mm × 297mm) with Word-style margin presets.
 */
export default function WordPagesView({ html, widthClass = 'default' }) {
  const [pages, setPages] = useState(() => ['<p></p>'])
  const margins = MARGINS_MM[widthClass] || MARGINS_MM.default

  useLayoutEffect(() => {
    setPages(paginateHtml(html, widthClass))
  }, [html, widthClass])

  return (
    <div className="sd-word-preview__pages">
      {pages.map((pageHtml, index) => (
        <article
          key={`word-page-${index}`}
          className={`sd-word-preview__page is-a4 is-paged is-width-${widthClass}`}
          style={{
            '--word-m-top': `${margins.top}mm`,
            '--word-m-right': `${margins.right}mm`,
            '--word-m-bottom': `${margins.bottom}mm`,
            '--word-m-left': `${margins.left}mm`,
          }}
          aria-label={`Page ${index + 1} of ${pages.length}`}
        >
          <div
            className="sd-word-preview__page-body"
            // mammoth HTML — local user file preview only
            dangerouslySetInnerHTML={{ __html: pageHtml }}
          />
        </article>
      ))}
    </div>
  )
}
