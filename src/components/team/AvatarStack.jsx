import { useEffect, useState } from 'react'
import { cn, getInitials } from '@/lib/utils'
import { displayMemberName, memberPhotoSrc } from './team-utils'

const MAX_FACES = 2

function StackAvatar({ member, sizeClass, style }) {
  const [errored, setErrored] = useState(false)
  const src = memberPhotoSrc(member)
  const name = displayMemberName(member)

  useEffect(() => {
    setErrored(false)
  }, [src])

  const showPhoto = Boolean(src) && !errored

  return (
    <span
      className={cn('sd-avatar-stack__face inline-flex shrink-0 overflow-hidden', sizeClass)}
      style={style}
    >
      {showPhoto ? (
        <img
          key={src}
          src={src}
          alt=""
          className="size-full object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        <span className="sd-avatar-stack__fallback inline-flex size-full items-center justify-center font-medium">
          {getInitials(name)}
        </span>
      )}
    </span>
  )
}

export default function AvatarStack({ members = [], className, size = 'md' }) {
  const list = members || []
  const visible = list.slice(0, MAX_FACES)
  const overflow = Math.max(0, list.length - MAX_FACES)
  const sizeClass = size === 'sm' ? 'size-7 text-[10px]' : 'size-8 text-[11px]'

  if (list.length === 0) {
    return (
      <div className={cn('sd-avatar-stack sd-avatar-stack--empty', className)} aria-hidden>
        <span className={cn('sd-avatar-stack__empty', sizeClass)} />
      </div>
    )
  }

  return (
    <div
      className={cn('sd-avatar-stack', className)}
      aria-label={`${list.length} member${list.length === 1 ? '' : 's'}`}
    >
      {visible.map((member, index) => (
        <StackAvatar
          key={member.id ?? `${member.email}-${index}`}
          member={member}
          sizeClass={sizeClass}
          style={{ zIndex: visible.length - index }}
        />
      ))}
      {overflow > 0 && (
        <span
          className={cn('sd-avatar-stack__more', sizeClass)}
          style={{ zIndex: 0 }}
        >
          {overflow}+
        </span>
      )}
    </div>
  )
}
