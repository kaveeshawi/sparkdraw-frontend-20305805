import { useEffect, useState } from 'react'
import { IconStarFilled } from '@tabler/icons-react'
import { cn, getInitials } from '@/lib/utils'
import { displayMemberName, memberPhotoSrc } from './team-utils'

function isAgencyAdmin(member) {
  return member?.role === 'admin' || member?.is_protected
}

function getRoleStarBadge(member) {
  if (isAgencyAdmin(member)) {
    return {
      className: 'sd-team-avatar__admin-star',
      label: 'Agency admin',
    }
  }
  if (member?.role === 'pm') {
    return {
      className: 'sd-team-avatar__pm-star',
      label: 'Project Manager',
    }
  }
  return null
}

/**
 * Team member avatar — uses a native img so uploaded photos render reliably
 * (Radix Avatar fallback was staying visible when remote images loaded slowly).
 */
export default function TeamAvatar({
  member,
  className,
  fallbackClassName,
  imgClassName,
}) {
  const [errored, setErrored] = useState(false)
  const src = memberPhotoSrc(member)
  const name = displayMemberName(member)
  const roleStarBadge = getRoleStarBadge(member)

  useEffect(() => {
    setErrored(false)
  }, [src])

  const showPhoto = Boolean(src) && !errored

  return (
    <span className={cn('sd-team-avatar', className)}>
      {showPhoto ? (
        <img
          key={src}
          src={src}
          alt=""
          className={cn('size-full rounded-full object-cover', imgClassName)}
          onError={() => setErrored(true)}
        />
      ) : (
        <span
          className={cn(
            'inline-flex size-full items-center justify-center rounded-full sd-team-card__avatar-fallback',
            fallbackClassName,
          )}
          aria-hidden
        >
          {getInitials(name)}
        </span>
      )}
      {roleStarBadge ? (
        <span
          className={roleStarBadge.className}
          aria-label={roleStarBadge.label}
          title={roleStarBadge.label}
        >
          <IconStarFilled size={10} stroke={1.5} />
        </span>
      ) : null}
    </span>
  )
}
