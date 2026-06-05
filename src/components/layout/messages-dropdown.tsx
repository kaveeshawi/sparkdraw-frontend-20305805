import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconArrowLeft, IconMessageCircle, IconSend } from '@tabler/icons-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { clientsApi, projectsApi, messagesApi } from '@/services/api'
import useAuthStore from '@/store/authStore'
import { getInitials } from '@/lib/utils'

function normalizeList(payload, key) {
  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray(payload[key])) return payload[key]
  return []
}

type Thread = {
  client: { id: number; company_name?: string }
  project?: { id: number; name?: string; status?: string }
  preview: string
}

export function MessagesDropdown() {
  const { user } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState([])
  const [projects, setProjects] = useState([])
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null)
  const [messages, setMessages] = useState([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const threadEndRef = useRef<HTMLDivElement>(null)

  const threads = useMemo<Thread[]>(() => {
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

  const selectedThread = threads.find((t) => t.client.id === selectedClientId)
  const selectedProjectId = selectedThread?.project?.id

  const loadThreads = useCallback(() => {
    setLoading(true)
    Promise.all([clientsApi.index(), projectsApi.index()])
      .then(([clientsRes, projectsRes]) => {
        setClients(normalizeList(clientsRes.data.data, 'clients'))
        setProjects(normalizeList(projectsRes.data.data, 'projects'))
      })
      .catch(() => {
        setClients([])
        setProjects([])
      })
      .finally(() => setLoading(false))
  }, [])

  const loadMessages = useCallback((projectId?: number) => {
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
    loadThreads()
  }, [loadThreads])

  useEffect(() => {
    if (open) loadThreads()
    if (!open) {
      setSelectedClientId(null)
      setDraft('')
      setMessages([])
    }
  }, [open, loadThreads])

  useEffect(() => {
    loadMessages(selectedProjectId)
  }, [selectedProjectId, loadMessages])

  useEffect(() => {
    if (selectedClientId) {
      threadEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, selectedClientId])

  const handleSend = async (e: React.FormEvent) => {
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
      // keep draft
    } finally {
      setSending(false)
    }
  }

  const hasThreads = threads.length > 0
  const inChat = selectedClientId !== null

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="sd-header-icon-btn relative"
          aria-label="Messages"
        >
          <IconMessageCircle size={18} stroke={1.75} />
          {hasThreads && <span className="sd-header-notify-dot" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="sd-messages-panel w-96 p-0"
        align="end"
        sideOffset={8}
      >
        <div className="sd-notifications-panel__head">
          {inChat ? (
            <button
              type="button"
              className="sd-messages-panel__back"
              onClick={() => {
                setSelectedClientId(null)
                setDraft('')
              }}
            >
              <IconArrowLeft size={16} stroke={1.75} />
              Back
            </button>
          ) : null}
          <div className={inChat ? 'min-w-0 flex-1' : undefined}>
            <p className="sd-notifications-panel__title">
              {inChat ? selectedThread?.client.company_name : 'Messages'}
            </p>
            <p className="sd-notifications-panel__subtitle">
              {inChat
                ? selectedThread?.project?.name || 'No project linked'
                : hasThreads
                  ? `${threads.length} client conversation${threads.length !== 1 ? 's' : ''}`
                  : 'No client chats yet'}
            </p>
          </div>
          {!inChat && hasThreads && (
            <span className="sd-notifications-panel__badge">{threads.length}</span>
          )}
        </div>

        {inChat ? (
          <>
            <div className="sd-messages-panel__chat">
              {loadingMessages ? (
                <p className="sd-notifications-empty">Loading messages…</p>
              ) : !selectedProjectId ? (
                <p className="sd-notifications-empty">Link a project to this client to chat.</p>
              ) : messages.length === 0 ? (
                <p className="sd-notifications-empty">No messages yet. Say hello.</p>
              ) : (
                messages.map((msg) => {
                  const isMine =
                    msg.sender_id === user?.id ||
                    ['admin', 'pm', 'member'].includes(msg.sender_role)
                  return (
                    <div
                      key={msg.id}
                      className={`sd-messages-panel__bubble-row${isMine ? ' sd-messages-panel__bubble-row--mine' : ''}`}
                    >
                      <div className={`sd-messages-panel__bubble${isMine ? ' sd-messages-panel__bubble--mine' : ''}`}>
                        {msg.body}
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={threadEndRef} />
            </div>
            <form className="sd-messages-panel__composer" onSubmit={handleSend}>
              <input
                type="text"
                className="sd-messages-panel__input"
                placeholder="Type a message..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={!selectedProjectId || sending}
              />
              <Button
                type="submit"
                size="icon"
                className="size-8 shrink-0 rounded-full"
                disabled={!draft.trim() || !selectedProjectId || sending}
              >
                <IconSend size={14} stroke={1.75} />
              </Button>
            </form>
          </>
        ) : (
          <>
            <div className="sd-notifications-panel__list">
              {loading ? (
                <p className="sd-notifications-empty">Loading messages…</p>
              ) : threads.length === 0 ? (
                <div className="sd-notifications-empty-state">
                  <div className="sd-notifications-empty-state__icon">
                    <IconMessageCircle size={20} stroke={1.75} />
                  </div>
                  <p className="font-medium">No messages</p>
                  <p className="text-xs text-muted-foreground">
                    Client conversations will appear here.
                  </p>
                </div>
              ) : (
                threads.map(({ client, preview, project }) => (
                  <button
                    key={client.id}
                    type="button"
                    className="sd-notifications-item w-full text-left"
                    onClick={() => setSelectedClientId(client.id)}
                  >
                    <Avatar className="size-9 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                        {getInitials(client.company_name || 'Client')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="sd-notifications-item__title">{client.company_name}</p>
                      <p className="sd-notifications-item__message">{preview}</p>
                      <p className="sd-notifications-item__meta">
                        {project ? 'Tap to open chat' : 'No project linked'}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
            <div className="sd-notifications-panel__foot">
              <Link to="/inbox" className="sd-notifications-panel__link" onClick={() => setOpen(false)}>
                Open full inbox
              </Link>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
