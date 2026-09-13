import { useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import {
  IconBold, IconItalic, IconStrikethrough, IconLink, IconTable,
  IconClearFormatting, IconList, IconListNumbers, IconChevronDown, IconCheck,
  IconH1, IconH2, IconH3, IconPilcrow,
} from '@tabler/icons-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const RICH_MARK = '<!--sparkdraw-rich-->'

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function plainOrHtmlToEditorDoc(raw) {
  const s = String(raw ?? '')
  if (!s.trim()) return '<p></p>'
  if (s.includes('sparkdraw-rich') || /^\s*<(p|h[1-6]|ul|ol|table|div|blockquote)\b/i.test(s)) {
    return s.replace(RICH_MARK, '').trim() || '<p></p>'
  }
  return s
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
    .join('') || '<p></p>'
}

export function editorHtmlToStored(html) {
  const body = String(html || '<p></p>').trim() || '<p></p>'
  return `${RICH_MARK}\n${body}`
}

export function isSparkdrawRichText(raw) {
  const s = String(raw ?? '')
  return s.includes('sparkdraw-rich') || /^\s*<(p|h[1-6]|ul|ol|table|div|blockquote)\b/i.test(s)
}

/**
 * Convert stored rich HTML (.txt editor) into readable plain text for download.
 * Keeps headings/paragraphs/lists as normal text — not raw tags.
 */
export function richHtmlToPlainText(raw) {
  const marked = String(raw ?? '')
  const html = marked.replace(/<!--\s*sparkdraw-rich\s*-->/gi, '').trim()
  if (!html) return ''
  if (!/<[a-z][\s\S]*>/i.test(html)) return html

  const doc = new DOMParser().parseFromString(html, 'text/html')

  doc.querySelectorAll('br').forEach((br) => {
    br.replaceWith(doc.createTextNode('\n'))
  })

  doc.querySelectorAll('li').forEach((li) => {
    const ordered = li.parentElement?.tagName === 'OL'
    const idx = ordered
      ? Array.from(li.parentElement.children).indexOf(li) + 1
      : 0
    const prefix = ordered ? `${idx}. ` : '- '
    li.insertAdjacentText('afterbegin', prefix)
    if (!/\n\s*$/.test(li.textContent || '')) {
      li.appendChild(doc.createTextNode('\n'))
    }
  })

  doc.querySelectorAll('td, th').forEach((cell) => {
    cell.appendChild(doc.createTextNode('\t'))
  })

  doc.querySelectorAll('tr').forEach((row) => {
    row.appendChild(doc.createTextNode('\n'))
  })

  doc.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div, blockquote, pre').forEach((el) => {
    if (!/\n\s*$/.test(el.textContent || '')) {
      el.appendChild(doc.createTextNode('\n'))
    }
  })

  let text = doc.body.textContent || ''
  text = text
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return text
}

function inlineMarkdown(node) {
  if (!node) return ''
  if (node.nodeType === Node.TEXT_NODE) return node.textContent || ''
  if (node.nodeType !== Node.ELEMENT_NODE) return ''

  const tag = node.tagName.toLowerCase()
  const inner = [...node.childNodes].map(inlineMarkdown).join('')

  if (tag === 'br') return '  \n'
  if (tag === 'strong' || tag === 'b') return `**${inner}**`
  if (tag === 'em' || tag === 'i') return `*${inner}*`
  if (tag === 's' || tag === 'strike' || tag === 'del') return `~~${inner}~~`
  if (tag === 'code') return `\`${inner}\``
  if (tag === 'a') {
    const href = node.getAttribute('href') || ''
    return href ? `[${inner}](${href})` : inner
  }
  return inner
}

/**
 * Rich HTML → Markdown so headings / bold / strike / lists survive as text.
 */
