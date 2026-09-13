import { useId } from 'react'
import { resolveFileFormat } from '@/lib/fileFormat'
import { cn } from '@/lib/utils'

function Glyph({ kind }) {
  if (kind === 'image') {
    return (
      <g fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 18 L9 11 L12.5 15 L15 12 L20 18 Z" />
        <circle cx="8.2" cy="8" r="1.6" fill="currentColor" stroke="none" />
      </g>
    )
  }
  if (kind === 'doc') {
    return (
      <g fill="currentColor">
        <rect x="5" y="9" width="14" height="2.2" rx="1.1" />
        <rect x="5" y="14" width="9" height="2.2" rx="1.1" />
      </g>
    )
  }
  if (kind === 'sheet') {
    return (
      <g fill="currentColor">
        <rect x="5" y="8" width="6" height="6" rx="1.2" />
        <rect x="13" y="8" width="6" height="6" rx="1.2" />
        <rect x="5" y="16" width="6" height="6" rx="1.2" />
        <rect x="13" y="16" width="6" height="6" rx="1.2" />
      </g>
    )
  }
  if (kind === 'db') {
    return (
      <g fill="none" stroke="currentColor" strokeWidth="1.7">
        <ellipse cx="12" cy="8" rx="7" ry="2.4" />
        <path d="M5 8 v5 c0 1.4 3.1 2.4 7 2.4 s7-1 7-2.4 V8" />
        <path d="M5 12.5 c0 1.4 3.1 2.4 7 2.4 s7-1 7-2.4" />
        <path d="M5 16.5 c0 1.4 3.1 2.4 7 2.4 s7-1 7-2.4" />
      </g>
    )
  }
  if (kind === 'html') {
    return (
      <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
        <path d="M12 6.5 L17.5 8.2 L16.4 18.2 L12 20 L7.6 18.2 L6.5 8.2 Z" />
        <text x="12" y="15.2" textAnchor="middle" fill="currentColor" stroke="none" fontSize="7.5" fontWeight="700" fontFamily="system-ui,sans-serif">5</text>
      </g>
    )
  }
  if (kind === 'archive') {
    return (
      <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 14 h10 v6 H7 Z" />
        <path d="M7 14 L12 10 L17 14" />
        <path d="M12 10 v6" />
      </g>
    )
  }
  if (kind === 'video') {
    return (
      <g fill="currentColor">
        <path d="M8 8.5 h6 a1.5 1.5 0 0 1 1.5 1.5 v8 a1.5 1.5 0 0 1 -1.5 1.5 H8 A1.5 1.5 0 0 1 6.5 18 V10 A1.5 1.5 0 0 1 8 8.5 Z" />
        <path d="M15 11.5 L19.5 9 v10 L15 16.5 Z" />
      </g>
    )
  }
  if (kind === 'audio') {
    return (
      <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <path d="M10 18 a2.5 2.5 0 1 0 0-0.01" />
        <path d="M12.5 15.5 V8 l7-1.5 v8" />
        <path d="M19.5 14.5 a2.5 2.5 0 1 0 0-0.01" />
      </g>
    )
  }
  if (kind === 'code' || kind === 'design') {
    return (
      <g fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 9 L5.5 12.5 L9 16" />
        <path d="M15 9 L18.5 12.5 L15 16" />
      </g>
    )
  }
  return (
    <g fill="currentColor">
      <rect x="7" y="6" width="10" height="14" rx="1.5" opacity="0.95" />
      <rect x="9" y="9" width="6" height="1.6" rx="0.8" fill="#fff" opacity="0.55" />
      <rect x="9" y="12.5" width="6" height="1.6" rx="0.8" fill="#fff" opacity="0.55" />
    </g>
  )
}

/**
 * Dog-ear file format badge (HEIC / PDF / XLSX style).
 */
export default function FileFormatIcon({ name, ext, size = 'md', className }) {
  const uid = useId().replace(/:/g, '')
  const format = resolveFileFormat(name || ext || '')
  const foldId = `ff-fold-${uid}`
  return (
    <div
      className={cn('sd-fformat', size === 'sm' && 'sd-fformat--sm', size === 'lg' && 'sd-fformat--lg', className)}
      style={{ ['--ff']: format.color }}
      title={format.label}
      aria-hidden
    >
      <svg className="sd-fformat__shape" viewBox="0 0 56 72" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={foldId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.12" />
          </linearGradient>
        </defs>
        <path
          className="sd-fformat__body"
          d="M8 4 h28 l12 12 v48 a4 4 0 0 1 -4 4 H8 a4 4 0 0 1 -4 -4 V8 a4 4 0 0 1 4 -4 Z"
          fill="var(--ff)"
        />
        <path d={`M36 4 v10 a2 2 0 0 0 2 2 h10 Z`} fill={`url(#${foldId})`} opacity="0.9" />
        <path d="M36 4 l12 12 h-10 a2 2 0 0 1 -2 -2 Z" fill="#fff" opacity="0.28" />
      </svg>
      <svg className="sd-fformat__glyph" viewBox="0 0 24 24" aria-hidden>
        <Glyph kind={format.kind} />
      </svg>
      <span className="sd-fformat__label">{format.label}</span>
    </div>
  )
}
