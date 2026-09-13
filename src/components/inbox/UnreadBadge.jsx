function UnreadBadge({ count, className = '' }) {
  const n = Number(count) || 0
  if (n <= 0) return null
  return (
    <span className={`sd-inbox-unread ${className}`.trim()} aria-label={`${n} unread`}>
      {n > 99 ? '99+' : n}
    </span>
  )
}

export default UnreadBadge
