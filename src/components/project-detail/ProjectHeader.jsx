import { useRef, useState } from 'react'
import {
  IconBriefcase,
  IconBuildingSkyscraper,
  IconCalendar,
  IconCamera,
  IconChevronDown,
  IconClockHour4,
  IconCurrencyDollar,
  IconPencil,
  IconSparkles,
} from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { clientPhotoSrc, memberPhotoSrc } from '@/lib/media'
import { useFormatMoney } from '@/hooks/useAgencyCurrency'
import { clientsApi, projectsApi } from '../../services/api'
import { apiErrorMessage } from '../../lib/apiError'
import PortalContactActions from '../team/PortalContactActions'
import { FLAG_META, initials, formatDate } from './shared'

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not started', bg: 'color-mix(in srgb, var(--muted) 55%, transparent)', color: 'var(--muted-foreground)', dot: '#9ca3af' },
  { value: 'started',     label: 'Started',     bg: '#ecfdf5', color: '#059669', dot: '#10b981' },
  { value: 'active',      label: 'In Progress', bg: '#ecfdf5', color: '#059669', dot: '#10b981' },
  { value: 'on_hold',     label: 'On Hold',     bg: '#fffbeb', color: '#b45309', dot: '#f59e0b' },
  { value: 'completed',   label: 'Completed',   bg: '#ecfdf5', color: '#047857', dot: '#10b981' },
  { value: 'archived',    label: 'Archived',    bg: '#f1f5f9', color: '#64748b', dot: '#94a3b8' },
]

function statusTone(status) {
  return STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[2]
}

function companyInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'PR'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
}

function resolveClientContact(project) {
  const client = project?.client
  if (!client) return null
  const contactUser = client.contact_user || client.contactUser || null
  const email = client.contact_email
    || contactUser?.email
    || client.email
    || null
  const id = client.id || client.client_id || null
  if (!email && !id) return null
  return {
    id,
    email,
    name: client.company_name || client.name || contactUser?.name || 'Client',
  }
}

