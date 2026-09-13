import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { IconSend, IconUsers, IconBuilding } from '@tabler/icons-react'
import PageWrapper from '../components/layout/PageWrapper'
import FloatPageHeader from '../components/layout/FloatPageHeader'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { clientsApi, projectsApi, messagesApi, teamApi } from '../services/api'
import useAuthStore from '../store/authStore'
import { getInitials } from '@/lib/utils'
import { getAgencyId, memberPhotoSrc } from '@/lib/media'
import { displayMemberName, ROLE_LABELS } from '../components/team/team-utils'
import UnreadBadge from '../components/inbox/UnreadBadge'
import useInboxUnread, { requestInboxUnreadRefresh } from '../hooks/useInboxUnread'
import {
  appendTeamMessage,
  listTeamMessages,
  loadTeamThreadPreviews,
  markTeamThreadRead,
} from '../components/inbox/teamInboxStorage'

const CHANNELS = [
  { id: 'clients', label: 'Clients', icon: IconBuilding },
  { id: 'team', label: 'Team', icon: IconUsers },
]

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) {
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function normalizeList(payload, key) {
  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray(payload[key])) return payload[key]
  return []
}

function parseChannel(value) {
  return value === 'team' ? 'team' : 'clients'
}

/** Build client inbox rows from projects when /clients is empty (e.g. members). */
function clientsFromProjects(projectList = []) {
  const map = new Map()
  for (const project of projectList) {
    const c = project?.client
    if (!c?.id || map.has(c.id)) continue
    map.set(c.id, {
      id: c.id,
      company_name: c.company_name || 'Client',
      contact_user_id: c.contact_user_id || c.contact_user?.id || null,
    })
  }
  return [...map.values()]
}

