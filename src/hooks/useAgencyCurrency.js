import { useEffect, useState } from 'react'
import { agencyApi } from '../services/api'
import useAuthStore from '../store/authStore'
import { DEFAULT_CURRENCY, formatMoney, normalizeCurrency } from '../lib/currency'

const EVENT = 'sparkdraw:currency-changed'

let cachedCurrency = null
let inFlight = null
const subscribers = new Set()

function notify(currency) {
  subscribers.forEach((fn) => fn(currency))
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { currency } }))
  }
}

function readFromAuth() {
  const user = useAuthStore.getState().user
  return user?.agency?.currency ? normalizeCurrency(user.agency.currency) : null
}

function setCached(currency, { syncAuth = true } = {}) {
  const next = normalizeCurrency(currency)
  cachedCurrency = next

  if (syncAuth) {
    const { user, setUser } = useAuthStore.getState()
    if (user?.agency && user.agency.currency !== next) {
      setUser({
        ...user,
        agency: {
          ...user.agency,
          currency: next,
        },
      })
    }
  }

  notify(next)
  return next
}

function loadCurrency() {
  if (cachedCurrency) return Promise.resolve(cachedCurrency)
  if (inFlight) return inFlight

  const fromAuth = readFromAuth()
  if (fromAuth) {
    cachedCurrency = fromAuth
  }

  inFlight = agencyApi
    .show()
    .then((res) => {
      const code = normalizeCurrency(res.data?.data?.currency || fromAuth || DEFAULT_CURRENCY)
      return setCached(code)
    })
    .catch(() => setCached(fromAuth || cachedCurrency || DEFAULT_CURRENCY, { syncAuth: false }))
    .finally(() => {
      inFlight = null
    })

  return inFlight
}

/** Call after Settings saves a new agency currency so the whole app updates. */
export function setAgencyCurrency(currency) {
  return setCached(currency)
}

/** Force re-fetch from API (e.g. after login). */
export function invalidateAgencyCurrencyCache() {
  cachedCurrency = null
  return loadCurrency()
}

/** Current agency ISO currency code (reactive). */
export function useAgencyCurrency() {
  const authCurrency = useAuthStore((s) => s.user?.agency?.currency)
  const [currency, setCurrency] = useState(
    () => cachedCurrency || normalizeCurrency(authCurrency || DEFAULT_CURRENCY),
  )

  useEffect(() => {
    subscribers.add(setCurrency)
    if (authCurrency) {
      const normalized = normalizeCurrency(authCurrency)
      if (!cachedCurrency) cachedCurrency = normalized
      setCurrency(normalized)
    }
    loadCurrency()
    return () => subscribers.delete(setCurrency)
  }, [authCurrency])

  return currency
}

/** Bound formatter that always uses the live agency currency. */
export function useFormatMoney() {
  const currency = useAgencyCurrency()
  return (amount, opts) => formatMoney(amount, currency, opts)
}