export function richHtmlToMarkdown(raw) {
  const marked = String(raw ?? '')
  const html = marked.replace(/<!--\s*sparkdraw-rich\s*-->/gi, '').trim()
  if (!html) return ''
  if (!/<[a-z][\s\S]*>/i.test(html)) return html

  const doc = new DOMParser().parseFromString(html, 'text/html')
  const lines = []

  const walkBlocks = (el, listPrefix = null) => {
    ;[...el.childNodes].forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const t = node.textContent?.replace(/\s+/g, ' ')
        if (t?.trim()) lines.push(t.trim())
        return
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return
      const tag = node.tagName.toLowerCase()

      if (tag === 'h1') lines.push(`# ${inlineMarkdown(node).trim()}`, '')
      else if (tag === 'h2') lines.push(`## ${inlineMarkdown(node).trim()}`, '')
      else if (tag === 'h3') lines.push(`### ${inlineMarkdown(node).trim()}`, '')
      else if (tag === 'p' || tag === 'div' || tag === 'blockquote') {
        const text = inlineMarkdown(node).trim()
        if (text) lines.push(text, '')
      } else if (tag === 'ul') {
        ;[...node.children].forEach((li) => {
          if (li.tagName?.toLowerCase() === 'li') {
            lines.push(`- ${inlineMarkdown(li).trim()}`)
          }
        })
        lines.push('')
      } else if (tag === 'ol') {
        ;[...node.children].forEach((li, i) => {
          if (li.tagName?.toLowerCase() === 'li') {
            lines.push(`${i + 1}. ${inlineMarkdown(li).trim()}`)
          }
        })
        lines.push('')
      } else if (tag === 'table') {
        const rows = [...node.querySelectorAll('tr')]
        rows.forEach((tr, ri) => {
          const cells = [...tr.querySelectorAll('th,td')].map((c) => inlineMarkdown(c).trim())
          lines.push(`| ${cells.join(' | ')} |`)
          if (ri === 0) lines.push(`| ${cells.map(() => '---').join(' | ')} |`)
        })
        lines.push('')
      } else if (tag === 'br') {
        lines.push('')
      } else {
        walkBlocks(node, listPrefix)
      }
    })
  }

  walkBlocks(doc.body)
  return lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Self-contained HTML document — open in browser to see editor styling.
 */
