import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { IconMessages, IconSend, IconUsers } from '@tabler/icons-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { apiErrorMessage } from '@/lib/apiError'
import { cn, getInitials } from '@/lib/utils'
import useAuthStore from '../../store/authStore'
import { messagesApi, portalApi } from '../../services/api'
import UnreadBadge from '../inbox/UnreadBadge'
import useInboxUnread, { requestInboxUnreadRefresh } from '../../hooks/useInboxUnread'

const ROLE_LABEL = {
  admin: 'Admin',
  pm: 'Project manager',
  member: 'Team member',
}

function formatTime(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function PortalChat({ slug, projectId }) {
  const user = useAuthStore((s) => s.user)
  const unread = useInboxUnread()
  const [threadKey, setThreadKey] = useState('overall')
  const [team, setTeam] = useState([])
  const [teamLoading, setTeamLoading] = useState(false)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const endRef = useRef(null)

  const peerId = threadKey === 'overall' ? null : Number(threadKey)
  const activeMember = peerId ? team.find((m) => m.id === peerId) : null

  useEffect(() => {
    setThreadKey('overall')
    setDraft('')
  }, [projectId])

  useEffect(() => {
    if (!slug || !projectId) {
      setTeam([])
      setTeamLoading(false)
      return
    }
    setTeamLoading(true)
    portalApi
      .listTeam(slug, projectId)
      .then((res) => setTeam(res.data.data || []))
      .catch(() => setTeam([]))
      .finally(() => setTeamLoading(false))
  }, [slug, projectId])

  const loadMessages = (opts = { silent: false }) => {
    if (!projectId) {
      setMessages([])
      setLoading(false)
      setError(false)
      return Promise.resolve()
    }
    if (!opts.silent) {
      setLoading(true)
      setError(false)
    }
    const params = peerId ? { with: peerId } : { thread: 'overall' }
    return messagesApi
      .index(projectId, params)
      .then(async (res) => {
        setMessages((res.data.data || []).slice().reverse())
        setError(false)
        try {
          await messagesApi.markRead(projectId, peerId ? { with: peerId } : {})
          requestInboxUnreadRefresh()
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        if (!opts.silent) {
          setMessages([])
          setError(true)
        }
      })
      .finally(() => {
        if (!opts.silent) setLoading(false)
      })
  }

  useEffect(() => {
    loadMessages()
  }, [projectId, threadKey])

  useEffect(() => {
    if (!projectId) return undefined
    const id = window.setInterval(() => loadMessages({ silent: true }), 15000)
    return () => window.clearInterval(id)
  }, [projectId, threadKey])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e) => {
    e.preventDefault()
    const body = draft.trim()
    if (!body || !projectId || sending) return

    setSending(true)
    try {
      const payload = peerId ? { body, recipient_id: peerId } : { body }
      const res = await messagesApi.store(projectId, payload)
      const created = res.data.data || {}
      setMessages((prev) => [
        ...prev,
        {
          id: created.id ?? `tmp-${Date.now()}`,
          body: created.body ?? body,
          sender_id: created.sender_id ?? user?.id,
          sender_name: created.sender_name ?? user?.name,
          sender_role: created.sender_role ?? user?.role ?? 'client',
          recipient_id: created.recipient_id ?? peerId,
          created_at: created.created_at ?? new Date().toISOString(),
        },
      ])
      setDraft('')
      requestInboxUnreadRefresh()
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not send message'))
    } finally {
      setSending(false)
    }
  }

  if (!projectId) {
    return (
      <div className="sd-page sd-page--team">
        <div className="sd-card p-8 text-center">
          <IconMessages size={22} stroke={1.5} className="mx-auto text-muted-foreground" />
          <p className="mt-2 text-sm font-medium">No project selected</p>
        </div>
      </div>
    )
  }

  const canSend = Boolean(projectId && !sending)
  const placeholder = peerId
    ? `Message ${activeMember?.name || 'team member'}…`
    : 'Message the whole project team…'

  return (
    <div className="sd-page sd-page--team sd-page--inbox">
      <div className="sd-inbox">
        <aside className="sd-inbox-sidebar sd-card">
          <div className="sd-inbox-sidebar__head">
            <h2 className="sd-card-title">Threads</h2>
            <p className="sd-card-desc">Project chat and direct messages</p>
          </div>

          <div className="sd-inbox-thread-list">
            <button
              type="button"
              className={cn('sd-inbox-thread', threadKey === 'overall' && 'sd-inbox-thread--active')}
              onClick={() => {
                setThreadKey('overall')
                setDraft('')
              }}
            >
              <Avatar className="size-9">
                <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                  <IconUsers size={14} stroke={1.75} />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-medium">Project team</p>
                <p className="truncate text-xs text-muted-foreground">Everyone on this project</p>
              </div>
              <UnreadBadge count={unread.threadUnread(projectId, 0)} />
            </button>

            {teamLoading ? (
              <p className="sd-inbox-empty">Loading team…</p>
            ) : team.length === 0 ? (
              <p className="sd-inbox-empty">No agency team members available yet.</p>
            ) : (
              team.map((member) => {
                const count = unread.threadUnread(projectId, member.id)
                return (
                  <button
                    key={member.id}
                    type="button"
                    className={cn(
                      'sd-inbox-thread',
                      String(threadKey) === String(member.id) && 'sd-inbox-thread--active',
                      count > 0 && 'has-unread'
                    )}
                    onClick={() => {
                      setThreadKey(String(member.id))
                      setDraft('')
                    }}
                  >
                    <Avatar className="size-9">
                      <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                        {getInitials(member.name || '?')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate text-sm font-medium">{member.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {member.on_project ? 'On project · ' : ''}
                        {member.job_title || ROLE_LABEL[member.role] || member.role}
                      </p>
                    </div>
                    <UnreadBadge count={count} />
                  </button>
                )
              })
            )}
          </div>
        </aside>

        <section className="sd-inbox-chat sd-card">
          <div className="sd-inbox-chat__head">
            <Avatar className="size-9">
              <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                {peerId
                  ? getInitials(activeMember?.name || '?')
                  : <IconUsers size={14} stroke={1.75} />}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {peerId ? activeMember?.name || 'Direct message' : 'Project team'}
              </p>
              <p className="text-xs text-muted-foreground">
                {peerId
                  ? 'Private conversation — only you and this person see it.'
                  : 'Visible to the agency team on this project.'}
              </p>
            </div>
          </div>

          <div className="sd-inbox-chat__messages">
            {loading ? (
              <p className="sd-inbox-empty">Loading messages…</p>
            ) : error ? (
              <p className="sd-inbox-empty">
                Couldn’t load chat.{' '}
                <button type="button" className="text-primary underline-offset-2 hover:underline" onClick={() => loadMessages()}>
                  Retry
                </button>
              </p>
            ) : messages.length === 0 ? (
              <p className="sd-inbox-empty">
                {peerId
                  ? 'No messages yet. Start a private chat with this team member.'
                  : 'No messages yet. Say hello to the project team.'}
              </p>
            ) : (
              messages.map((msg) => {
                const isMine = msg.sender_id === user?.id
                return (
                  <div
                    key={msg.id}
                    className={cn('sd-inbox-bubble-row', isMine && 'sd-inbox-bubble-row--mine')}
                  >
                    <div className={cn('sd-inbox-bubble', isMine && 'sd-inbox-bubble--mine')}>
                      {!isMine && msg.sender_name ? (
                        <p className="mb-0.5 text-[11px] font-medium opacity-80">{msg.sender_name}</p>
                      ) : null}
                      <p>{msg.body}</p>
                      <span>{formatTime(msg.created_at)}</span>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={endRef} />
          </div>

          <form className="sd-inbox-chat__composer" onSubmit={handleSend}>
            <input
              type="text"
              className="sd-inbox-composer-input"
              placeholder={placeholder}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={!canSend}
              maxLength={5000}
              aria-label="Message"
            />
            <Button
              type="submit"
              size="icon"
              className="shrink-0 rounded-full"
              disabled={!draft.trim() || !canSend}
              aria-label="Send message"
            >
              <IconSend size={16} stroke={1.75} />
            </Button>
          </form>
        </section>
      </div>
    </div>
  )
}
