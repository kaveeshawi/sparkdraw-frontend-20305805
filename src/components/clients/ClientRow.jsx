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

export default function ClientRow({ client, onClick, showContact = true }) {
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
      className="sd-team-list-row sd-client-list-row sd-row cursor-pointer"
    >
      <div className="sd-team-list-row__avatar-wrap">
        <ClientAvatar client={client} className="size-12 shrink-0 text-sm" />
      </div>

      <div className="sd-team-list-row__body">
        <div className="sd-team-list-row__head">
          <p className="sd-team-list-row__name">{personName}</p>
        </div>

        <div className="sd-team-list-row__facts">
          <p className="sd-team-card__fact-line" title={position}>
            <IconBriefcase size={13} stroke={1.65} className="sd-team-card__fact-icon" aria-hidden />
            <span className="sd-team-card__fact-key">Position</span>
            <span className="sd-team-card__fact-sep">-</span>
            <span className="sd-team-card__fact-val">{position}</span>
          </p>
          <p className="sd-team-card__fact-line sd-team-card__fact-line--company" title={companyName}>
            <IconBuilding size={13} stroke={1.65} className="sd-team-card__fact-icon" aria-hidden />
            <span className="sd-team-card__fact-key">Company</span>
            <span className="sd-team-card__fact-sep">-</span>
            <span className="sd-team-card__fact-val">{companyName}</span>
          </p>
          <p className="sd-team-card__fact-line" title={projectsText}>
            <IconBriefcase size={13} stroke={1.65} className="sd-team-card__fact-icon" aria-hidden />
            <span className="sd-team-card__fact-key">Projects</span>
            <span className="sd-team-card__fact-sep">-</span>
            <span className="sd-team-card__fact-val">{projectsText}</span>
          </p>
          {hasContact && email ? (
            <div className="sd-team-card__email-row sd-team-list-row__email">
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
      </div>

      <div className="sd-team-list-row__footer">
        {CONTACT_ACTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className="sd-team-action-btn sd-team-list-row__contact"
            aria-label={label}
            onClick={(e) => handleClientContactAction(e, id, client)}
          >
            <span className="sd-team-action-btn__icon" aria-hidden>
              <ContactActionIcon actionId={id} icon={Icon} size={20} stroke={1.6} />
            </span>
            <span className="sd-team-action-btn__label">{label}</span>
          </button>
        ))}
        <button
          type="button"
          className="sd-client-card__portal sd-client-card__portal--sm"
          onClick={openPortal}
        >
          Portal
          <IconExternalLink size={12} stroke={1.75} />
        </button>
      </div>
    </div>
  )
}
