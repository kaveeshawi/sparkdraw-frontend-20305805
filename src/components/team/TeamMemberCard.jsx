import { IconBriefcase, IconBuilding, IconCheck, IconCopy, IconExternalLink } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
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

export default function TeamMemberCard({ member, onClick }) {
  const navigate = useNavigate()
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
      className="sd-team-card sd-card sd-card--interactive text-left"
    >
      <div className={`sd-team-card__badge sd-team-card__badge--${availability}`}>
        <span className={`sd-team-card__badge-dot ${statusClass}`} aria-hidden>
          {availability === 'available' && <IconCheck size={6} stroke={2.75} />}
        </span>
        <span className="sd-team-card__badge-label">{label}</span>
      </div>

      <div className="sd-team-card__header">
        <div className="sd-team-card__avatar-wrap">
          <TeamAvatar member={member} className="size-16" />
        </div>
      </div>

      <div className="sd-team-card__body">
        <p className="sd-team-card__name">{displayName}</p>

        <div className="sd-team-card__facts">
          <p className="sd-team-card__fact-line sd-team-card__fact-line--position" title={position}>
            <IconBriefcase size={14} stroke={1.65} className="sd-team-card__fact-icon" aria-hidden />
            <span className="sd-team-card__fact-key">Position</span>
            <span className="sd-team-card__fact-sep">-</span>
            <span className="sd-team-card__fact-val">{position}</span>
          </p>
          <p className="sd-team-card__fact-line" title={department}>
            <IconBuilding size={14} stroke={1.65} className="sd-team-card__fact-icon" aria-hidden />
            <span className="sd-team-card__fact-key">Department</span>
            <span className="sd-team-card__fact-sep">-</span>
            <span className="sd-team-card__fact-val">{department}</span>
          </p>
        </div>

        {member.email ? (
          <div className="sd-team-card__email-row">
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

      <div className="sd-team-card__footer sd-client-card__footer">
        {CONTACT_ACTIONS.map(({ id, label: actionLabel, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className="sd-team-action-btn"
            aria-label={actionLabel}
            onClick={(e) => handleContactAction(e, id, member)}
          >
            <span className="sd-team-action-btn__icon" aria-hidden>
              <ContactActionIcon actionId={id} icon={Icon} size={18} stroke={1.65} />
            </span>
            <span className="sd-team-action-btn__label">{actionLabel}</span>
          </button>
        ))}
        <button
          type="button"
          className="sd-client-card__portal"
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/team/${member.id}/portal`)
          }}
        >
          Portal
          <IconExternalLink size={13} stroke={1.75} />
        </button>
      </div>
    </div>
  )
}
