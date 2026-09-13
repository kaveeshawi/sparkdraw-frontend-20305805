import { useEffect, useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import mammoth from 'mammoth/mammoth.browser'
import { toast } from 'sonner'
import {
  IconDownload, IconExternalLink, IconFileText, IconInfoCircle, IconDots,
  IconZoomIn, IconZoomOut, IconZoomReset, IconAdjustmentsHorizontal, IconCheck,
  IconDeviceFloppy, IconRotateClockwise, IconHandMove,
} from '@tabler/icons-react'
import {
  Dialog, DialogContent, DialogDescription, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import WordPagesView from './WordPagesView'
import PptxPreviewView from './PptxPreviewView'
import FileFormatIcon from './FileFormatIcon'
import TextRichEditor, { editorHtmlToStored, plainOrHtmlToEditorDoc } from './TextRichEditor'
import { getFileExtension } from '@/lib/fileFormat'
import { getFolderFileBlob, formatFileSize } from '@/lib/folderLocalFiles'
import { saveLocalFileText } from '@/lib/assetFolders'

const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'])
const PDF_EXT = new Set(['pdf'])
const TEXT_EXT = new Set(['txt', 'json', 'md', 'html', 'htm', 'css', 'js', 'jsx', 'ts', 'tsx', 'sql', 'log'])
const EDITABLE_TEXT_EXT = new Set(['txt', 'md', 'log'])
const SHEET_EXT = new Set(['xls', 'xlsx', 'csv', 'tsv', 'ods'])
const WORD_EXT = new Set(['docx'])
const DECK_EXT = new Set(['pptx'])
const VIDEO_EXT = new Set(['mp4', 'webm', 'mov', 'm4v'])
const AUDIO_EXT = new Set(['mp3', 'wav', 'ogg', 'm4a', 'aac'])
const LEGACY_OFFICE_EXT = new Set(['doc', 'ppt', 'rtf', 'odt', 'odp'])

const MEDIA_MIME = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  m4v: 'video/x-m4v',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
}

const MAX_PREVIEW_ROWS = 300
const MAX_PREVIEW_COLS = 50
const MIN_VISIBLE_ROWS = 24
const MIN_VISIBLE_COLS = 12
const SHEET_ZOOM_MIN = 50
const SHEET_ZOOM_MAX = 200
const IMAGE_ZOOM_MAX = 400
const SHEET_ZOOM_STEP = 10
const SHEET_ZOOM_DEFAULT = 100

const WORD_WIDTHS = [
  { id: 'narrow', label: 'Narrow margins' },
  { id: 'default', label: 'Normal margins' },
  { id: 'wide', label: 'Wide margins' },
]

const WORD_STAGES = [
  { id: 'brand', label: 'Brand soft' },
  { id: 'slate', label: 'Neutral gray' },
  { id: 'dark', label: 'Focus dark' },
]

const TEXT_SIZES = [
  { id: 'sm', label: 'Small text' },
  { id: 'md', label: 'Medium text' },
  { id: 'lg', label: 'Large text' },
]

const TEXT_THEMES = [
  { id: 'brand', label: 'Brand soft' },
  { id: 'slate', label: 'Neutral' },
  { id: 'dark', label: 'Focus dark' },
]

const TEXT_FONTS = [
  { id: 'mono', label: 'Monospace' },
  { id: 'sans', label: 'Sans-serif' },
]

const IMAGE_STAGES = [
  { id: 'slate', label: 'Neutral gray' },
  { id: 'brand', label: 'Brand soft' },
  { id: 'checker', label: 'Checkerboard' },
  { id: 'dark', label: 'Focus dark' },
]

const IMAGE_MIME = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
}

function clampSheetZoom(n) {
  return Math.min(SHEET_ZOOM_MAX, Math.max(SHEET_ZOOM_MIN, n))
}

function clampImageZoom(n) {
  return Math.min(IMAGE_ZOOM_MAX, Math.max(SHEET_ZOOM_MIN, n))
}

