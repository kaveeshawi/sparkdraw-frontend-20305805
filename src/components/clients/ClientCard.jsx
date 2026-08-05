import { IconBriefcase, IconBuilding, IconCopy, IconExternalLink } from '@tabler/icons-react'
import { toast } from 'sonner'
import ClientAvatar from './ClientAvatar'
import ContactActionIcon from '../team/ContactActionIcon'
import {
  CONTACT_ACTIONS,
  canShowContactDetails,
  displayClientName,
  displayClientPosition,
  displayContactPersonName,
  handleClientContactAction,
  portalPath,
  projectsCountLabel,
} from './client-utils'

export default function ClientCard({ client, onClick, showContact = true }) {
  const personName = displayContactPersonName(client)
  const companyName = displayClientName(client)
  const position = displayClientPosition(client)
  const email = showContact ? client.contact_email : null
  const hasContact = showContact && canShowContactDetails(client)
  const projectsText = projectsCountLabel(client)

  const copyEmail = async (e) => {
    e.stopPropagation()
    if (!email) return
    try {
      await navigator.clipboard.writeText(email)
      toast.success('Email copied')
    } catch {
      toast.error('Could not copy email')
    }
  }

  const openPortal = (e) => {
    e.stopPropagation()
    window.open(portalPath(client), '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(client)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.(client)
        }
      }}
      className="sd-team-card sd-client-card sd-card sd-card--interactive text-left"
    >
      <div className="sd-team-card__header">
        <div className="sd-team-card__avatar-wrap">
          <ClientAvatar client={client} className="size-16" />
        </div>
      </div>

      <div className="sd-team-card__body">
        <p className="sd-team-card__name">{personName}</p>

        <div className="sd-team-card__facts">
          <p className="sd-team-card__fact-line" title={position}>
            <IconBriefcase size={14} stroke={1.65} className="sd-team-card__fact-icon" aria-hidden />
            <span className="sd-team-card__fact-key">Position</span>
            <span className="sd-team-card__fact-sep">-</span>
            <span className="sd-team-card__fact-val">{position}</span>
          </p>
          <p className="sd-team-card__fact-line sd-team-card__fact-line--company" title={companyName}>
            <IconBuilding size={14} stroke={1.65} className="sd-team-card__fact-icon" aria-hidden />
            <span className="sd-team-card__fact-key">Company</span>
            <span className="sd-team-card__fact-sep">-</span>
            <span className="sd-team-card__fact-val">{companyName}</span>
          </p>
          <p className="sd-team-card__fact-line" title={projectsText}>
            <IconBriefcase size={14} stroke={1.65} className="sd-team-card__fact-icon" aria-hidden />
            <span className="sd-team-card__fact-key">Projects</span>
            <span className="sd-team-card__fact-sep">-</span>
            <span className="sd-team-card__fact-val">{projectsText}</span>
          </p>
        </div>

        {hasContact && email ? (
          <div className="sd-team-card__email-row">
            <p className="sd-team-card__email" title={email}>
              {email}
            </p>
            <button
              type="button"
              className="sd-team-card__copy"
              aria-label="Copy email"
              title="Copy email"
              onClick={copyEmail}
            >
              <IconCopy size={13} stroke={1.75} />
            </button>
          </div>
        ) : null}
      </div>

      <div className="sd-team-card__footer sd-client-card__footer">
        {CONTACT_ACTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className="sd-team-action-btn"
            aria-label={label}
            onClick={(e) => handleClientContactAction(e, id, client)}
          >
            <span className="sd-team-action-btn__icon" aria-hidden>
              <ContactActionIcon actionId={id} icon={Icon} size={18} stroke={1.65} />
            </span>
            <span className="sd-team-action-btn__label">{label}</span>
          </button>
        ))}
        <button
          type="button"
          className="sd-client-card__portal"
          onClick={openPortal}
        >
          Portal
          <IconExternalLink size={13} stroke={1.75} />
        </button>
      </div>
    </div>
  )
}
