import { useEffect, useRef, useState } from 'react'
import { init } from 'pptx-preview'

/**
 * PPTX slides in a fixed dialog.
 * Zoom = CSS transform on slides only (dialog size never changes).
 */
export default function PptxPreviewView({ buffer, zoom = 100 }) {
  const shellRef = useRef(null)
  const hostRef = useRef(null)
  const paintedKeyRef = useRef('')
  const [slideSize, setSlideSize] = useState({ w: 960, h: 540 })
  const [contentH, setContentH] = useState(540)

  const z = Math.min(2, Math.max(0.5, (Number(zoom) || 100) / 100))

  useEffect(() => {
    const host = hostRef.current
    if (!host || !buffer) return undefined

    let cancelled = false
    let frame = 0

    const viewport = () =>
      shellRef.current?.closest('.sd-pptx-preview-wrap__body')
      || shellRef.current?.parentElement

    const fit = () => {
      const box = viewport()
      const maxW = Math.max(400, (box?.clientWidth || 1000) - 2)
      const maxH = Math.max(240, (box?.clientHeight || 520) - 2)
      let width = Math.min(1200, maxW)
      let height = Math.round(width * 0.5625)
      if (height > maxH) {
        height = maxH
        width = Math.round(height / 0.5625)
      }
      return { width, height }
    }

    const paint = () => {
      if (cancelled || !hostRef.current) return
      const el = hostRef.current
      const { width, height } = fit()
      const key = `${width}x${height}`
      if (paintedKeyRef.current === key && el.childElementCount > 0) return
      paintedKeyRef.current = key
      setSlideSize({ w: width, h: height })
      setContentH(height)

      el.innerHTML = ''
      try {
        const viewer = init(el, { width, height })
        Promise.resolve(viewer.preview(buffer))
          .then(() => {
            if (cancelled || !hostRef.current) return
            const node = hostRef.current
            requestAnimationFrame(() => {
              if (cancelled || !node) return
              // Full deck height for scrolling through slides; slideSize stays one-slide for scale origin
              setContentH(Math.max(height, node.scrollHeight || height))
              setSlideSize({
                w: Math.max(width, node.scrollWidth || width),
                h: height,
              })
            })
          })
          .catch(() => {
            if (!cancelled && el) {
              el.innerHTML = '<p class="sd-pptx-preview__error">Could not render this presentation.</p>'
            }
          })
      } catch {
        el.innerHTML = '<p class="sd-pptx-preview__error">Could not render this presentation.</p>'
      }
    }

    paintedKeyRef.current = ''
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(paint)
    })

    const onResize = () => {
      cancelAnimationFrame(frame)
      paintedKeyRef.current = ''
      frame = requestAnimationFrame(paint)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', onResize)
      if (host) host.innerHTML = ''
    }
  }, [buffer])

  return (
    <div ref={shellRef} className="sd-pptx-preview">
      <div
        className="sd-pptx-preview__zoom-sizer"
        style={{
          width: Math.ceil(slideSize.w * z),
          height: Math.ceil(contentH * z),
          // Do NOT minHeight:100% — that was recreating the empty bottom band when zoomed out
        }}
      >
        <div
          className="sd-pptx-preview__scale"
          style={{
            width: slideSize.w,
            transform: `scale(${z})`,
            transformOrigin: 'top center',
          }}
        >
          <div ref={hostRef} className="sd-pptx-preview__host" />
        </div>
      </div>
    </div>
  )
}
