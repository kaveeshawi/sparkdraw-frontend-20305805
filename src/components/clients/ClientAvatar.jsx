import { useEffect, useState } from 'react'
import { IconStarFilled } from '@tabler/icons-react'
import { cn, getInitials } from '@/lib/utils'
import { clientPhotoSrc } from '@/lib/media'
import {
  displayContactPersonName,
  getClientTierBadge,
} from './client-utils'

/**
 * Client contact avatar — photo when available, initials fallback + tier star.
 */
export default function ClientAvatar({
  client,
  className,
  fallbackClassName,
  imgClassName,
}) {
  const [errored, setErrored] = useState(false)
  const src = clientPhotoSrc(client)
  const name = displayContactPersonName(client)
  const tierBadge = getClientTierBadge(client)

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
            'inline-flex size-full items-center justify-center rounded-full sd-team-card__avatar-fallback sd-client-card__avatar-fallback',
            fallbackClassName,
          )}
          aria-hidden
        >
          {getInitials(name)}
        </span>
      )}
      {tierBadge ? (
        <span
          className={tierBadge.className}
          aria-label={tierBadge.label}
          title={tierBadge.label}
        >
          <IconStarFilled size={10} stroke={1.5} />
        </span>
      ) : null}
    </span>
  )
}
