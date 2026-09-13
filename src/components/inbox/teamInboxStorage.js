/**
 * Team DM threads in IndexedDB (same approach as Assets folder file blobs).
 * Survives refresh; not browser HTTP cache / session-only storage.
 */

const DB_NAME = 'sparkdraw.teamInbox'
const DB_VERSION = 1
const STORE = 'threads'
const LEGACY_LS_PREFIX = 'sparkdraw.teamInbox.v1.'

function pairKey(userA, userB) {
  return [Number(userA), Number(userB)].sort((a, b) => a - b).join(':')
}

function threadId(agencyId, userA, userB) {
  return `${agencyId}:${pairKey(userA, userB)}`
}

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this browser.'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error || new Error('Failed to open team inbox store'))
  })
}

function idbReq(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed'))
  })
}

async function idbGet(key) {
  const db = await openDb()
  try {
    const tx = db.transaction(STORE, 'readonly')
    return await idbReq(tx.objectStore(STORE).get(key))
  } finally {
    db.close()
  }
}

async function idbPut(key, value) {
  const db = await openDb()
  try {
    const tx = db.transaction(STORE, 'readwrite')
    await idbReq(tx.objectStore(STORE).put(value, key))
  } finally {
    db.close()
  }
}

function readLegacyLocal(agencyId) {
  if (!agencyId || typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(`${LEGACY_LS_PREFIX}${agencyId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function clearLegacyLocal(agencyId) {
  if (!agencyId || typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(`${LEGACY_LS_PREFIX}${agencyId}`)
  } catch {
    /* ignore */
  }
}

/** One-time migrate old localStorage threads into IndexedDB. */
async function migrateLegacyIfNeeded(agencyId) {
  const legacy = readLegacyLocal(agencyId)
  if (!legacy) return

  for (const [pair, messages] of Object.entries(legacy)) {
    if (!Array.isArray(messages) || !messages.length) continue
    const key = `${agencyId}:${pair}`
    const existing = await idbGet(key)
    if (existing?.messages?.length) continue
    await idbPut(key, {
      agencyId,
      pair,
      messages,
      updatedAt: messages[messages.length - 1]?.created_at || new Date().toISOString(),
    })
  }
  clearLegacyLocal(agencyId)
}

export async function listTeamMessages(agencyId, userA, userB) {
  if (!agencyId || !userA || !userB) return []
  await migrateLegacyIfNeeded(agencyId)
  const row = await idbGet(threadId(agencyId, userA, userB))
  return Array.isArray(row?.messages) ? row.messages : []
}

export async function appendTeamMessage(agencyId, fromId, toId, body) {
  if (!agencyId || !fromId || !toId) {
    throw new Error('Missing team inbox identity')
  }
  const text = String(body || '').trim()
  if (!text) throw new Error('Message is empty')

  await migrateLegacyIfNeeded(agencyId)

  const key = threadId(agencyId, fromId, toId)
  const pair = pairKey(fromId, toId)
  const msg = {
    id: `tm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    body: text,
    sender_id: Number(fromId),
    recipient_id: Number(toId),
    created_at: new Date().toISOString(),
  }

  const existing = await idbGet(key)
  const prev = Array.isArray(existing?.messages) ? existing.messages : []
  await idbPut(key, {
    agencyId,
    pair,
    messages: [...prev, msg],
    updatedAt: msg.created_at,
  })

  return msg
}

export async function teamThreadPreview(agencyId, userA, userB) {
  const list = await listTeamMessages(agencyId, userA, userB)
  const last = list[list.length - 1]
  return last?.body || ''
}

/** Prefetch last-message previews for a member list. */
export async function loadTeamThreadPreviews(agencyId, selfId, memberIds = []) {
  if (!agencyId || !selfId) return {}
  await migrateLegacyIfNeeded(agencyId)
  const map = {}
  await Promise.all(
    memberIds.map(async (id) => {
      if (!id || id === selfId) return
      map[id] = await teamThreadPreview(agencyId, selfId, id)
    })
  )
  return map
}

const READS_LS_PREFIX = 'sparkdraw.teamInboxReads.v1.'

function readsKey(agencyId, selfId) {
  return `${READS_LS_PREFIX}${agencyId}.${selfId}`
}

function loadReadsMap(agencyId, selfId) {
  if (!agencyId || !selfId || typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(readsKey(agencyId, selfId))
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveReadsMap(agencyId, selfId, map) {
  if (!agencyId || !selfId || typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(readsKey(agencyId, selfId), JSON.stringify(map))
  } catch {
    /* ignore quota */
  }
}

/** Mark a team DM as read up to now (or latest message time). */
export async function markTeamThreadRead(agencyId, selfId, peerId, atIso = null) {
  if (!agencyId || !selfId || !peerId) return
  const map = loadReadsMap(agencyId, selfId)
  map[String(peerId)] = atIso || new Date().toISOString()
  saveReadsMap(agencyId, selfId, map)
}

/** Unread counts for team DMs keyed by peer user id. */
export async function loadTeamUnreadCounts(agencyId, selfId, memberIds = []) {
  if (!agencyId || !selfId) return { total: 0, byMember: {} }
  await migrateLegacyIfNeeded(agencyId)
  const reads = loadReadsMap(agencyId, selfId)
  let readsDirty = false
  const byMember = {}
  let total = 0

  await Promise.all(
    memberIds.map(async (id) => {
      if (!id || id === selfId) return
      const list = await listTeamMessages(agencyId, selfId, id)
      const lastReadRaw = reads[String(id)]
      let lastRead = lastReadRaw ? new Date(lastReadRaw).getTime() : null

      // First sight of a thread — baseline to latest message so historic
      // IndexedDB backlog never lights the Inbox nav badge.
      if ((lastRead == null || Number.isNaN(lastRead)) && list.length) {
        const lastAt = list[list.length - 1]?.created_at || new Date().toISOString()
        reads[String(id)] = lastAt
        readsDirty = true
        lastRead = new Date(lastAt).getTime()
      }

      if (lastRead == null || Number.isNaN(lastRead)) return

      const unread = list.filter((m) => {
        if (Number(m.sender_id) === Number(selfId)) return false
        const t = new Date(m.created_at).getTime()
        if (Number.isNaN(t)) return false
        return t > lastRead
      }).length
      if (unread > 0) {
        byMember[id] = unread
        total += unread
      }
    })
  )

  if (readsDirty) saveReadsMap(agencyId, selfId, reads)

  return { total, byMember }
}
