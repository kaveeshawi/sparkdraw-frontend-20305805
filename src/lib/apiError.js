/**
 * Returns a user-safe API error message.
 * Hides raw SQL / stack-style messages from toasts.
 */
export function apiErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  const message = err?.response?.data?.message
  if (!message || typeof message !== 'string') return fallback

  if (/SQLSTATE|Column not found|Integrity constraint|syntax error|Unknown column|Connection:/i.test(message)) {
    return fallback
  }

  // Keep short product messages; truncate pathological dumps
  if (message.length > 180) return fallback

  return message
}