export default function ProjectHeader({
  project,
  showBudget = true,
  canEdit = false,
  onEdit,
  onOpenMessages,
  onUpdated,
}) {
  const money = useFormatMoney()
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [savingStatus, setSavingStatus] = useState(false)
  const [logoPreview, setLogoPreview] = useState(null)

  if (!project) {
    return (
      <section className="sd-team-portal__profile sd-proj-portal__profile">
        <div className="sd-team-portal__empty" style={{ border: 0, boxShadow: 'none', padding: '1.25rem' }}>
          Loading project…
        </div>
      </section>
    )
  }

  const health = project.health_score
  const flagMeta = health?.flag ? FLAG_META[health.flag] : null
  const team = project.team_members || project.assignees || []
  const tone = statusTone(project.status)
  const clientName = project.client?.company_name || project.client?.name
  const contact = resolveClientContact(project)
  const clientId = project.client?.id || project.client_id
  const logoSrc = logoPreview || clientPhotoSrc(project.client)
  const mark = companyInitials(clientName || project.name)

  const openClientChat = () => {
    if (typeof onOpenMessages === 'function') {
      onOpenMessages()
      return
    }
    if (contact?.id) {
      navigate(`/inbox?channel=clients&client=${contact.id}`)
      return
    }
    navigate('/inbox?channel=clients')
  }

  const handleStatusChange = async (nextStatus) => {
    if (!nextStatus || nextStatus === project.status) return
    setSavingStatus(true)
    try {
      const res = await projectsApi.update(project.id, { status: nextStatus })
      const updated = res.data?.data
      onUpdated?.(updated || { ...project, status: nextStatus })
      toast.success('Project status updated')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not update status'))
    } finally {
      setSavingStatus(false)
    }
  }

  const handleLogoPick = () => {
    if (!clientId || uploadingLogo) return
    fileRef.current?.click()
  }

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !clientId) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file')
      return
    }

    const localUrl = URL.createObjectURL(file)
    setLogoPreview(localUrl)
    setUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append('avatar', file)
      const uploadRes = await clientsApi.uploadAvatar(clientId, formData)
      const uploaded = uploadRes.data?.data
      onUpdated?.({
        ...project,
        client: {
          ...(project.client || {}),
          ...(uploaded || {}),
          id: clientId,
          company_name: clientName,
          avatar_url: uploaded?.avatar_url || uploaded?.avatar_path,
          avatar_path: uploaded?.avatar_path,
          avatar_version: Date.now(),
        },
      })
      toast.success('Client logo updated')
      setLogoPreview(null)
    } catch (err) {
      setLogoPreview(null)
      toast.error(apiErrorMessage(err, 'Could not upload logo'))
    } finally {
      setUploadingLogo(false)
      URL.revokeObjectURL(localUrl)
    }
  }

  return (
    <section className="sd-team-portal__profile sd-proj-portal__profile">
      <div className="sd-team-portal__profile-main">
        <div className="sd-proj-portal__logo-wrap">
          <button
            type="button"
            className="sd-proj-portal__logo"
            onClick={handleLogoPick}
            disabled={!clientId || uploadingLogo}
            title={clientId ? 'Upload client logo' : 'Link a client to upload a logo'}
            aria-label={clientId ? 'Upload client logo' : 'No client linked'}
          >
            {logoSrc ? (
              <img src={logoSrc} alt="" className="sd-proj-portal__logo-img" />
            ) : (
              <span className="sd-proj-portal__logo-fallback" aria-hidden>
                {mark}
              </span>
            )}
            {clientId ? (
              <span className="sd-proj-portal__logo-overlay">
                <IconCamera size={16} stroke={1.75} />
              </span>
            ) : null}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleLogoChange}
          />
        </div>

        <div className="sd-team-portal__profile-copy">
          <div className="sd-team-portal__profile-title-row">
            <h1 className="sd-team-portal__profile-name">{project.name}</h1>

            {canEdit ? (
              <button
                type="button"
                className="sd-proj-portal__edit-btn"
                onClick={() => onEdit?.()}
                aria-label="Edit project"
                title="Edit project"
              >
                <IconPencil size={15} stroke={1.75} />
                Edit
              </button>
            ) : null}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="sd-team-portal__invite-badge sd-proj-portal__status-btn"
                  style={{ background: tone.bg, color: tone.color }}
                  disabled={savingStatus}
                  aria-label="Change project status"
                >
                  <span
                    className="sd-team-portal__invite-badge-dot"
                    style={{ background: tone.dot }}
                  />
                  {tone.label}
                  <IconChevronDown size={13} stroke={1.75} className="sd-proj-portal__status-caret" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[10.5rem]">
                {STATUS_OPTIONS.map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    className="cursor-pointer gap-2"
                    onClick={() => handleStatusChange(opt.value)}
                  >
                    <span
                      className="size-1.5 rounded-full shrink-0"
                      style={{ background: opt.dot }}
                    />
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {flagMeta ? (
              <span className={cn('sd-proj-health-pill', flagMeta.className)}>
                <IconSparkles size={11} stroke={1.75} />
                Health {health.score ?? '—'}
              </span>
            ) : null}
          </div>

          <div className="sd-team-portal__profile-facts-inline">
            {clientName ? (
              <p className="sd-team-card__fact-line" title={clientName}>
                <IconBuildingSkyscraper size={16} stroke={1.65} className="sd-team-card__fact-icon" aria-hidden />
                <span className="sd-team-card__fact-key">Client</span>
                <span className="sd-team-card__fact-sep">-</span>
                <span className="sd-team-card__fact-val">{clientName}</span>
              </p>
            ) : null}
            {project.type ? (
              <p className="sd-team-card__fact-line" title={project.type}>
                <IconBriefcase size={16} stroke={1.65} className="sd-team-card__fact-icon" aria-hidden />
                <span className="sd-team-card__fact-key">Service</span>
                <span className="sd-team-card__fact-sep">-</span>
                <span className="sd-team-card__fact-val">{project.type}</span>
              </p>
            ) : null}
          </div>

          <div className="sd-team-portal__profile-meta sd-proj-portal__meta-row">
            <span>
              <IconCalendar size={13} stroke={1.65} />
              {formatDate(project.start_date, { day: 'numeric', month: 'short', year: 'numeric' })}
              {' – '}
              {formatDate(project.end_date || project.due_date, { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            {project.estimated_hours != null ? (
              <span>
                <IconClockHour4 size={13} stroke={1.65} />
                {project.estimated_hours}h estimated
              </span>
            ) : null}
            {showBudget && project.budget != null ? (
              <span>
                <IconCurrencyDollar size={13} stroke={1.65} />
                {money(project.budget)}
              </span>
            ) : null}

            {team.length > 0 ? (
              <div className="sd-proj-portal__team sd-proj-portal__team--inline" aria-label="Project team">
                {team.slice(0, 5).map((member, i) => (
                  <Avatar
                    key={member.id || i}
                    className={cn('sd-proj-header__avatar', i !== 0 && 'sd-proj-header__avatar--stack')}
                    title={member.name}
                  >
                    <AvatarImage src={memberPhotoSrc(member)} alt={member.name} />
                    <AvatarFallback className="sd-proj-header__avatar-fb">
                      {initials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {team.length > 5 ? (
                  <div className="sd-proj-header__avatar-more">+{team.length - 5}</div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="sd-team-portal__profile-side sd-proj-portal__side">
        {contact ? (
          <PortalContactActions
            person={contact}
            onChat={openClientChat}
            aria-label="Contact client"
          />
        ) : null}
      </div>
    </section>
  )
}
