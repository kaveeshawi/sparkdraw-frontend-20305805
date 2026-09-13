import {
  IconAlertTriangle,
  IconClock,
  IconHeartRateMonitor,
  IconLayoutDashboard,
  IconMessageChatbot,
  IconMoodSad,
  IconSparkles,
  IconTicket,
  IconTrendingUp,
  IconHeartbeat,
} from '@tabler/icons-react'

export const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: IconLayoutDashboard },
  { id: 'health', label: 'Health', icon: IconHeartbeat },
  { id: 'sentiment', label: 'Sentiment', icon: IconMoodSad },
  { id: 'upsell', label: 'Upsell', icon: IconTrendingUp },
  { id: 'translator', label: 'Translator', icon: IconMessageChatbot },
  { id: 'alerts', label: 'Alerts', icon: IconSparkles },
]

export const SECTION_IDS = SECTIONS.map((s) => s.id)

export const FLAG_ORDER = { red: 0, amber: 1, green: 2 }

export const FLAG_META = {
  green: { label: 'On track', className: 'sd-ai-flag sd-ai-flag--green' },
  amber: { label: 'At risk', className: 'sd-ai-flag sd-ai-flag--amber' },
  red: { label: 'Critical', className: 'sd-ai-flag sd-ai-flag--red' },
}

export const ALERT_CONFIG = {
  health_score_critical: {
    label: 'Health critical',
    className: 'sd-ai-alert-icon sd-ai-alert-icon--danger',
    Icon: IconHeartRateMonitor,
  },
  revision_risk_detected: {
    label: 'Revision risk',
    className: 'sd-ai-alert-icon sd-ai-alert-icon--warn',
    Icon: IconAlertTriangle,
  },
  client_sentiment_declining: {
    label: 'Sentiment declining',
    className: 'sd-ai-alert-icon sd-ai-alert-icon--danger',
    Icon: IconMoodSad,
  },
  deadline_at_risk: {
    label: 'Deadline at risk',
    className: 'sd-ai-alert-icon sd-ai-alert-icon--warn',
    Icon: IconClock,
  },
  ai_ticket_generated: {
    label: 'AI ticket generated',
    className: 'sd-ai-alert-icon sd-ai-alert-icon--ai',
    Icon: IconTicket,
  },
}

export function normalizeSection(value) {
  const id = String(value || '').trim().toLowerCase()
  return SECTION_IDS.includes(id) ? id : 'overview'
}

export function timeAgo(dateStr) {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${Math.max(0, mins)}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function sortHealthList(list = []) {
  return [...list].sort((a, b) => {
    const fa = FLAG_ORDER[a.flag] ?? 3
    const fb = FLAG_ORDER[b.flag] ?? 3
    return fa - fb || (a.score ?? 0) - (b.score ?? 0)
  })
}

export function formatServiceType(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function sentimentBarWidth(score) {
  return `${Math.max(4, Math.min(100, (((Number(score) || 0) + 1) / 2) * 100))}%`
}
