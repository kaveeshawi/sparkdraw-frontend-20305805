import { useEffect, useMemo, useRef, useState } from 'react'
import A4Document from '@/components/assets/A4Document'
import useAuthStore from '@/store/authStore'
import { getAgencyId } from '@/lib/media'
import {
  TEMPLATE_EVENT,
  getSelectedTemplateId,
  getTemplateById,
  loadTemplateSettings,
} from '@/lib/documentTemplates'

const DEFAULT_INVOICE_ACCENT = '#0023D7'

/**
 * Build a snapshot of the currently selected Assets invoice template.
 * Stored on the invoice at create time so PDFs stay stable later.
 */
export function buildInvoiceTemplateSnapshot(agencyId) {
  const templateId = getSelectedTemplateId(agencyId, 'invoice')
  const tpl = getTemplateById(agencyId, templateId)
  const settings = loadTemplateSettings(agencyId, templateId) || {}
  return {
    template_id: templateId,
    layout: tpl?.layout || 'invoice-classic',
    accent: settings.accent || tpl?.accent || DEFAULT_INVOICE_ACCENT,
    titleFont: settings.titleFont || 'Georgia, serif',
    bodyFont: settings.bodyFont || 'Inter, sans-serif',
    company: {
      name: settings.companyName || settings.name || undefined,
      address: settings.address || undefined,
      email: settings.email || undefined,
      phone: settings.phone || undefined,
      website: settings.website || undefined,
      logo: settings.logo || undefined,
    },
  }
}

function resolveRenderConfig(agencyId, invoice) {
  const snapshot = invoice?.template_snapshot
  if (snapshot && typeof snapshot === 'object') {
    return {
      templateId: invoice.template_id || snapshot.template_id,
      layout: snapshot.layout || 'invoice-classic',
      accent: snapshot.accent || DEFAULT_INVOICE_ACCENT,
      titleFont: snapshot.titleFont || 'Georgia, serif',
      bodyFont: snapshot.bodyFont || 'Inter, sans-serif',
      company: snapshot.company || {},
    }
  }

  const templateId = getSelectedTemplateId(agencyId, 'invoice')
  const tpl = getTemplateById(agencyId, templateId)
  const settings = loadTemplateSettings(agencyId, templateId) || {}
  return {
    templateId,
    layout: tpl?.layout || 'invoice-classic',
    accent: settings.accent || tpl?.accent || DEFAULT_INVOICE_ACCENT,
    titleFont: settings.titleFont || 'Georgia, serif',
    bodyFont: settings.bodyFont || 'Inter, sans-serif',
    company: {
      name: settings.companyName || settings.name,
      address: settings.address,
      email: settings.email,
      phone: settings.phone,
      website: settings.website,
      logo: settings.logo,
    },
  }
}

/**
 * Live A4 invoice document using Assets-selected template (or invoice snapshot).
 */
export default function InvoiceDocument({
  invoice,
  agencyOverride,
  className,
  scale = 0.55,
  pageRef: externalRef,
}) {
  const user = useAuthStore((s) => s.user)
  const agencyId = agencyOverride || getAgencyId(user)
  const localRef = useRef(null)
  const pageRef = externalRef || localRef
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const onChange = (e) => {
      if (e?.detail?.agencyId && String(e.detail.agencyId) !== String(agencyId)) return
      // Only refresh live previews that are not locked to a snapshot
      if (invoice?.template_snapshot) return
      setTick((n) => n + 1)
    }
    window.addEventListener(TEMPLATE_EVENT, onChange)
    return () => window.removeEventListener(TEMPLATE_EVENT, onChange)
  }, [agencyId, invoice?.template_snapshot])

  const config = useMemo(
    () => resolveRenderConfig(agencyId, invoice),
    // tick forces re-read of localStorage when Assets template changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [agencyId, invoice, tick],
  )

  const agencyName = user?.agency?.name || config.company?.name || 'Your Agency'

  return (
    <div className={`sd-invoice-doc${className ? ` ${className}` : ''}`}>
      <div
        className="sd-invoice-doc__stage"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
        }}
      >
        <A4Document
          pageRef={pageRef}
          layout={config.layout}
          accent={config.accent}
          titleFont={config.titleFont}
          bodyFont={config.bodyFont}
          company={{
            name: agencyName,
            address: config.company?.address,
            email: config.company?.email || user?.agency?.email,
            phone: config.company?.phone || user?.agency?.phone,
            website: config.company?.website,
            logo: config.company?.logo || user?.agency?.logo_url,
          }}
          invoice={invoice}
        />
      </div>
    </div>
  )
}