export function richHtmlToDownloadDocument(raw, title = 'Document') {
  const marked = String(raw ?? '')
  let body = marked.replace(/<!--\s*sparkdraw-rich\s*-->/gi, '').trim()
  if (!body) body = '<p></p>'
  if (!/<[a-z][\s\S]*>/i.test(body)) {
    body = body
      .split(/\n{2,}/)
      .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
      .join('')
  }

  const safeTitle = escapeHtml(String(title || 'Document').replace(/\.[^.]+$/, '') || 'Document')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${safeTitle}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 2.5rem 1.5rem 3rem;
    background: #f1f5f9;
    color: #0f172a;
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    line-height: 1.55;
  }
  .sheet {
    max-width: 48rem;
    margin: 0 auto;
    padding: 2.5rem 3rem 3rem;
    background: #fff;
    border: 1px solid #e2e8f0;
    box-shadow: 0 8px 28px rgb(15 23 42 / 0.08);
  }
  h1 { font-size: 1.75rem; font-weight: 700; margin: 0 0 0.75em; line-height: 1.25; }
  h2 { font-size: 1.35rem; font-weight: 650; margin: 0 0 0.65em; line-height: 1.25; }
  h3 { font-size: 1.15rem; font-weight: 600; margin: 0 0 0.55em; line-height: 1.3; }
  p { margin: 0 0 0.85em; }
  ul, ol { margin: 0 0 0.85em; padding-left: 1.35rem; }
  li { margin: 0.2em 0; }
  strong, b { font-weight: 700; }
  em, i { font-style: italic; }
  s, strike, del { text-decoration: line-through; }
  a { color: #ea580c; }
  table { width: 100%; border-collapse: collapse; margin: 0 0 1em; }
  td, th { border: 1px solid #e5e7eb; padding: 0.35rem 0.5rem; text-align: left; }
  th { background: #f8fafc; font-weight: 600; }
</style>
</head>
<body>
  <article class="sheet">
${body}
  </article>
</body>
</html>
`
}

export function withHtmlExtension(filename) {
  const base = String(filename || 'document').replace(/\.[^.]+$/, '') || 'document'
  return `${base}.html`
}

function ToolbarBtn({ active, disabled, title, onClick, children }) {
  return (
    <button
      type="button"
      className={`sd-text-rte__btn${active ? ' is-active' : ''}`}
      disabled={disabled}
      title={title}
      aria-label={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function headingLabel(editor) {
  if (!editor) return 'Paragraph'
  if (editor.isActive('heading', { level: 1 })) return 'Heading 1'
  if (editor.isActive('heading', { level: 2 })) return 'Heading 2'
  if (editor.isActive('heading', { level: 3 })) return 'Heading 3'
  return 'Paragraph'
}

/**
 * TipTap rich editor for .txt / .md / .log with formatting toolbar.
 */
export default function TextRichEditor({
  valueHtml,
  onChangeHtml,
  onSaveShortcut,
  className = '',
  editable = true,
}) {
  const lastEmitted = useRef(valueHtml || '<p></p>')

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      Placeholder.configure({ placeholder: 'Start typing…' }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: valueHtml || '<p></p>',
    editable,
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML()
      lastEmitted.current = html
      onChangeHtml?.(html)
    },
    editorProps: {
      attributes: {
        class: 'sd-text-rte__prose',
        spellcheck: 'false',
      },
      handleKeyDown: (_view, event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
          event.preventDefault()
          onSaveShortcut?.()
          return true
        }
        return false
      },
    },
  })

  useEffect(() => {
    if (!editor) return
    const next = valueHtml || '<p></p>'
    if (next === lastEmitted.current) return
    lastEmitted.current = next
    editor.commands.setContent(next, { emitUpdate: false })
  }, [valueHtml, editor])

  useEffect(() => {
    if (!editor) return
    editor.setEditable(editable)
  }, [editor, editable])

  if (!editor) return null

  const setLink = () => {
    const prev = editor.getAttributes('link').href || ''
    const url = window.prompt('Link URL', prev)
    if (url === null) return
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
  }

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }

  return (
    <div className={`sd-text-rte ${className}`.trim()}>
      <div className="sd-text-rte__bar" role="toolbar" aria-label="Text formatting">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="sd-text-rte__menu-btn" onMouseDown={(e) => e.preventDefault()}>
              <IconH1 size={15} stroke={1.75} />
              <span>{headingLabel(editor)}</span>
              <IconChevronDown size={14} stroke={1.75} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[10rem]">
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onSelect={() => editor.chain().focus().setParagraph().run()}
            >
              <IconPilcrow size={15} />
              <span className="flex-1">Paragraph</span>
              {!editor.isActive('heading') ? <IconCheck size={14} className="text-primary" /> : null}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onSelect={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            >
              <IconH1 size={15} />
              <span className="flex-1">Heading 1</span>
              {editor.isActive('heading', { level: 1 }) ? <IconCheck size={14} className="text-primary" /> : null}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onSelect={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              <IconH2 size={15} />
              <span className="flex-1">Heading 2</span>
              {editor.isActive('heading', { level: 2 }) ? <IconCheck size={14} className="text-primary" /> : null}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onSelect={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            >
              <IconH3 size={15} />
              <span className="flex-1">Heading 3</span>
              {editor.isActive('heading', { level: 3 }) ? <IconCheck size={14} className="text-primary" /> : null}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="sd-text-rte__menu-btn" onMouseDown={(e) => e.preventDefault()}>
              <IconList size={15} stroke={1.75} />
              <IconChevronDown size={14} stroke={1.75} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[10rem]">
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onSelect={() => editor.chain().focus().toggleBulletList().run()}
            >
              <IconList size={15} />
              <span className="flex-1">Bullet list</span>
              {editor.isActive('bulletList') ? <IconCheck size={14} className="text-primary" /> : null}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onSelect={() => editor.chain().focus().toggleOrderedList().run()}
            >
              <IconListNumbers size={15} />
              <span className="flex-1">Numbered list</span>
              {editor.isActive('orderedList') ? <IconCheck size={14} className="text-primary" /> : null}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onSelect={() => editor.chain().focus().liftListItem('listItem').run()}
            >
              Clear list
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="sd-text-rte__sep" aria-hidden />

        <ToolbarBtn
          title="Bold"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <IconBold size={16} stroke={1.75} />
        </ToolbarBtn>
        <ToolbarBtn
          title="Italic"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <IconItalic size={16} stroke={1.75} />
        </ToolbarBtn>
        <ToolbarBtn
          title="Strikethrough"
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <IconStrikethrough size={16} stroke={1.75} />
        </ToolbarBtn>
        <ToolbarBtn title="Link" active={editor.isActive('link')} onClick={setLink}>
          <IconLink size={16} stroke={1.75} />
        </ToolbarBtn>

        <span className="sd-text-rte__sep" aria-hidden />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="sd-text-rte__menu-btn" onMouseDown={(e) => e.preventDefault()}>
              <IconTable size={15} stroke={1.75} />
              <IconChevronDown size={14} stroke={1.75} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[11rem]">
            <DropdownMenuItem className="cursor-pointer gap-2" onSelect={insertTable}>
              Insert table
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              disabled={!editor.can().addRowAfter()}
              onSelect={() => editor.chain().focus().addRowAfter().run()}
            >
              Add row
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              disabled={!editor.can().addColumnAfter()}
              onSelect={() => editor.chain().focus().addColumnAfter().run()}
            >
              Add column
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              disabled={!editor.can().deleteTable()}
              onSelect={() => editor.chain().focus().deleteTable().run()}
            >
              Delete table
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ToolbarBtn
          title="Clear formatting"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        >
          <IconClearFormatting size={16} stroke={1.75} />
        </ToolbarBtn>
      </div>

      <EditorContent editor={editor} className="sd-text-rte__surface" />
    </div>
  )
}
