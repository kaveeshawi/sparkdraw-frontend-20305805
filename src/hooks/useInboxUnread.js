import { useEffect } from 'react'
import { create } from 'zustand'
import { messagesApi, teamApi } from '@/services/api'
import useAuthStore from '@/store/authStore'
import { getAgencyId } from '@/lib/media'
import { loadTeamUnreadCounts } from '@/components/inbox/teamInboxStorage'

export const INBOX_UNREAD_EVENT = 'sparkdraw:inbox-unread-refresh'

export function requestInboxUnreadRefresh() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(INBOX_UNREAD_EVENT))
  }
}

function unwrap(res) {
  return res?.data?.data ?? res?.data ?? null
}

let pollTimer = null
let subscribers = 0

async function fetchUnread(get, set) {
  const { userId, agencyId, role } = get()
  if (!userId) {
    set({
      total: 0,
      clientsTotal: 0,
      teamTotal: 0,
      byClientId: {},
      byMember: {},
      threads: [],
      loading: false,
    })
    return
  }

  set({ loading: true })
  try {
    const [unreadRes, teamRes] = await Promise.allSettled([
      messagesApi.unread(),
      ['admin', 'pm', 'member'].includes(role) ? teamApi.index() : Promise.resolve(null),
    ])

    let clientsTotal = 0
    let byClientId = {}
    let threads = []

    if (unreadRes.status === 'fulfilled') {
      const data = unwrap(unreadRes.value) || {}
      clientsTotal = Number(data.total || 0)
      threads = Array.isArray(data.threads) ? data.threads : []
      byClientId = {}
      for (const row of Array.isArray(data.clients) ? data.clients : []) {
        byClientId[row.client_id] = Number(row.unread || 0)
      }
    }

    let teamTotal = 0
    let byMember = {}
    if (teamRes.status === 'fulfilled' && teamRes.value && agencyId) {
      const members = Array.isArray(teamRes.value.data?.data) ? teamRes.value.data.data : []
      const ids = members
        .filter((m) => m.id !== userId && m.invite_status !== 'access_revoked')
        .map((m) => m.id)
      const counts = await loadTeamUnreadCounts(agencyId, userId, ids)
      teamTotal = counts.total
      byMember = counts.byMember
    }

    set({
      clientsTotal: Math.max(0, clientsTotal),
      teamTotal: Math.max(0, teamTotal),
      total: Math.max(0, clientsTotal) + Math.max(0, teamTotal),
      byClientId,
      byMember,
      threads,
      loading: false,
    })
  } catch {
    set({ loading: false })
  }
}

function ensurePolling(get, set) {
  if (pollTimer || typeof window === 'undefined') return
  pollTimer = window.setInterval(() => {
    fetchUnread(get, set)
  }, 20000)
}

function stopPollingIfIdle() {
  if (subscribers > 0 || !pollTimer || typeof window === 'undefined') return
  window.clearInterval(pollTimer)
  pollTimer = null
}

export const useInboxUnreadStore = create((set, get) => ({
  userId: null,
  agencyId: null,
  role: null,
  loading: false,
  total: 0,
  clientsTotal: 0,
  teamTotal: 0,
  byClientId: {},
  byMember: {},
  threads: [],

  setIdentity: (userId, agencyId, role) => {
    const prev = get()
    if (prev.userId === userId && prev.agencyId === agencyId && prev.role === role) return
    set({ userId, agencyId, role })
    if (userId) fetchUnread(get, set)
    else {
      set({
        total: 0,
        clientsTotal: 0,
        teamTotal: 0,
        byClientId: {},
        byMember: {},
        threads: [],
      })
    }
  },

  refresh: () => fetchUnread(get, set),

  attach: () => {
    subscribers += 1
    ensurePolling(get, set)
    const onRefresh = () => fetchUnread(get, set)
    if (typeof window !== 'undefined') {
      window.addEventListener(INBOX_UNREAD_EVENT, onRefresh)
    }
    return () => {
      subscribers = Math.max(0, subscribers - 1)
      if (typeof window !== 'undefined') {
        window.removeEventListener(INBOX_UNREAD_EVENT, onRefresh)
      }
      stopPollingIfIdle()
    }
  },
}))

/**
 * Shared WhatsApp-style unread counters for inbox / portal / header.
 */
export default function useInboxUnread() {
  const user = useAuthStore((s) => s.user)
  const agencyId = getAgencyId(user)

  const loading = useInboxUnreadStore((s) => s.loading)
  const total = useInboxUnreadStore((s) => s.total)
  const clientsTotal = useInboxUnreadStore((s) => s.clientsTotal)
  const teamTotal = useInboxUnreadStore((s) => s.teamTotal)
  const byClientId = useInboxUnreadStore((s) => s.byClientId)
  const byMember = useInboxUnreadStore((s) => s.byMember)
  const threads = useInboxUnreadStore((s) => s.threads)
  const setIdentity = useInboxUnreadStore((s) => s.setIdentity)
  const refresh = useInboxUnreadStore((s) => s.refresh)
  const attach = useInboxUnreadStore((s) => s.attach)

  useEffect(() => {
    setIdentity(user?.id ?? null, agencyId || null, user?.role ?? null)
  }, [user?.id, agencyId, user?.role, setIdentity])

  useEffect(() => attach(), [attach])

  return {
    loading,
    total,
    clientsTotal,
    teamTotal,
    byClientId,
    byMember,
    threads,
    refresh,
    clientUnread: (clientId) => Number(byClientId[clientId] || 0),
    memberUnread: (memberId) => Number(byMember[memberId] || 0),
    threadUnread: (projectId, peerUserId = 0) => {
      const peer = Number(peerUserId || 0)
      const row = threads.find(
        (t) => Number(t.project_id) === Number(projectId) && Number(t.peer_user_id) === peer
      )
      return Number(row?.unread || 0)
    },
  }
}
