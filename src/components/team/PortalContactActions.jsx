import { CONTACT_ACTIONS, handleContactAction } from './team-utils'
import ContactActionIcon from './ContactActionIcon'
import { cn } from '@/lib/utils'

/**
 * Shared Chat / Mail / WhatsApp / Teams strip for portal profile headers.
 * `person` needs at least { id?, email? } — same shape as team members / client contacts.
 */
export default function PortalContactActions({
  person,
  className,
  onChat,
  compact = false,
  size = 'lg',
  'aria-label': ariaLabel = 'Contact methods',
}) {
  if (!person) return null

  const iconSize = compact ? 16 : size === 'lg' ? 20 : 18

  return (
    <div
      className={cn(
        'sd-portal-contacts',
        size === 'lg' && !compact && 'sd-portal-contacts--lg',
        compact && 'sd-portal-contacts--compact',
        className,
      )}
      role="group"
      aria-label={ariaLabel}
    >
      {CONTACT_ACTIONS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className={cn(
            'sd-team-action-btn',
            compact && 'sd-team-action-btn--sm',
            size === 'lg' && !compact && 'sd-team-action-btn--lg',
          )}
          aria-label={label}
          title={label}
          onClick={(e) => handleContactAction(e, id, person, { onChat })}
        >
          <span className="sd-team-action-btn__icon" aria-hidden>
            <ContactActionIcon
              actionId={id}
              icon={Icon}
              size={iconSize}
              stroke={1.65}
            />
          </span>
          <span className="sd-team-action-btn__label">{label}</span>
        </button>
      ))}
    </div>
  )
}
