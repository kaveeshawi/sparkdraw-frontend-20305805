import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { IconSend } from '@tabler/icons-react'
import PageWrapper from '../components/layout/PageWrapper'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { clientsApi, projectsApi, messagesApi } from '../services/api'
import useAuthStore from '../store/authStore'
import { getInitials } from '@/lib/utils'

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

export default function InboxPage() {
  const { user } = useAuthStore()
  const [clients, setClients] = useState([])
  const [projects, setProjects] = useState([])
  const [selectedClientId, setSelectedClientId] = useState(null)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')
  const threadEndRef = useRef(null)

  const threads = useMemo(() => {
    const projectList = Array.isArray(projects) ? projects : []
    const clientList = Array.isArray(clients) ? clients : []
    return clientList.map((client) => {
      const clientProjects = projectList.filter((p) => p.client_id === client.id)
      const project = clientProjects.find((p) => p.status === 'active') || clientProjects[0]
      return {
        client,
        project,
        preview: project ? project.name : 'No active project',
      }
    })
  }, [clients, projects])

  const filteredThreads = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return threads
    return threads.filter(
      (t) =>
        t.client.company_name?.toLowerCase().includes(q) ||
        t.preview?.toLowerCase().includes(q)
    )
  }, [threads, search])

  const selectedThread = threads.find((t) => t.client.id === selectedClientId)
  const selectedProjectId = selectedThread?.project?.id

  const loadInbox = useCallback(() => {
    setLoading(true)
    Promise.all([clientsApi.index(), projectsApi.index()])
      .then(([clientsRes, projectsRes]) => {
        const clientList = normalizeList(clientsRes.data.data, 'clients')
        const projectList = normalizeList(projectsRes.data.data, 'projects')
        setClients(clientList)
        setProjects(projectList)
        setSelectedClientId((prev) => prev ?? clientList[0]?.id ?? null)
      })
      .catch(() => {
        setClients([])
        setProjects([])
      })
      .finally(() => setLoading(false))
  }, [])

  const loadMessages = useCallback((projectId) => {
    if (!projectId) {
      setMessages([])
      return
    }
    setLoadingMessages(true)
    messagesApi
      .index(projectId)
      .then((res) => {
        const list = (res.data.data || []).slice().reverse()
        setMessages(list)
      })
      .catch(() => setMessages([]))
      .finally(() => setLoadingMessages(false))
  }, [])

  useEffect(() => {
    loadInbox()
  }, [])

  useEffect(() => {
    loadMessages(selectedProjectId)
  }, [selectedProjectId, loadMessages])

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e) => {
    e.preventDefault()
    const body = draft.trim()
    if (!body || !selectedProjectId || sending) return

    setSending(true)
    try {
      const res = await messagesApi.store(selectedProjectId, { body })
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
    } catch {
      // keep draft on failure
    } finally {
      setSending(false)
    }
  }

  return (
    <PageWrapper>
      <div className="sd-page">
        <div className="sd-inbox">
          <aside className="sd-inbox-sidebar sd-card">
            <div className="sd-inbox-sidebar__head">
              <h2 className="sd-card-title">Inbox</h2>
              <p className="sd-card-desc">Chat with your clients</p>
              <input
                type="search"
                className="sd-inbox-search"
                placeholder="Search clients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="sd-inbox-thread-list">
              {loading ? (
                <p className="sd-inbox-empty">Loading conversations…</p>
              ) : filteredThreads.length === 0 ? (
                <p className="sd-inbox-empty">No clients found.</p>
              ) : (
                filteredThreads.map(({ client, preview }) => {
                  const active = client.id === selectedClientId
                  return (
                    <button
                      key={client.id}
                      type="button"
                      className={`sd-inbox-thread${active ? ' sd-inbox-thread--active' : ''}`}
                      onClick={() => setSelectedClientId(client.id)}
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
                    </button>
                  )
                })
              )}
            </div>
          </aside>

          <section className="sd-inbox-chat sd-card">
            {!selectedThread ? (
              <div className="sd-inbox-chat__empty">
                <p className="text-sm text-muted-foreground">Select a client to start chatting.</p>
              </div>
            ) : (
              <>
                <div className="sd-inbox-chat__head">
                  <Avatar className="size-9">
                    <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                      {getInitials(selectedThread.client.company_name || 'Client')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold">{selectedThread.client.company_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedThread.project
                        ? `Project: ${selectedThread.project.name}`
                        : 'No project linked'}
                    </p>
                  </div>
                </div>

                <div className="sd-inbox-chat__messages">
                  {loadingMessages ? (
                    <p className="sd-inbox-empty">Loading messages…</p>
                  ) : !selectedProjectId ? (
                    <p className="sd-inbox-empty">Link a project to this client to enable chat.</p>
                  ) : messages.length === 0 ? (
                    <p className="sd-inbox-empty">No messages yet. Say hello to your client.</p>
                  ) : (
                    messages.map((msg) => {
                      const isMine =
                        msg.sender_id === user?.id ||
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
                    placeholder="Type a message to your client..."
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    disabled={!selectedProjectId || sending}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="shrink-0 rounded-full"
                    disabled={!draft.trim() || !selectedProjectId || sending}
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
