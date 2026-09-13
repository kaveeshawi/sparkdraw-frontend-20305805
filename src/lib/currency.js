/** Agency currency helpers — ISO 4217 codes used across Sparkdraw. */

export const DEFAULT_CURRENCY = 'USD'

export const CURRENCY_OPTIONS = [
  { code: 'LKR', label: 'Sri Lankan Rupee (LKR)' },
  { code: 'USD', label: 'US Dollar (USD)' },
  { code: 'EUR', label: 'Euro (EUR)' },
  { code: 'GBP', label: 'British Pound (GBP)' },
  { code: 'INR', label: 'Indian Rupee (INR)' },
  { code: 'AUD', label: 'Australian Dollar (AUD)' },
  { code: 'CAD', label: 'Canadian Dollar (CAD)' },
  { code: 'SGD', label: 'Singapore Dollar (SGD)' },
  { code: 'AED', label: 'UAE Dirham (AED)' },
  { code: 'JPY', label: 'Japanese Yen (JPY)' },
  { code: 'NZD', label: 'New Zealand Dollar (NZD)' },
  { code: 'CHF', label: 'Swiss Franc (CHF)' },
]

const ALLOWED = new Set(CURRENCY_OPTIONS.map((c) => c.code))

export function normalizeCurrency(code) {
  const next = String(code || DEFAULT_CURRENCY).trim().toUpperCase()
  return ALLOWED.has(next) ? next : DEFAULT_CURRENCY
}

export function currencyLabel(code) {
  const found = CURRENCY_OPTIONS.find((c) => c.code === normalizeCurrency(code))
  return found?.label || normalizeCurrency(code)
}

/**
 * Format a money amount using the agency currency.
 * @param {number|string} amount
 * @param {string} [currency]
 * @param {{ compact?: boolean, maximumFractionDigits?: number, minimumFractionDigits?: number }} [opts]
 */
export function formatMoney(amount, currency = DEFAULT_CURRENCY, opts = {}) {
  const code = normalizeCurrency(currency)
  const n = Number(amount)
  const value = Number.isFinite(n) ? n : 0
  const {
    compact = false,
    maximumFractionDigits,
    minimumFractionDigits,
  } = opts

  if (compact && Math.abs(value) >= 1000) {
    const scaled = value / 1000
    const digits = Math.abs(scaled) >= 10 ? 0 : 1
    try {
      const prefix = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: code,
        maximumFractionDigits: 0,
        minimumFractionDigits: 0,
      }).format(0).replace(/[\d\s.,]/g, '').trim()
      const num = scaled.toFixed(digits)
      return prefix ? `${prefix}${num}K` : `${code} ${num}K`
    } catch {
      return `${code} ${scaled.toFixed(digits)}K`
    }
  }

  const maxDigits = maximumFractionDigits ?? (Number.isInteger(value) ? 0 : 2)
  const minDigits = minimumFractionDigits ?? (maxDigits === 0 ? 0 : Math.min(2, maxDigits))

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      maximumFractionDigits: maxDigits,
      minimumFractionDigits: minDigits,
    }).format(value)
  } catch {
    return `${code} ${value.toLocaleString(undefined, {
      maximumFractionDigits: maxDigits,
      minimumFractionDigits: minDigits,
    })}`
  }
}
