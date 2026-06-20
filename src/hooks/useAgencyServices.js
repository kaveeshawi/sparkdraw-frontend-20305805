import { useEffect, useState } from 'react'
import { agencyServicesApi } from '../services/api'

// Module-level cache so every card/row shares one fetch instead of one per component.
let cachedServices = null
let inFlight = null
const subscribers = new Set()

function notify() {
  subscribers.forEach((fn) => fn(cachedServices))
}

function loadServices() {
  if (cachedServices || inFlight) return inFlight
  inFlight = agencyServicesApi
    .index()
    .then((res) => {
      cachedServices = res.data.data || []
      notify()
      return cachedServices
    })
    .catch(() => {
      cachedServices = []
      notify()
      return cachedServices
    })
    .finally(() => {
      inFlight = null
    })
  return inFlight
}

/** Call after add/rename/delete in ManageServicesModal so all cards refresh instantly. */
export function invalidateAgencyServicesCache() {
  cachedServices = null
  loadServices()
}

/** Returns the agency's service catalog, kept in sync with Manage services. */
export function useAgencyServices() {
  const [services, setServices] = useState(cachedServices || [])

  useEffect(() => {
    subscribers.add(setServices)
    loadServices()
    return () => subscribers.delete(setServices)
  }, [])

  return services
}

function normalize(value) {
  return String(value || '').trim().toLowerCase()
}

// Legacy short project-type codes (from early seed data) mapped to their
// full service name, so they still resolve against the Manage services catalog.
const LEGACY_TYPE_ALIASES = {
  web: 'Web Development',
  branding: 'Branding',
  marketing: 'Social Media Marketing',
  mobile: 'App Development',
  design: 'UI/UX Design',
  other: 'Other',
}

/**
 * Resolves a project's stored `type` to the current canonical service name
 * from Manage services (case-insensitive match), falling back to a formatted
 * version of the raw value when no match exists.
 */
export function resolveServiceLabel(services, rawType) {
  if (!rawType) return 'Project'

  const direct = (services || []).find((s) => normalize(s.name) === normalize(rawType))
  if (direct) return direct.name

  const alias = LEGACY_TYPE_ALIASES[normalize(rawType)]
  if (alias) {
    const aliasMatch = (services || []).find((s) => normalize(s.name) === normalize(alias))
    if (aliasMatch) return aliasMatch.name
    return alias
  }

  return String(rawType)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Convenience hook combining useAgencyServices + resolveServiceLabel. */
export function useServiceLabel(rawType) {
  const services = useAgencyServices()
  return resolveServiceLabel(services, rawType)
}