export default function InboxPage() {
  const { user } = useAuthStore()
  const agencyId = getAgencyId(user)
  const [searchParams, setSearchParams] = useSearchParams()
  const channel = parseChannel(searchParams.get('channel'))

  const [clients, setClients] = useState([])
  const [projects, setProjects] = useState([])
  const [members, setMembers] = useState([])
  const [selectedClientId, setSelectedClientId] = useState(null)
  const [selectedMemberId, setSelectedMemberId] = useState(null)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')
  const [teamTick, setTeamTick] = useState(0)
  const [teamPreviews, setTeamPreviews] = useState({})
  const [clientThreadMode, setClientThreadMode] = useState('overall') // overall | direct
  const threadEndRef = useRef(null)
  const unread = useInboxUnread()

  const setChannel = (next) => {
    const nextChannel = parseChannel(next)
    const params = new URLSearchParams(searchParams)
    params.set('channel', nextChannel)
    if (nextChannel === 'team') {
      params.delete('client')
      if (selectedMemberId) params.set('member', String(selectedMemberId))
      else params.delete('member')
    } else {
      params.delete('member')
      if (selectedClientId) params.set('client', String(selectedClientId))
      else params.delete('client')
    }
    setSearchParams(params, { replace: true })
    setSearch('')
    setDraft('')
    setMessages([])
  }

  const clientThreads = useMemo(() => {
    const projectList = Array.isArray(projects) ? projects : []
    const clientList = Array.isArray(clients) ? clients : []
    return clientList.map((client) => {
      const clientProjects = projectList.filter((p) => p.client_id === client.id)
      const fromUnread = (unread.threads || []).find((t) => Number(t.client_id) === Number(client.id))
      const project =
        clientProjects.find((p) => p.status === 'active') ||
        clientProjects[0] ||
        (fromUnread?.project_id
          ? {
              id: fromUnread.project_id,
              name: fromUnread.client_name
                ? `${fromUnread.client_name} project`
                : 'Project',
              client_id: client.id,
              status: 'active',
            }
          : null)
      return {
        client,
        project,
        preview: project ? project.name : 'No active project',
      }
    })
  }, [clients, projects, unread.threads])

  const teamThreads = useMemo(() => {
    const list = Array.isArray(members) ? members : []
    return list
      .filter((m) => m.id !== user?.id && m.invite_status !== 'access_revoked')
      .map((member) => {
        const preview =
          teamPreviews[member.id] ||
          ROLE_LABELS[member.role] ||
          member.role ||
          'Team member'
        return { member, preview }
      })
  }, [members, user?.id, teamPreviews])

  useEffect(() => {
    let cancelled = false
    const ids = (members || [])
      .filter((m) => m.id !== user?.id && m.invite_status !== 'access_revoked')
      .map((m) => m.id)
    if (!agencyId || !user?.id || !ids.length) {
      setTeamPreviews({})
      return undefined
    }
    loadTeamThreadPreviews(agencyId, user.id, ids)
      .then((map) => {
        if (!cancelled) setTeamPreviews(map)
      })
      .catch(() => {
        if (!cancelled) setTeamPreviews({})
      })
    return () => {
      cancelled = true
    }
  }, [agencyId, user?.id, members, teamTick])

  const filteredClientThreads = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return clientThreads
    return clientThreads.filter(
      (t) =>
        t.client.company_name?.toLowerCase().includes(q) ||
        t.preview?.toLowerCase().includes(q)
    )
  }, [clientThreads, search])

  const filteredTeamThreads = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return teamThreads
    return teamThreads.filter((t) => {
      const name = displayMemberName(t.member).toLowerCase()
      const role = (ROLE_LABELS[t.member.role] || t.member.role || '').toLowerCase()
      return name.includes(q) || role.includes(q) || t.preview?.toLowerCase().includes(q)
    })
  }, [teamThreads, search])

  const selectedClientThread = clientThreads.find((t) => t.client.id === selectedClientId)
  const selectedTeamThread = teamThreads.find((t) => t.member.id === selectedMemberId)
  const selectedProjectId = selectedClientThread?.project?.id
  const selectedClientContactId = selectedClientThread?.client?.contact_user_id || null

  const loadInbox = useCallback(() => {
    setLoading(true)
    Promise.all([
      clientsApi.index().catch(() => ({ data: { data: [] } })),
      projectsApi.index(),
      teamApi.index(),
      messagesApi.unread().catch(() => ({ data: { data: { clients: [], threads: [] } } })),
    ])
      .then(([clientsRes, projectsRes, teamRes, unreadRes]) => {
        const projectList = normalizeList(projectsRes.data.data, 'projects')
        let clientList = normalizeList(clientsRes.data?.data, 'clients')
        if (!clientList.length) {
          clientList = clientsFromProjects(projectList)
        } else {
          const fromProjects = clientsFromProjects(projectList)
          const byId = new Map(fromProjects.map((c) => [c.id, c]))
          clientList = clientList.map((c) => ({
            ...c,
            contact_user_id:
              c.contact_user_id ||
              c.contact_user?.id ||
              byId.get(c.id)?.contact_user_id ||
              null,
          }))
        }

        // Merge clients that only appear via DMs / unread (member may lack clients.manage).
        const unreadData = unreadRes?.data?.data || unreadRes?.data || {}
        const unreadClients = Array.isArray(unreadData.clients) ? unreadData.clients : []
        const unreadThreads = Array.isArray(unreadData.threads) ? unreadData.threads : []
        const byClientId = new Map(clientList.map((c) => [c.id, c]))
        for (const row of unreadClients) {
          const id = Number(row.client_id)
          if (!id || byClientId.has(id)) {
            if (id && byClientId.has(id) && !byClientId.get(id).contact_user_id && row.contact_user_id) {
              byClientId.set(id, {
                ...byClientId.get(id),
                contact_user_id: row.contact_user_id,
              })
            }
            continue
          }
          byClientId.set(id, {
            id,
            company_name: row.company_name || 'Client',
            contact_user_id: row.contact_user_id || null,
          })
        }
        for (const row of unreadThreads) {
          const id = Number(row.client_id)
          if (!id || byClientId.has(id)) continue
          byClientId.set(id, {
            id,
            company_name: row.client_name || 'Client',
            contact_user_id: row.contact_user_id || null,
          })
        }

        // Ensure stub projects exist for DM-only access.
        const projectById = new Map(projectList.map((p) => [p.id, p]))
        for (const row of unreadThreads) {
          const pid = Number(row.project_id)
          if (!pid || projectById.has(pid)) continue
          projectById.set(pid, {
            id: pid,
            name: row.client_name ? `${row.client_name} project` : `Project #${pid}`,
            client_id: row.client_id,
            status: 'active',
            client: row.client_id
              ? {
                  id: row.client_id,
                  company_name: row.client_name || 'Client',
                  contact_user_id: row.contact_user_id || null,
                }
              : null,
          })
        }

        const memberList = Array.isArray(teamRes.data.data) ? teamRes.data.data : []
        setClients([...byClientId.values()])
        setProjects([...projectById.values()])
        setMembers(memberList)
      })
      .catch(() => {
        setClients([])
        setProjects([])
        setMembers([])
      })
      .finally(() => setLoading(false))
  }, [])

  // Sync selection from loaded lists + URL deep links
  useEffect(() => {
    if (loading) return
    const clientParam = Number(searchParams.get('client')) || null
    const memberParam = Number(searchParams.get('member')) || null
    const others = members.filter((m) => m.id !== user?.id && m.invite_status !== 'access_revoked')

    setSelectedClientId((prev) => {
      if (clientParam && clients.some((c) => c.id === clientParam)) return clientParam
      if (prev && clients.some((c) => c.id === prev)) return prev
      return clients[0]?.id ?? null
    })
    setSelectedMemberId((prev) => {
      if (memberParam && others.some((m) => m.id === memberParam)) return memberParam
      if (prev && others.some((m) => m.id === prev)) return prev
      return others[0]?.id ?? null
    })
  }, [loading, clients, members, user?.id, searchParams])

  const loadClientMessages = useCallback((projectId, mode = 'overall', contactUserId = null) => {
    if (!projectId) {
      setMessages([])
      return
    }
    if (mode === 'direct' && !contactUserId) {
      setMessages([])
      return
    }
    setLoadingMessages(true)
    const params = mode === 'direct' ? { with: contactUserId } : { thread: 'overall' }
    messagesApi
      .index(projectId, params)
      .then(async (res) => {
        const list = (res.data.data || []).slice().reverse()
        setMessages(list)
        try {
          await messagesApi.markRead(
            projectId,
            mode === 'direct' ? { with: contactUserId } : {}
          )
          requestInboxUnreadRefresh()
        } catch {
          /* ignore mark-read failures */
        }
      })
      .catch(() => setMessages([]))
      .finally(() => setLoadingMessages(false))
  }, [])

  const loadTeamMessages = useCallback(async (memberId) => {
    if (!memberId || !user?.id || !agencyId) {
      setMessages([])
      return
    }
    setLoadingMessages(true)
    try {
      const list = await listTeamMessages(agencyId, user.id, memberId)
      setMessages(list)
      const lastAt = list[list.length - 1]?.created_at || new Date().toISOString()
      await markTeamThreadRead(agencyId, user.id, memberId, lastAt)
      requestInboxUnreadRefresh()
    } catch {
      setMessages([])
    } finally {
      setLoadingMessages(false)
    }
  }, [agencyId, user?.id])

  useEffect(() => {
    loadInbox()
  }, [loadInbox])

  useEffect(() => {
    if (channel === 'team') {
      loadTeamMessages(selectedMemberId)
    } else {
      loadClientMessages(selectedProjectId, clientThreadMode, selectedClientContactId)
    }
  }, [
    channel,
    selectedMemberId,
    selectedProjectId,
    selectedClientContactId,
    clientThreadMode,
    loadTeamMessages,
    loadClientMessages,
  ])

  // Prefer Direct when that's where unread lives (client portal DMs).
  useEffect(() => {
    if (channel !== 'clients' || !selectedProjectId || !selectedClientContactId) return
    const directUnread = unread.threadUnread(selectedProjectId, selectedClientContactId)
    const overallUnread = unread.threadUnread(selectedProjectId, 0)
    if (directUnread > 0 && overallUnread === 0) {
      setClientThreadMode('direct')
    }
  }, [
    channel,
    selectedProjectId,
    selectedClientContactId,
    unread.threads,
  ])

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const selectClient = (id) => {
    setSelectedClientId(id)
    setClientThreadMode('overall')
    setDraft('')
    const params = new URLSearchParams(searchParams)
    params.set('channel', 'clients')
    params.set('client', String(id))
    params.delete('member')
    setSearchParams(params, { replace: true })
  }

  const selectMember = (id) => {
    setSelectedMemberId(id)
    const params = new URLSearchParams(searchParams)
    params.set('channel', 'team')
    params.set('member', String(id))
    params.delete('client')
    setSearchParams(params, { replace: true })
  }

  const handleSend = async (e) => {
    e.preventDefault()
    const body = draft.trim()
    if (!body || sending) return

    if (channel === 'team') {
      if (!selectedMemberId || !user?.id || !agencyId) return
      setSending(true)
      try {
        const msg = await appendTeamMessage(agencyId, user.id, selectedMemberId, body)
        setMessages((prev) => [...prev, msg])
        setTeamTick((n) => n + 1)
        setDraft('')
        requestInboxUnreadRefresh()
      } catch {
        // keep draft on failure
      } finally {
        setSending(false)
      }
      return
    }

    if (!selectedProjectId) return
    if (clientThreadMode === 'direct' && !selectedClientContactId) return
    setSending(true)
    try {
      const payload =
        clientThreadMode === 'direct'
          ? { body, recipient_id: selectedClientContactId }
          : { body }
      const res = await messagesApi.store(selectedProjectId, payload)
      const msg = res.data.data
      setMessages((prev) => [
        ...prev,
        {
          ...msg,
          sender_id: user?.id,
          sender_name: user?.name,
          sender_role: user?.role,
        },
      ])
      setDraft('')
      requestInboxUnreadRefresh()
    } catch {
      // keep draft on failure
    } finally {
      setSending(false)
    }
  }

  const isTeam = channel === 'team'
  const activeThread = isTeam ? selectedTeamThread : selectedClientThread
  const canSend = isTeam
    ? Boolean(selectedMemberId && !sending)
    : Boolean(
        selectedProjectId &&
          !sending &&
          (clientThreadMode === 'overall' || selectedClientContactId)
      )

  const headerSubtitle = isTeam
    ? 'Internal chat with your agency team.'
    : 'Chat with your clients across projects.'

  return (
    <PageWrapper
      pageActions={
        <FloatPageHeader
          title="Inbox"
          subtitle={headerSubtitle}
        />
      }
    >
      <div className="sd-page sd-page--team sd-page--inbox">
        <div className="sd-inbox">
          <aside className="sd-inbox-sidebar sd-card">
            <div className="sd-inbox-sidebar__head">
              <h2 className="sd-card-title">Inbox</h2>
              <p className="sd-card-desc">{isTeam ? 'Team conversations' : 'Client conversations'}</p>

              <div className="sd-inbox-channels" role="tablist" aria-label="Inbox channel">
                {CHANNELS.map(({ id, label, icon: Icon }) => {
                  const channelUnread =
                    id === 'clients' ? unread.clientsTotal : unread.teamTotal
                  return (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={channel === id}
                      className={`sd-inbox-channel${channel === id ? ' is-active' : ''}`}
                      onClick={() => setChannel(id)}
                    >
                      <Icon size={14} stroke={1.75} />
                      {label}
                      {channelUnread > 0 ? (
                        <span className="sd-inbox-channel-dot" aria-hidden />
                      ) : null}
                    </button>
                  )
                })}
              </div>

              <input
                type="search"
                className="sd-inbox-search"
                placeholder={isTeam ? 'Search team…' : 'Search clients…'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="sd-inbox-thread-list">
              {loading ? (
                <p className="sd-inbox-empty">Loading conversations…</p>
              ) : isTeam ? (
                filteredTeamThreads.length === 0 ? (
                  <p className="sd-inbox-empty">No team members found.</p>
                ) : (
                  filteredTeamThreads.map(({ member, preview }) => {
                    const active = member.id === selectedMemberId
                    const name = displayMemberName(member)
                    const photo = memberPhotoSrc(member)
                    const count = unread.memberUnread(member.id)
                    return (
                      <button
                        key={member.id}
                        type="button"
                        className={`sd-inbox-thread${active ? ' sd-inbox-thread--active' : ''}${count ? ' has-unread' : ''}`}
                        onClick={() => selectMember(member.id)}
                      >
                        <Avatar className="size-9">
                          {photo ? <AvatarImage src={photo} alt={name} /> : null}
                          <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                            {getInitials(name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1 text-left">
                          <p className="truncate text-sm font-medium">{name}</p>
                          <p className="truncate text-xs text-muted-foreground">{preview}</p>
                        </div>
                        <UnreadBadge count={count} />
                      </button>
                    )
                  })
                )
              ) : filteredClientThreads.length === 0 ? (
                <p className="sd-inbox-empty">No clients found.</p>
              ) : (
                filteredClientThreads.map(({ client, preview }) => {
                  const active = client.id === selectedClientId
                  const count = unread.clientUnread(client.id)
                  return (
                    <button
                      key={client.id}
                      type="button"
                      className={`sd-inbox-thread${active ? ' sd-inbox-thread--active' : ''}${count ? ' has-unread' : ''}`}
                      onClick={() => selectClient(client.id)}
                    >
                      <Avatar className="size-9">
                        <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                          {getInitials(client.company_name || 'Client')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="truncate text-sm font-medium">{client.company_name}</p>
                        <p className="truncate text-xs text-muted-foreground">{preview}</p>
                      </div>
                      <UnreadBadge count={count} />
                    </button>
                  )
                })
              )}
            </div>
          </aside>

          <section className="sd-inbox-chat sd-card">
            {!activeThread ? (
              <div className="sd-inbox-chat__empty">
                <p className="text-sm text-muted-foreground">
                  {isTeam ? 'Select a teammate to start chatting.' : 'Select a client to start chatting.'}
                </p>
              </div>
            ) : (
              <>
                <div className="sd-inbox-chat__head">
                  {isTeam ? (
                    <>
                      <Avatar className="size-9">
                        {memberPhotoSrc(selectedTeamThread.member) ? (
                          <AvatarImage
                            src={memberPhotoSrc(selectedTeamThread.member)}
                            alt={displayMemberName(selectedTeamThread.member)}
                          />
                        ) : null}
                        <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                          {getInitials(displayMemberName(selectedTeamThread.member))}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold">
                          {displayMemberName(selectedTeamThread.member)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {ROLE_LABELS[selectedTeamThread.member.role] || selectedTeamThread.member.role || 'Team'}
                          {selectedTeamThread.member.department
                            ? ` · ${selectedTeamThread.member.department}`
                            : ''}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Avatar className="size-9">
                        <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                          {getInitials(selectedClientThread.client.company_name || 'Client')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{selectedClientThread.client.company_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedClientThread.project
                            ? `Project: ${selectedClientThread.project.name}`
                            : 'No project linked'}
                        </p>
                        {selectedProjectId && selectedClientContactId ? (
                          <div className="sd-inbox-thread-modes" role="tablist" aria-label="Client thread type">
                            <button
                              type="button"
                              role="tab"
                              aria-selected={clientThreadMode === 'overall'}
                              className={`sd-inbox-thread-mode${clientThreadMode === 'overall' ? ' is-active' : ''}`}
                              onClick={() => {
                                setClientThreadMode('overall')
                                setDraft('')
                              }}
                            >
                              Project team
                              <UnreadBadge
                                count={unread.threadUnread(selectedProjectId, 0)}
                                className="sd-inbox-unread--inline"
                              />
                            </button>
                            <button
                              type="button"
                              role="tab"
                              aria-selected={clientThreadMode === 'direct'}
                              className={`sd-inbox-thread-mode${clientThreadMode === 'direct' ? ' is-active' : ''}`}
                              onClick={() => {
                                setClientThreadMode('direct')
                                setDraft('')
                              }}
                            >
                              Direct with me
                              <UnreadBadge
                                count={unread.threadUnread(selectedProjectId, selectedClientContactId)}
                                className="sd-inbox-unread--inline"
                              />
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </>
                  )}
                </div>

                <div className="sd-inbox-chat__messages">
                  {loadingMessages ? (
                    <p className="sd-inbox-empty">Loading messages…</p>
                  ) : !isTeam && !selectedProjectId ? (
                    <p className="sd-inbox-empty">Link a project to this client to enable chat.</p>
                  ) : !isTeam && clientThreadMode === 'direct' && !selectedClientContactId ? (
                    <p className="sd-inbox-empty">This client has no contact user for direct chat.</p>
                  ) : messages.length === 0 ? (
                    <p className="sd-inbox-empty">
                      {isTeam
                        ? 'No messages yet. Say hello to your teammate.'
                        : clientThreadMode === 'direct'
                          ? 'No direct messages yet. Reply privately to this client.'
                          : 'No messages yet. Say hello to your client.'}
                    </p>
                  ) : (
                    messages.map((msg) => {
                      const isMine = isTeam
                        ? msg.sender_id === user?.id
                        : clientThreadMode === 'direct'
                          ? msg.sender_id === user?.id
                          : msg.sender_id === user?.id ||
                            ['admin', 'pm', 'member'].includes(msg.sender_role)
                      return (
                        <div
                          key={msg.id}
                          className={`sd-inbox-bubble-row${isMine ? ' sd-inbox-bubble-row--mine' : ''}`}
                        >
                          <div className={`sd-inbox-bubble${isMine ? ' sd-inbox-bubble--mine' : ''}`}>
                            <p>{msg.body}</p>
                            <span>{formatTime(msg.created_at)}</span>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={threadEndRef} />
                </div>

                <form className="sd-inbox-chat__composer" onSubmit={handleSend}>
                  <input
                    type="text"
                    className="sd-inbox-composer-input"
                    placeholder={
                      isTeam
                        ? 'Type a message to your teammate…'
                        : clientThreadMode === 'direct'
                          ? 'Type a private message to this client…'
                          : 'Type a message to your client…'
                    }
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    disabled={!canSend}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="shrink-0 rounded-full"
                    disabled={!draft.trim() || !canSend}
                  >
                    <IconSend size={16} stroke={1.75} />
                  </Button>
                </form>
              </>
            )}
          </section>
        </div>
      </div>
    </PageWrapper>
  )
}