function PreviewZoomBar({ zoom, onZoomIn, onZoomOut, onZoomReset, maxZoom = SHEET_ZOOM_MAX }) {
  return (
    <div className="sd-sheet-preview__zoom" role="group" aria-label="Zoom">
      <button
        type="button"
        className="sd-sheet-preview__zoom-btn"
        onClick={onZoomOut}
        disabled={zoom <= SHEET_ZOOM_MIN}
        aria-label="Zoom out"
        title="Zoom out"
      >
        <IconZoomOut size={16} stroke={1.75} />
      </button>
      <button
        type="button"
        className="sd-sheet-preview__zoom-value"
        onClick={onZoomReset}
        title="Reset zoom"
      >
        {zoom}%
      </button>
      <button
        type="button"
        className="sd-sheet-preview__zoom-btn"
        onClick={onZoomIn}
        disabled={zoom >= maxZoom}
        aria-label="Zoom in"
        title="Zoom in"
      >
        <IconZoomIn size={16} stroke={1.75} />
      </button>
      <button
        type="button"
        className="sd-sheet-preview__zoom-btn"
        onClick={onZoomReset}
        aria-label="Reset zoom"
        title="Reset zoom"
      >
        <IconZoomReset size={16} stroke={1.75} />
      </button>
    </div>
  )
}

function resolveKind(ext) {
  if (IMAGE_EXT.has(ext)) return 'image'
  if (PDF_EXT.has(ext)) return 'pdf'
  if (SHEET_EXT.has(ext)) return 'sheet'
  if (WORD_EXT.has(ext)) return 'word'
  if (DECK_EXT.has(ext)) return 'deck'
  if (VIDEO_EXT.has(ext)) return 'video'
  if (AUDIO_EXT.has(ext)) return 'audio'
  if (LEGACY_OFFICE_EXT.has(ext)) return 'legacy'
  if (TEXT_EXT.has(ext)) return 'text'
  return 'other'
}

function colLabel(index) {
  let n = index
  let label = ''
  while (n >= 0) {
    label = String.fromCharCode(65 + (n % 26)) + label
    n = Math.floor(n / 26) - 1
  }
  return label
}

function padMatrix(rows, minRows, minCols) {
  const width = Math.max(minCols, ...rows.map((r) => r.length), 1)
  const height = Math.max(minRows, rows.length, 1)
  const out = []
  for (let r = 0; r < height; r += 1) {
    const src = rows[r] || []
    const row = []
    for (let c = 0; c < width; c += 1) {
      const v = src[c]
      row.push(v == null ? '' : String(v))
    }
    out.push(row)
  }
  return out
}

async function parseSpreadsheet(blob, ext) {
  let workbook
  if (ext === 'csv' || ext === 'tsv') {
    const text = await blob.text()
    workbook = XLSX.read(text, {
      type: 'string',
      raw: false,
      FS: ext === 'tsv' ? '\t' : undefined,
      codepage: 65001,
    })
  } else {
    const buffer = await blob.arrayBuffer()
    workbook = XLSX.read(buffer, {
      type: 'array',
      raw: false,
    })
  }

  let sheetNames = [...(workbook.SheetNames || [])]
  if (!sheetNames.length) {
    return { sheetNames: [], sheets: {} }
  }

  const sheets = {}
  for (const name of sheetNames) {
    const ws = workbook.Sheets[name]
    const rows = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: '',
      blankrows: true,
      raw: false,
    })
    const clipped = rows
      .slice(0, MAX_PREVIEW_ROWS)
      .map((row) => (Array.isArray(row) ? row.slice(0, MAX_PREVIEW_COLS) : []))
    sheets[name] = padMatrix(clipped, MIN_VISIBLE_ROWS, MIN_VISIBLE_COLS)
  }

  // CSV/TSV → same Excel-style Sheet1 tab
  if ((ext === 'csv' || ext === 'tsv') && sheetNames.length === 1 && sheetNames[0] !== 'Sheet1') {
    sheets.Sheet1 = sheets[sheetNames[0]]
    delete sheets[sheetNames[0]]
    sheetNames = ['Sheet1']
  }

  return { sheetNames, sheets }
}

function blockHeaderSelect(e) {
  e.preventDefault()
}

