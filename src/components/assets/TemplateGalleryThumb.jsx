import { useEffect, useMemo, useRef, useState } from 'react'
import {
  galleryPastelFor,
  loadTemplateSettings,
} from '@/lib/documentTemplates'
import { compileLatexPreview } from '@/lib/latexPreview'
import A4Document from './A4Document'
import { fitA4Scale } from '@/lib/a4'

/**
 * Gallery thumb — structured A4 layout by default.
 * LaTeX compile only if this template was Create-manually saved with latexSource.
 */
export default function TemplateGalleryThumb({ template, accent, company, agencyId }) {
  const settings = useMemo(
    () => (agencyId ? loadTemplateSettings(agencyId, template.id) : {}),
    [agencyId, template.id],
  )

  const brand = useMemo(() => ({
    name: settings.companyName || company?.name || 'Your Agency',
    address: settings.address || company?.address || '',
    email: settings.email || company?.email || '',
    phone: settings.phone || company?.phone || '',
    website: settings.website || company?.website || '',
    logo: company?.logo || null,
  }), [company, settings])

  const latex = useMemo(() => {
    if (!template.latexMode || !settings.latexSource) return null
    return compileLatexPreview(settings.latexSource, {
      ...brand,
      accent: settings.accent || template.accent || accent,
      logo: brand.logo,
    })
  }, [template.latexMode, settings, brand, template.accent, accent])

  const layout = template.layout || template.preview || 'letter-formal'
  const pastel = galleryPastelFor(template.id)
  const stageRef = useRef(null)
  const [scale, setScale] = useState(0.28)

  useEffect(() => {
    const node = stageRef.current
    if (!node || template.thumbnail) return undefined
    const measure = () => {
      const { width, height } = node.getBoundingClientRect()
      setScale(fitA4Scale(width - 16, height - 16, 1))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(node)
    return () => ro.disconnect()
  }, [template.thumbnail])

  return (
    <div className="sd-tpl-gallery-thumb" style={{ background: pastel }}>
      {template.thumbnail ? (
        <img src={template.thumbnail} alt="" className="sd-tpl-gallery-thumb__jpg" />
      ) : (
        <div ref={stageRef} className="sd-tpl-gallery-thumb__stage">
          <div
            className="sd-tpl-gallery-thumb__sheet"
            style={{
              width: '210mm',
              height: '297mm',
              transform: `scale(${scale})`,
              transformOrigin: 'center center',
            }}
          >
            <A4Document
              layout={latex?.layoutHint || layout}
              company={brand}
              accent={settings.accent || template.accent || accent}
              titleFont={settings.titleFont || 'Georgia, serif'}
              bodyFont={settings.bodyFont || 'Inter, sans-serif'}
              letterBody={settings.letterBody}
              latex={latex}
            />
          </div>
        </div>
      )}
    </div>
  )
}
