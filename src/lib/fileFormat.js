/**
 * Resolve file extension → color + glyph for FileFormatIcon.
 */

export function getFileExtension(name = '') {
  const base = String(name).split(/[\\/]/).pop() || ''
  const i = base.lastIndexOf('.')
  if (i <= 0 || i === base.length - 1) return ''
  return base.slice(i + 1).toLowerCase()
}

const PRESETS = {
  // Images
  heic: { label: 'HEIC', color: '#3b82f6', kind: 'image' },
  heif: { label: 'HEIF', color: '#3b82f6', kind: 'image' },
  jpg: { label: 'JPG', color: '#3b82f6', kind: 'image' },
  jpeg: { label: 'JPEG', color: '#3b82f6', kind: 'image' },
  png: { label: 'PNG', color: '#3b82f6', kind: 'image' },
  gif: { label: 'GIF', color: '#3b82f6', kind: 'image' },
  webp: { label: 'WEBP', color: '#3b82f6', kind: 'image' },
  svg: { label: 'SVG', color: '#3b82f6', kind: 'image' },
  // Documents
  pdf: { label: 'PDF', color: '#ef4444', kind: 'doc' },
  doc: { label: 'DOC', color: '#2563eb', kind: 'doc' },
  docx: { label: 'DOCX', color: '#2563eb', kind: 'doc' },
  rtf: { label: 'RTF', color: '#2563eb', kind: 'doc' },
  odt: { label: 'ODT', color: '#2563eb', kind: 'doc' },
  txt: { label: 'TXT', color: '#64748b', kind: 'doc' },
  // Presentations
  ppt: { label: 'PPT', color: '#ea580c', kind: 'deck' },
  pptx: { label: 'PPTX', color: '#ea580c', kind: 'deck' },
  odp: { label: 'ODP', color: '#ea580c', kind: 'deck' },
  // Spreadsheets
  xls: { label: 'XLS', color: '#22c55e', kind: 'sheet' },
  xlsx: { label: 'XLSX', color: '#22c55e', kind: 'sheet' },
  csv: { label: 'CSV', color: '#22c55e', kind: 'sheet' },
  ods: { label: 'ODS', color: '#22c55e', kind: 'sheet' },
  // Database
  sql: { label: 'SQL', color: '#38bdf8', kind: 'db' },
  db: { label: 'DB', color: '#38bdf8', kind: 'db' },
  sqlite: { label: 'SQL', color: '#38bdf8', kind: 'db' },
  // Web
  html: { label: 'HTML', color: '#f97316', kind: 'html' },
  htm: { label: 'HTML', color: '#f97316', kind: 'html' },
  css: { label: 'CSS', color: '#0ea5e9', kind: 'code' },
  js: { label: 'JS', color: '#eab308', kind: 'code' },
  jsx: { label: 'JSX', color: '#eab308', kind: 'code' },
  ts: { label: 'TS', color: '#3b82f6', kind: 'code' },
  tsx: { label: 'TSX', color: '#3b82f6', kind: 'code' },
  json: { label: 'JSON', color: '#a855f7', kind: 'code' },
  // Archives
  rar: { label: 'RAR', color: '#8b5cf6', kind: 'archive' },
  zip: { label: 'ZIP', color: '#8b5cf6', kind: 'archive' },
  '7z': { label: '7Z', color: '#8b5cf6', kind: 'archive' },
  // Media
  mp4: { label: 'MP4', color: '#ec4899', kind: 'video' },
  mov: { label: 'MOV', color: '#ec4899', kind: 'video' },
  mp3: { label: 'MP3', color: '#14b8a6', kind: 'audio' },
  wav: { label: 'WAV', color: '#14b8a6', kind: 'audio' },
  // Design
  fig: { label: 'FIG', color: '#a855f7', kind: 'design' },
  ai: { label: 'AI', color: '#f59e0b', kind: 'design' },
  psd: { label: 'PSD', color: '#3b82f6', kind: 'design' },
}

export function resolveFileFormat(nameOrExt) {
  const raw = String(nameOrExt || '')
  const ext = raw.includes('.') ? getFileExtension(raw) : raw.toLowerCase()
  if (PRESETS[ext]) return { ext, ...PRESETS[ext] }
  const label = (ext || 'FILE').slice(0, 4).toUpperCase()
  return { ext: ext || 'file', label, color: '#94a3b8', kind: 'generic' }
}

/** Types browsers can preview inline. */
const INLINE_PREVIEW_EXT = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp',
  'pdf',
  'xls', 'xlsx', 'csv', 'tsv', 'ods',
  'docx',
  'pptx',
  'mp4', 'webm', 'mov', 'm4v',
  'mp3', 'wav', 'ogg', 'm4a', 'aac',
  'txt', 'json', 'md', 'html', 'htm', 'css', 'js', 'jsx', 'ts', 'tsx', 'sql', 'log',
])

/** Legacy Office formats — open preview shell; download to open in desktop app. */
const DEFAULT_APP_EXT = new Set([
  'doc', 'ppt', 'rtf', 'odt', 'odp',
])

export function prefersDefaultAppOpen(name) {
  return DEFAULT_APP_EXT.has(getFileExtension(name))
}

export function canInlinePreview(name) {
  return INLINE_PREVIEW_EXT.has(getFileExtension(name))
}
