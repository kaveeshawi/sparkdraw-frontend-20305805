import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  IconAlertTriangle,
  IconBell,
  IconClock,
  IconHeartRateMonitor,
  IconMoodSad,
  IconTicket,
  type Icon,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { alertsApi } from '@/services/api'
import { cn } from '@/lib/utils'

type AlertItem = {
  id: number | string
  event_type: string
  project_id?: number | null
  project_name?: string | null
  metadata?: Record<string, unknown>
  created_at?: string
}

const ALERT_CONFIG: Record<
  string,
  { label: string; Icon: Icon; tone: 'danger' | 'warning' | 'primary' }
> = {
  health_score_critical: {
    label: 'Health critical',
    Icon: IconHeartRateMonitor,
    tone: 'danger',
  },
  revision_risk_detected: {
    label: 'Revision risk',
    Icon: IconAlertTriangle,
    tone: 'warning',
  },
  client_sentiment_declining: {
    label: 'Sentiment declining',
    Icon: IconMoodSad,
    tone: 'danger',
  },
  deadline_at_risk: {
    label: 'Deadline at risk',
    Icon: IconClock,
    tone: 'warning',
  },
  ai_ticket_generated: {
    label: 'AI ticket generated',
    Icon: IconTicket,
    tone: 'primary',
  },
}

const MOCK_ALERTS: AlertItem[] = [
  {
    id: 'mock-1',
    event_type: 'health_score_critical',
    project_name: 'Acme E-Commerce',
    metadata: { score: 32 },
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: 'mock-2',
    event_type: 'ai_ticket_generated',
    project_name: 'NovaTech Rebrand',
    created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
  {
    id: 'mock-3',
    event_type: 'deadline_at_risk',
    project_name: 'Bluewave Campaign',
    metadata: { task: 'Homepage delivery' },
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
]

function timeAgo(dateStr?: string) {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function getAlertMessage(alert: AlertItem) {
  const meta = alert.metadata || {}
  switch (alert.event_type) {
    case 'health_score_critical':
      return `Health score dropped to ${meta.score ?? 'critical level'}`
    case 'revision_risk_detected':
      return `Revision round ${meta.round ?? 3}+ — possible scope creep`
    case 'client_sentiment_declining':
      return 'Client sentiment is trending negative'
    case 'deadline_at_risk':
      return meta.task ? `At risk: ${meta.task}` : 'A milestone deadline is at risk'
    case 'ai_ticket_generated':
      return 'New AI feedback ticket ready for review'
    default:
      return 'New agency alert'
  }
}

function getAlertHref(alert: AlertItem) {
  if (alert.event_type === 'health_score_critical') return '/ai-studio?section=health'
  if (alert.event_type === 'client_sentiment_declining') return '/ai-studio?section=sentiment'
  if (alert.event_type === 'ai_ticket_generated') return '/ai-studio?section=translator'
  if (alert.event_type === 'revision_risk_detected' || alert.event_type === 'deadline_at_risk') {
    return '/ai-studio?section=alerts'
  }
  if (alert.project_id) return `/projects/${alert.project_id}/kanban`
  return '/ai-studio'
}

export function NotificationDropdown() {
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  const loadAlerts = () => {
    setLoading(true)
    alertsApi
      .index(8)
      .then((res) => setAlerts(res.data.data || []))
      .catch(() => setAlerts(MOCK_ALERTS))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadAlerts()
  }, [])

  useEffect(() => {
    if (open) loadAlerts()
  }, [open])

  const hasAlerts = alerts.length > 0

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="sd-header-icon-btn relative"
          aria-label="Notifications"
        >
          <IconBell size={18} stroke={1.75} />
          {hasAlerts && <span className="sd-header-notify-dot" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="sd-notifications-panel w-80 p-0"
        align="end"
        sideOffset={8}
      >
        <div className="sd-notifications-panel__head">
          <div>
            <p className="sd-notifications-panel__title">Notifications</p>
            <p className="sd-notifications-panel__subtitle">
              {hasAlerts ? `${alerts.length} recent alert${alerts.length !== 1 ? 's' : ''}` : 'You are all caught up'}
            </p>
          </div>
          {hasAlerts && (
            <span className="sd-notifications-panel__badge">{alerts.length}</span>
          )}
        </div>

        <div className="sd-notifications-panel__list">
          {loading ? (
            <p className="sd-notifications-empty">Loading notifications…</p>
          ) : alerts.length === 0 ? (
            <div className="sd-notifications-empty-state">
              <div className="sd-notifications-empty-state__icon">
                <IconBell size={20} stroke={1.75} />
              </div>
              <p className="font-medium">No notifications</p>
              <p className="text-xs text-muted-foreground">Alerts will appear here when projects need attention.</p>
            </div>
          ) : (
            alerts.map((alert) => {
              const cfg = ALERT_CONFIG[alert.event_type] || ALERT_CONFIG.ai_ticket_generated
              const AlertIcon = cfg.Icon
              return (
                <Link
                  key={alert.id}
                  to={getAlertHref(alert)}
                  className="sd-notifications-item"
                  onClick={() => setOpen(false)}
                >
                  <div className={cn('sd-notifications-item__icon', `sd-notifications-item__icon--${cfg.tone}`)}>
                    <AlertIcon size={16} stroke={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="sd-notifications-item__title">{cfg.label}</p>
                    <p className="sd-notifications-item__message">{getAlertMessage(alert)}</p>
                    <p className="sd-notifications-item__meta">
                      {alert.project_name || 'Agency'} · {timeAgo(alert.created_at)}
                    </p>
                  </div>
                </Link>
              )
            })
          )}
        </div>

        <div className="sd-notifications-panel__foot">
          <Link to="/ai-studio" className="sd-notifications-panel__link" onClick={() => setOpen(false)}>
            View all insights
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
