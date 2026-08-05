import { IconBriefcase, IconBuilding, IconCheck, IconCopy } from '@tabler/icons-react'
import { toast } from 'sonner'
import {
  AVAILABILITY_DOT,
  AVAILABILITY_LABELS,
  CONTACT_ACTIONS,
  ROLE_LABELS,
  displayDepartment,
  displayMemberName,
  handleContactAction,
} from './team-utils'
import TeamAvatar from './TeamAvatar'
import ContactActionIcon from './ContactActionIcon'

function statusLabel(availability) {
  if (availability === 'available') return 'Online'
  return AVAILABILITY_LABELS[availability] || 'Offline'
}

export default function TeamMemberRow({ member, onClick }) {
  const availability = member.availability || 'offline'
  const statusClass = AVAILABILITY_DOT[availability] || AVAILABILITY_DOT.offline
  const label = statusLabel(availability)
  const position =
    member.job_title?.trim() ||
    ROLE_LABELS[member.role] ||
    member.role ||
    'Team Member'
  const department = displayDepartment(member)
  const displayName = displayMemberName(member)

  const copyEmail = async (e) => {
    e.stopPropagation()
    if (!member.email) return
    try {
      await navigator.clipboard.writeText(member.email)
      toast.success('Email copied')
    } catch {
      toast.error('Could not copy email')
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(member)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.(member)
        }
      }}
      className="sd-team-list-row sd-row cursor-pointer"
    >
      <div className="sd-team-list-row__avatar-wrap">
        <TeamAvatar member={member} className="size-12 shrink-0 text-sm" />
        <span className={`sd-team-status sd-team-status--sm ${statusClass}`} aria-hidden />
      </div>

      <div className="sd-team-list-row__body">
        <div className="sd-team-list-row__head">
          <p className="sd-team-list-row__name">{displayName}</p>
          <span className={`sd-team-list-row__status sd-team-list-row__status--${availability}`}>
            <span className={`sd-team-list-row__status-dot ${statusClass}`} aria-hidden>
              {availability === 'available' && <IconCheck size={5} stroke={2.75} />}
            </span>
            {label}
          </span>
        </div>

        <div className="sd-team-list-row__facts">
          <p className="sd-team-card__fact-line sd-team-card__fact-line--position" title={position}>
            <IconBriefcase size={13} stroke={1.65} className="sd-team-card__fact-icon" aria-hidden />
            <span className="sd-team-card__fact-key">Position</span>
            <span className="sd-team-card__fact-sep">-</span>
            <span className="sd-team-card__fact-val">{position}</span>
          </p>
          <p className="sd-team-card__fact-line" title={department}>
            <IconBuilding size={13} stroke={1.65} className="sd-team-card__fact-icon" aria-hidden />
            <span className="sd-team-card__fact-key">Department</span>
            <span className="sd-team-card__fact-sep">-</span>
            <span className="sd-team-card__fact-val">{department}</span>
          </p>
          {member.email ? (
            <div className="sd-team-card__email-row sd-team-list-row__email">
              <p className="sd-team-card__email" title={member.email}>
                {member.email}
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
        {CONTACT_ACTIONS.map(({ id, label: actionLabel, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className="sd-team-action-btn sd-team-list-row__contact"
            aria-label={actionLabel}
            onClick={(e) => handleContactAction(e, actionLabel)}
          >
            <span className="sd-team-action-btn__icon" aria-hidden>
              <ContactActionIcon actionId={id} icon={Icon} size={20} stroke={1.6} />
            </span>
            <span className="sd-team-action-btn__label">{actionLabel}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