function PreviewChrome({
  name,
  kindLabel,
  meta,
  onDownload,
  onOpenExternal,
  asset,
}) {
  return (
    <header className="sd-file-preview__chrome">
      <div className="sd-file-preview__chrome-left">
        {meta ? (
          <span className="sd-file-preview__chrome-meta" title={meta}>
            <IconInfoCircle size={16} stroke={1.75} />
          </span>
        ) : null}
        {onDownload ? (
          <button
            type="button"
            className="sd-file-preview__chrome-btn"
            onClick={() => onDownload(asset)}
            aria-label="Download"
            title="Download"
          >
            <IconDownload size={17} stroke={1.75} />
          </button>
        ) : null}
        {onOpenExternal ? (
          <button
            type="button"
            className="sd-file-preview__chrome-btn"
            onClick={() => onOpenExternal(asset)}
            aria-label="Open with default app"
            title="Open with default app"
          >
            <IconExternalLink size={17} stroke={1.75} />
          </button>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="sd-file-preview__chrome-btn"
              aria-label="More options"
              title="More"
            >
              <IconDots size={17} stroke={1.75} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[11rem]">
            {onDownload ? (
              <DropdownMenuItem className="cursor-pointer gap-2" onSelect={() => onDownload(asset)}>
                <IconDownload size={15} />
                Download
              </DropdownMenuItem>
            ) : null}
            {onOpenExternal ? (
              <DropdownMenuItem className="cursor-pointer gap-2" onSelect={() => onOpenExternal(asset)}>
                <IconExternalLink size={15} />
                Open with app
              </DropdownMenuItem>
            ) : null}
            {(onDownload || onOpenExternal) ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem disabled className="gap-2 text-muted-foreground">
              {kindLabel}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="sd-file-preview__chrome-title">
        <strong title={name}>{name}</strong>
        {meta ? <span>{meta}</span> : null}
      </div>
      <div className="sd-file-preview__chrome-right" aria-hidden />
    </header>
  )
}

/**
 * Full-bleed preview — images / PDF / text / Excel / Word (MEGA-style chrome for office files).
 */
export default function FilePreviewDialog({
  open,
  onOpenChange,
  asset,
  onDownload,
  onOpenExternal,
  agencyId,
  folderId = null,
  onSaved,
}) {
  const [url, setUrl] = useState(null)
  const [text, setText] = useState(null)
  const [draftText, setDraftText] = useState('')
  const [sheetData, setSheetData] = useState(null)
  const [activeSheet, setActiveSheet] = useState(null)
  const [sheetZoom, setSheetZoom] = useState(SHEET_ZOOM_DEFAULT)
  const [wordHtml, setWordHtml] = useState(null)
  const [wordZoom, setWordZoom] = useState(SHEET_ZOOM_DEFAULT)
  const [wordWidth, setWordWidth] = useState('default')
  const [wordStage, setWordStage] = useState('brand')
  const [pptxBuffer, setPptxBuffer] = useState(null)
  const [deckZoom, setDeckZoom] = useState(SHEET_ZOOM_DEFAULT)
  const [textSize, setTextSize] = useState('md')
  const [textTheme, setTextTheme] = useState('brand')
  const [textFont, setTextFont] = useState('mono')
  const [textWrap, setTextWrap] = useState(true)
  const [imageZoom, setImageZoom] = useState(SHEET_ZOOM_DEFAULT)
  const [imageRotate, setImageRotate] = useState(0)
  const [imageStage, setImageStage] = useState('slate')
  const [imagePan, setImagePan] = useState({ x: 0, y: 0 })
  const [imagePanning, setImagePanning] = useState(false)
  const imagePanRef = useRef(null)
  const imageZoomRef = useRef(SHEET_ZOOM_DEFAULT)
  const imagePanStateRef = useRef({ x: 0, y: 0 })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const name = asset?.original_name || 'File'
  const ext = getFileExtension(name)
  const kind = resolveKind(ext)
  const canEditText = kind === 'text' && EDITABLE_TEXT_EXT.has(ext)
  const isSvg = kind === 'image' && ext === 'svg'
  const showChrome = kind === 'sheet' || kind === 'word' || kind === 'image' || kind === 'deck' || kind === 'video' || kind === 'audio' || canEditText
  const dirty = canEditText && text != null && draftText !== text

  useEffect(() => {
    let revoked = null
    let cancelled = false

    async function load() {
      setUrl(null)
      setText(null)
      setDraftText('')
      setSheetData(null)
      setActiveSheet(null)
      setSheetZoom(SHEET_ZOOM_DEFAULT)
      setWordHtml(null)
      setWordZoom(SHEET_ZOOM_DEFAULT)
      setWordWidth('default')
      setWordStage('brand')
      setPptxBuffer(null)
      setDeckZoom(SHEET_ZOOM_DEFAULT)
      setTextSize('md')
      setTextTheme('brand')
      setTextFont('mono')
      setTextWrap(true)
      setImageZoom(SHEET_ZOOM_DEFAULT)
      setImageRotate(0)
      setImageStage('slate')
      setImagePan({ x: 0, y: 0 })
      setImagePanning(false)
      imagePanRef.current = null
      imageZoomRef.current = SHEET_ZOOM_DEFAULT
      imagePanStateRef.current = { x: 0, y: 0 }
      setSaving(false)
      setError(null)
      if (!open || !asset?.id) return
      if (asset.source !== 'local' && asset.source !== 'drive' && asset.location !== 'root') {
        setError('Preview is only available for files added from your PC.')
        return
      }
      setLoading(true)
      try {
        const blob = await getFolderFileBlob(asset.id)
        if (cancelled) return
        if (!blob) {
          setError('File data missing.')
          return
        }
        if (kind === 'text') {
          const raw = await blob.text()
          const clipped = raw.slice(0, 500000)
          if (!cancelled) {
            const doc = plainOrHtmlToEditorDoc(clipped)
            setText(doc)
            setDraftText(doc)
          }
        } else if (kind === 'sheet') {
          const parsed = await parseSpreadsheet(blob, ext)
          if (cancelled) return
          if (!parsed.sheetNames.length) {
            setError('This spreadsheet is empty.')
            return
          }
          setSheetData(parsed)
          setActiveSheet(parsed.sheetNames[0])
        } else if (kind === 'word') {
          const buffer = await blob.arrayBuffer()
          const result = await mammoth.convertToHtml(
            { arrayBuffer: buffer },
            {
              styleMap: [
                "br[type='page'] => hr.sd-word-pagebreak",
              ],
            },
          )
          if (cancelled) return
          setWordHtml(result.value || '<p></p>')
        } else if (kind === 'deck') {
          const buffer = await blob.arrayBuffer()
          if (!cancelled) setPptxBuffer(buffer)
        } else if (kind === 'legacy') {
          const objectUrl = URL.createObjectURL(blob)
          revoked = objectUrl
          if (!cancelled) setUrl(objectUrl)
        } else if (kind === 'video' || kind === 'audio') {
          let previewBlob = blob
          const mime = MEDIA_MIME[ext]
          if (mime && blob.type !== mime) {
            previewBlob = new Blob([await blob.arrayBuffer()], { type: mime })
          }
          const objectUrl = URL.createObjectURL(previewBlob)
          revoked = objectUrl
          if (!cancelled) setUrl(objectUrl)
        } else if (kind === 'image') {
          // Ensure correct MIME so browsers render JPG/PNG reliably
          let previewBlob = blob
          const mime = IMAGE_MIME[ext]
          if (mime && blob.type !== mime) {
            previewBlob = new Blob([await blob.arrayBuffer()], { type: mime })
          }
          const objectUrl = URL.createObjectURL(previewBlob)
          revoked = objectUrl
          if (!cancelled) setUrl(objectUrl)
        } else if (kind === 'pdf') {
          const objectUrl = URL.createObjectURL(blob)
          revoked = objectUrl
          if (!cancelled) setUrl(objectUrl)
        } else {
          setError('Preview isn’t available for this type. Download to open with the default app.')
        }
      } catch {
        if (!cancelled) setError('Could not load preview.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [open, asset?.id, asset?.source, asset?.location, kind, ext])

  const grid = useMemo(() => {
    if (!sheetData || !activeSheet) return null
    return sheetData.sheets[activeSheet] || null
  }, [sheetData, activeSheet])

  const colCount = grid?.[0]?.length || 0
  const sizeLabel = asset?.size != null ? formatFileSize(asset.size) : null
  const kindLabel = kind === 'sheet'
    ? 'Spreadsheet preview'
    : kind === 'word'
      ? 'Word preview'
      : kind === 'deck'
        ? 'PowerPoint preview'
        : kind === 'video'
          ? 'Video player'
          : kind === 'audio'
            ? 'Audio player'
            : kind === 'legacy'
              ? 'Office file'
              : kind === 'image'
                ? 'Image preview'
                : canEditText
                  ? 'Text editor'
                  : kind === 'text'
                    ? 'Text preview'
                    : 'Preview'
  const sheetCount = sheetData?.sheetNames?.length || 0
  const meta = [
    kindLabel,
    sizeLabel,
    kind === 'sheet' && sheetCount ? `${sheetCount} sheet${sheetCount === 1 ? '' : 's'}` : null,
    dirty ? 'Unsaved changes' : null,
  ].filter(Boolean).join(' · ')

  const zoomOut = () => setSheetZoom((z) => clampSheetZoom(z - SHEET_ZOOM_STEP))
  const zoomIn = () => setSheetZoom((z) => clampSheetZoom(z + SHEET_ZOOM_STEP))
  const zoomReset = () => setSheetZoom(SHEET_ZOOM_DEFAULT)
  const wordZoomOut = () => setWordZoom((z) => clampSheetZoom(z - SHEET_ZOOM_STEP))
  const wordZoomIn = () => setWordZoom((z) => clampSheetZoom(z + SHEET_ZOOM_STEP))
  const wordZoomReset = () => setWordZoom(SHEET_ZOOM_DEFAULT)
  const deckZoomOut = () => setDeckZoom((z) => clampSheetZoom(z - SHEET_ZOOM_STEP))
  const deckZoomIn = () => setDeckZoom((z) => clampSheetZoom(z + SHEET_ZOOM_STEP))
  const deckZoomReset = () => setDeckZoom(SHEET_ZOOM_DEFAULT)
  const imageRotateCw = () => setImageRotate((r) => (r + 90) % 360)

  const applyImageZoom = (nextZoom, anchor = null) => {
    const oldZoom = imageZoomRef.current
    let z = Math.round(nextZoom)
    if (z === oldZoom && nextZoom !== oldZoom) {
      z = nextZoom < oldZoom ? oldZoom - 1 : oldZoom + 1
    }
    z = clampImageZoom(z)
    if (z === oldZoom) return
    const ratio = z / oldZoom
    const pan = imagePanStateRef.current
    const cx = anchor?.x ?? 0
    const cy = anchor?.y ?? 0
    const nextPan = {
      x: cx - (cx - pan.x) * ratio,
      y: cy - (cy - pan.y) * ratio,
    }
    imageZoomRef.current = z
    imagePanStateRef.current = nextPan
    setImageZoom(z)
    setImagePan(nextPan)
  }

  const imageZoomOut = () => applyImageZoom(imageZoomRef.current - SHEET_ZOOM_STEP)
  const imageZoomIn = () => applyImageZoom(imageZoomRef.current + SHEET_ZOOM_STEP)
  const imageZoomReset = () => {
    imageZoomRef.current = SHEET_ZOOM_DEFAULT
    imagePanStateRef.current = { x: 0, y: 0 }
    setImageZoom(SHEET_ZOOM_DEFAULT)
    setImagePan({ x: 0, y: 0 })
  }

  const onImageWheel = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const anchor = {
      x: e.clientX - rect.left - rect.width / 2,
      y: e.clientY - rect.top - rect.height / 2,
    }
    // Multiplicative zoom so scroll feels continuous under the cursor
    const factor = Math.exp(-e.deltaY * 0.0022)
    applyImageZoom(imageZoomRef.current * factor, anchor)
  }

  const onImagePointerDown = (e) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    imagePanRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: imagePanStateRef.current.x,
      originY: imagePanStateRef.current.y,
    }
    setImagePanning(true)
  }

  const onImagePointerMove = (e) => {
    const drag = imagePanRef.current
    if (!drag) return
    const nextPan = {
      x: drag.originX + (e.clientX - drag.startX),
      y: drag.originY + (e.clientY - drag.startY),
    }
    imagePanStateRef.current = nextPan
    setImagePan(nextPan)
  }

  const onImagePointerUp = (e) => {
    if (imagePanRef.current) {
      try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* ignore */ }
    }
    imagePanRef.current = null
    setImagePanning(false)
  }

  const handleSaveText = async () => {
    if (!canEditText || !asset?.id || !agencyId || !dirty) return
    setSaving(true)
    try {
      const inRoot = asset.location === 'root' || !folderId
      const payload = editorHtmlToStored(draftText)
      await saveLocalFileText(agencyId, asset.id, payload, {
        folderId: inRoot ? null : folderId,
        mime: 'text/html;charset=utf-8',
      })
      setText(draftText)
      onSaved?.()
      toast.success('Saved')
    } catch (err) {
      toast.error(err?.message || 'Could not save file')
    } finally {
      setSaving(false)
    }
  }

  const bodyKind =
    kind === 'pdf' ? ' is-pdf'
      : kind === 'image' ? ' is-image'
        : canEditText ? ' is-text'
          : kind === 'text' ? ' is-doc'
            : kind === 'sheet' ? ' is-sheet'
              : kind === 'word' ? ' is-word'
                : kind === 'deck' ? ' is-deck'
                  : kind === 'video' ? ' is-video'
                    : kind === 'audio' ? ' is-audio'
                      : ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`sd-file-preview sd-file-preview--full border-0 p-0 overflow-hidden gap-0 flex flex-col sm:max-w-[min(98vw,72rem)]${showChrome ? ' sd-file-preview--chrome' : ''}${kind === 'deck' ? ' sd-file-preview--deck' : ''}`}
        style={kind === 'deck' ? {
          /* Width fixed; height ≈ chrome + toolbar + one 16:9 slide — not full viewport */
          width: 'min(98vw, 72rem)',
          maxWidth: 'min(98vw, 72rem)',
          height: 'min(92vh, calc(6rem + min(98vw, 72rem) * 0.5625))',
          maxHeight: 'min(92vh, calc(6rem + min(98vw, 72rem) * 0.5625))',
        } : undefined}
      >
        <DialogTitle className="sr-only">{name}</DialogTitle>
        <DialogDescription className="sr-only">File preview</DialogDescription>

        {showChrome ? (
          <PreviewChrome
            name={name}
            kindLabel={kindLabel}
            meta={meta}
            asset={asset}
            onDownload={onDownload}
            onOpenExternal={onOpenExternal}
          />
        ) : null}

        <div
          className={`sd-file-preview__body sd-file-preview__body--full${bodyKind}${showChrome ? ' has-chrome' : ''}`}
          style={kind === 'deck' ? {
            flex: '1 1 auto',
            minHeight: 0,
            overflow: 'hidden',
          } : undefined}
        >
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading preview…</p>
          ) : error ? (
            <div className="sd-file-preview__empty">
              <IconFileText size={28} stroke={1.5} />
              <p>{error}</p>
              {onDownload ? (
                <Button type="button" className="sd-btn-gradient rounded-full" onClick={() => onDownload(asset)}>
                  <IconDownload size={15} />
                  Download
                </Button>
              ) : null}
            </div>
          ) : kind === 'image' && url ? (
            <div className={`sd-image-preview sd-image-preview--stage-${imageStage}`}>
              <div className="sd-sheet-preview__toolbar sd-image-preview__toolbar">
                <span className="sd-sheet-preview__toolbar-label">
                  {ext ? ext.toUpperCase() : 'Image'} · drag to pan · scroll to zoom
                </span>
                <div className="sd-word-preview__tools">
                  <span className="sd-image-preview__hand-hint" title="Drag image to pan" aria-hidden>
                    <IconHandMove size={16} stroke={1.75} />
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="sd-sheet-preview__zoom-btn"
                        aria-label="Background"
                        title="Background"
                      >
                        <IconAdjustmentsHorizontal size={16} stroke={1.75} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[11rem]">
                      <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                        Background
                      </DropdownMenuItem>
                      {IMAGE_STAGES.map((opt) => (
                        <DropdownMenuItem
                          key={opt.id}
                          className="cursor-pointer gap-2"
                          onSelect={() => setImageStage(opt.id)}
                        >
                          <span className="flex-1">{opt.label}</span>
                          {imageStage === opt.id ? <IconCheck size={14} className="text-primary" /> : null}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <button
                    type="button"
                    className="sd-sheet-preview__zoom-btn"
                    onClick={imageRotateCw}
                    aria-label="Rotate"
                    title="Rotate"
                  >
                    <IconRotateClockwise size={16} stroke={1.75} />
                  </button>
                  <PreviewZoomBar
                    zoom={imageZoom}
                    onZoomIn={imageZoomIn}
                    onZoomOut={imageZoomOut}
                    onZoomReset={imageZoomReset}
                    maxZoom={IMAGE_ZOOM_MAX}
                  />
                </div>
              </div>
              <div
                className={`sd-image-preview__stage${imagePanning ? ' is-panning' : ''}`}
                onPointerDown={onImagePointerDown}
                onPointerMove={onImagePointerMove}
                onPointerUp={onImagePointerUp}
                onPointerCancel={onImagePointerUp}
                onWheel={onImageWheel}
              >
                <div
                  className={`sd-image-preview__scale${isSvg ? ' is-svg' : ''}`}
                  style={{
                    '--image-zoom': imageZoom / 100,
                    '--image-rotate': `${imageRotate}deg`,
                    '--image-pan-x': `${imagePan.x}px`,
                    '--image-pan-y': `${imagePan.y}px`,
                  }}
                >
                  <img
                    src={url}
                    alt={name}
                    className={`sd-file-preview__img sd-image-preview__img${isSvg ? ' sd-image-preview__img--svg' : ''}`}
                    draggable={false}
                  />
                </div>
              </div>
            </div>
          ) : kind === 'pdf' && url ? (
            <iframe title={name} src={url} className="sd-file-preview__frame" />
          ) : kind === 'video' && url ? (
            <div className="sd-media-preview sd-media-preview--video">
              <div className="sd-media-preview__stage">
                <video
                  className="sd-media-preview__video"
                  src={url}
                  controls
                  playsInline
                  preload="metadata"
                >
                  Your browser can’t play this video.
                </video>
              </div>
            </div>
          ) : kind === 'audio' && url ? (
            <div className="sd-media-preview sd-media-preview--audio">
              <div className="sd-media-preview__stage sd-media-preview__stage--audio">
                <div className="sd-media-preview__audio-card">
                  <FileFormatIcon name={name} size="lg" />
                  <p className="sd-media-preview__audio-name" title={name}>{name}</p>
                  <audio
                    className="sd-media-preview__audio"
                    src={url}
                    controls
                    preload="metadata"
                  >
                    Your browser can’t play this audio.
                  </audio>
                </div>
              </div>
            </div>
          ) : kind === 'text' && text != null && canEditText ? (
            <div className={`sd-text-editor sd-text-editor--theme-${textTheme}`}>
              <div className="sd-sheet-preview__toolbar sd-text-editor__toolbar">
                <span className="sd-sheet-preview__toolbar-label">
                  {dirty ? 'Editing · unsaved' : 'Editing'}
                </span>
                <div className="sd-word-preview__tools">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="sd-sheet-preview__zoom-btn"
                        aria-label="Customize editor"
                        title="Customize"
                      >
                        <IconAdjustmentsHorizontal size={16} stroke={1.75} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[12.5rem]">
                      <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                        Text size
                      </DropdownMenuItem>
                      {TEXT_SIZES.map((opt) => (
                        <DropdownMenuItem
                          key={opt.id}
                          className="cursor-pointer gap-2"
                          onSelect={() => setTextSize(opt.id)}
                        >
                          <span className="flex-1">{opt.label}</span>
                          {textSize === opt.id ? <IconCheck size={14} className="text-primary" /> : null}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                        Font
                      </DropdownMenuItem>
                      {TEXT_FONTS.map((opt) => (
                        <DropdownMenuItem
                          key={opt.id}
                          className="cursor-pointer gap-2"
                          onSelect={() => setTextFont(opt.id)}
                        >
                          <span className="flex-1">{opt.label}</span>
                          {textFont === opt.id ? <IconCheck size={14} className="text-primary" /> : null}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                        Background
                      </DropdownMenuItem>
                      {TEXT_THEMES.map((opt) => (
                        <DropdownMenuItem
                          key={opt.id}
                          className="cursor-pointer gap-2"
                          onSelect={() => setTextTheme(opt.id)}
                        >
                          <span className="flex-1">{opt.label}</span>
                          {textTheme === opt.id ? <IconCheck size={14} className="text-primary" /> : null}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="cursor-pointer gap-2"
                        onSelect={() => setTextWrap((v) => !v)}
                      >
                        <span className="flex-1">Word wrap</span>
                        {textWrap ? <IconCheck size={14} className="text-primary" /> : null}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    type="button"
                    size="sm"
                    className="sd-btn-gradient rounded-full h-8 px-3"
                    disabled={!dirty || saving || !agencyId}
                    onClick={handleSaveText}
                  >
                    <IconDeviceFloppy size={15} />
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                </div>
              </div>
              <TextRichEditor
                valueHtml={draftText}
                onChangeHtml={setDraftText}
                onSaveShortcut={handleSaveText}
                className={`is-size-${textSize} is-font-${textFont}${textWrap ? ' is-wrap' : ''}`}
              />
            </div>
          ) : kind === 'text' && text != null ? (
            <pre className="sd-file-preview__text">{text}</pre>
          ) : kind === 'sheet' && grid ? (
            <div className="sd-sheet-preview">
              <div className="sd-sheet-preview__toolbar">
                <span className="sd-sheet-preview__toolbar-label">
                  {activeSheet || 'Sheet'}
                </span>
                <PreviewZoomBar
                  zoom={sheetZoom}
                  onZoomIn={zoomIn}
                  onZoomOut={zoomOut}
                  onZoomReset={zoomReset}
                />
              </div>

              <div className="sd-sheet-preview__scroll">
                <div
                  className="sd-sheet-preview__scale"
                  style={{ '--sheet-zoom': sheetZoom / 100 }}
                >
                  <table className="sd-sheet-preview__table">
                    <thead>
                      <tr>
                        <th
                          className="sd-sheet-preview__corner"
                          scope="col"
                          onMouseDown={blockHeaderSelect}
                        />
                        {Array.from({ length: colCount }, (_, c) => (
                          <th
                            key={`col-${c}`}
                            className="sd-sheet-preview__colhead"
                            scope="col"
                            onMouseDown={blockHeaderSelect}
                          >
                            {colLabel(c)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {grid.map((row, r) => (
                        <tr key={`row-${r}`}>
                          <th
                            className="sd-sheet-preview__rowhead"
                            scope="row"
                            onMouseDown={blockHeaderSelect}
                          >
                            {r + 1}
                          </th>
                          {row.map((cell, c) => (
                            <td key={`cell-${r}-${c}`}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="sd-sheet-preview__tabs" role="tablist" aria-label="Sheets">
                {(sheetData?.sheetNames || []).map((sheetName) => (
                  <button
                    key={sheetName}
                    type="button"
                    role="tab"
                    aria-selected={sheetName === activeSheet}
                    className={`sd-sheet-preview__tab${sheetName === activeSheet ? ' is-active' : ''}`}
                    onClick={() => setActiveSheet(sheetName)}
                  >
                    {sheetName}
                  </button>
                ))}
              </div>
            </div>
          ) : kind === 'word' && wordHtml != null ? (
            <div className={`sd-word-preview sd-word-preview--stage-${wordStage}`}>
              <div className="sd-sheet-preview__toolbar sd-word-preview__toolbar">
                <span className="sd-sheet-preview__toolbar-label">A4 print layout · 210 × 297 mm</span>
                <div className="sd-word-preview__tools">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="sd-sheet-preview__zoom-btn sd-word-preview__customize"
                        aria-label="Customize view"
                        title="Customize"
                      >
                        <IconAdjustmentsHorizontal size={16} stroke={1.75} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[12.5rem]">
                      <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                        Margins (A4)
                      </DropdownMenuItem>
                      {WORD_WIDTHS.map((opt) => (
                        <DropdownMenuItem
                          key={opt.id}
                          className="cursor-pointer gap-2"
                          onSelect={() => setWordWidth(opt.id)}
                        >
                          <span className="flex-1">{opt.label}</span>
                          {wordWidth === opt.id ? <IconCheck size={14} className="text-primary" /> : null}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                        Background
                      </DropdownMenuItem>
                      {WORD_STAGES.map((opt) => (
                        <DropdownMenuItem
                          key={opt.id}
                          className="cursor-pointer gap-2"
                          onSelect={() => setWordStage(opt.id)}
                        >
                          <span className="flex-1">{opt.label}</span>
                          {wordStage === opt.id ? <IconCheck size={14} className="text-primary" /> : null}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <PreviewZoomBar
                    zoom={wordZoom}
                    onZoomIn={wordZoomIn}
                    onZoomOut={wordZoomOut}
                    onZoomReset={wordZoomReset}
                  />
                </div>
              </div>
              <div className="sd-word-preview__scroll">
                <div
                  className="sd-word-preview__scale"
                  style={{ '--word-zoom': wordZoom / 100 }}
                >
                  <WordPagesView html={wordHtml} widthClass={wordWidth} />
                </div>
              </div>
            </div>
          ) : kind === 'deck' && pptxBuffer ? (
            <div className="sd-pptx-preview-wrap">
              <div className="sd-sheet-preview__toolbar sd-pptx-preview-wrap__toolbar">
                <span className="sd-sheet-preview__toolbar-label">Presentation</span>
                <PreviewZoomBar
                  zoom={deckZoom}
                  onZoomIn={deckZoomIn}
                  onZoomOut={deckZoomOut}
                  onZoomReset={deckZoomReset}
                />
              </div>
              <div className="sd-pptx-preview-wrap__body">
                <PptxPreviewView buffer={pptxBuffer} zoom={deckZoom} />
              </div>
            </div>
          ) : kind === 'legacy' ? (
            <div className="sd-file-preview__empty">
              <FileFormatIcon name={name} size="lg" />
              <p>
                {ext === 'ppt'
                  ? 'Old .ppt files need PowerPoint on your PC. Save as .pptx for in-app preview.'
                  : ext === 'doc'
                    ? 'Old .doc files need Word on your PC. Save as .docx for in-app preview.'
                    : 'Open this file with the desktop app, or convert to PPTX / DOCX for in-app preview.'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {onDownload ? (
                  <Button type="button" className="sd-btn-gradient rounded-full" onClick={() => onDownload(asset)}>
                    <IconDownload size={15} />
                    Download
                  </Button>
                ) : null}
                {onOpenExternal ? (
                  <Button type="button" variant="outline" className="rounded-full" onClick={() => onOpenExternal(asset)}>
                    <IconExternalLink size={15} />
                    Open with app
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="sd-file-preview__empty">
              <FileFormatIcon name={name} size="lg" />
              <p>No inline preview for this file type.</p>
              {onDownload ? (
                <Button type="button" className="sd-btn-gradient rounded-full" onClick={() => onDownload(asset)}>
                  <IconDownload size={15} />
                  Download
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
