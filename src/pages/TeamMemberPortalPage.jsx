import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  IconLayoutDashboard, IconCalendarStats, IconUmbrella, IconCreditCard,
  IconGauge, IconFileText, IconReceipt, IconChecklist,
  IconMail, IconBriefcase, IconBuilding, IconCalendar, IconId,
  IconPencil, IconDotsVertical, IconCopy, IconArrowLeft, IconUserOff, IconUserCheck, IconTrash,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import PageWrapper from '../components/layout/PageWrapper'
import PageHeader from '../components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import useAuthStore from '../store/authStore'
import { getAgencyId } from '../lib/media'
import { apiErrorMessage } from '../lib/apiError'
import { teamApi } from '../services/api'
import { fetchDepartments } from '../components/team/departmentStorage'
import { mergeMemberProfile } from '../components/team/memberProfileStorage'
import { ROLE_LABELS, displayDepartment, displayMemberName } from '../components/team/team-utils'
import TeamAvatar from '../components/team/TeamAvatar'
import TeamProfileModal from '../components/team/TeamProfileModal'
import PortalContactActions from '../components/team/PortalContactActions'
import { getPortalData } from '../components/team-portal/portalMockData'
import OverviewTab from '../components/team-portal/OverviewTab'
import AttendanceTab from '../components/team-portal/AttendanceTab'
import LeaveTab from '../components/team-portal/LeaveTab'
import PayrollTab from '../components/team-portal/PayrollTab'
import PerformanceTab from '../components/team-portal/PerformanceTab'
import DocumentsTab from '../components/team-portal/DocumentsTab'
import ExpensesTab from '../components/team-portal/ExpensesTab'
import MemberWorkPanel from '../components/team-portal/MemberWorkPanel'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'overview', label: 'Overview', icon: IconLayoutDashboard },
  { id: 'attendance', label: 'Attendance', icon: IconCalendarStats },
  { id: 'leave', label: 'Leave', icon: IconUmbrella },
  { id: 'payroll', label: 'Payroll', icon: IconCreditCard },
  { id: 'work', label: 'Work', icon: IconChecklist },
  { id: 'performance', label: 'Performance', icon: IconGauge },
  { id: 'documents', label: 'Documents', icon: IconFileText },
  { id: 'expenses', label: 'Expenses', icon: IconReceipt },
]

const STATUS_TONE = {
  active: { bg: '#ecfdf5', color: '#059669', dot: '#10b981' },
  invite_pending: { bg: '#fffbeb', color: '#b45309', dot: '#f59e0b' },
  invite_expired: { bg: '#fef2f2', color: '#dc2626', dot: '#ef4444' },
  invite_not_sent: { bg: 'color-mix(in srgb, var(--muted) 55%, transparent)', color: 'var(--muted-foreground)', dot: '#9ca3af' },
  access_revoked: { bg: '#fef2f2', color: '#b91c1c', dot: '#ef4444' },
}

const STATUS_LABEL = {
  active: 'Active',
  invite_pending: 'Invite sent',
  invite_expired: 'Invite expired',
  invite_not_sent: 'Not invited',
  access_revoked: 'Access revoked',
}

const LIVE_STATUS_TONE = {
  clocked_in: { color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', dot: '#10b981' },
  clocked_out: { color: '#6b7280', bg: 'color-mix(in srgb, var(--muted) 55%, transparent)', border: 'var(--border)', dot: '#9ca3af' },
  absent: { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', dot: '#ef4444' },
}

export default function TeamMemberPortalPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  const isSelf = user && String(user.id) === String(id)
  const canManage = isAdmin
  const agencyId = getAgencyId(user)

  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [departments, setDepartments] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
  const [editOpen, setEditOpen] = useState(false)
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [removing, setRemoving] = useState(false)

  useEffect(() => {
    setLoading(true)
    const load = isAdmin
      ? teamApi.index().then((res) => {
          const list = res.data.data || []
          return list.find((m) => String(m.id) === String(id)) || null
        })
      : teamApi.show(id).then((res) => res.data.data || null)

    load
      .then((found) => {
        if (!found) {
          setMember(null)
          return
        }
        setMember(mergeMemberProfile(agencyId, found))
      })
      .catch(() => setMember(null))
      .finally(() => setLoading(false))
  }, [id, isAdmin, agencyId])

  useEffect(() => {
    if (!agencyId) return
    fetchDepartments(agencyId).then(setDepartments)
  }, [agencyId])

  useEffect(() => {
    if (!user || loading) return
    if (!isAdmin && user.role === 'member' && !isSelf) {
      navigate(`/team/${user.id}/portal`, { replace: true })
    }
  }, [user, loading, isAdmin, isSelf, navigate])

  const data = useMemo(
    () => (member ? getPortalData(member) : null),
    [member],
  )

  const displayName = member ? displayMemberName(member) : '…'
  const position = member?.job_title?.trim() || ROLE_LABELS[member?.role] || member?.role || 'Team Member'
  const department = member ? displayDepartment(member) : ''
  const inviteTone = STATUS_TONE[member?.invite_status] || STATUS_TONE.active
  const liveTone = LIVE_STATUS_TONE[data?.liveStatus?.state] || LIVE_STATUS_TONE.clocked_out
  const joinedLabel = member?.created_at
    ? new Date(member.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—'

  const copyEmail = async () => {
    if (!member?.email) return
    try {
      await navigator.clipboard.writeText(member.email)
      toast.success('Email copied')
    } catch {
      toast.error('Could not copy email')
    }
  }

  const accessRevoked = Boolean(member?.access_revoked || member?.invite_status === 'access_revoked')

  const patchMemberLocal = (updated) => {
    setMember((prev) => {
      if (!prev) return prev
      return mergeMemberProfile(agencyId, { ...prev, ...updated })
    })
  }

  const handleResendInvite = async () => {
    try {
      const res = await teamApi.resendInvite(member.id)
      const password = res.data?.data?.temporary_password
      if (password) {
        await navigator.clipboard.writeText(
          `Email: ${member.email}\nPassword: ${password}`,
        )
        toast.success('New credentials generated and copied')
      } else {
        toast.success('Credentials resent')
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not resend invite'))
    }
  }

  const handleRevokeAccess = async () => {
    if (!member) return
    setRemoving(true)
    try {
      const res = await teamApi.revokeAccess(member.id)
      const updated = res.data?.data
      if (updated) patchMemberLocal(updated)
      else patchMemberLocal({ access_revoked: true, invite_status: 'access_revoked' })
      toast.success('Access revoked — member stays on your team roster')
      setConfirmRemoveOpen(false)
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not revoke access. Please try again.'))
    } finally {
      setRemoving(false)
    }
  }

  const handleRestoreAccess = async () => {
    if (!member) return
    setRemoving(true)
    try {
      const res = await teamApi.restoreAccess(member.id)
      const updated = res.data?.data
      if (updated) patchMemberLocal(updated)
      else patchMemberLocal({ access_revoked: false, invite_status: 'active' })
      toast.success('Access restored')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not restore access. Please try again.'))
    } finally {
      setRemoving(false)
    }
  }

  const handleRemovedFromModal = async () => {
    await teamApi.remove(member.id)
    navigate('/team')
  }

  const handleDeleteMember = async () => {
    if (!member) return
    setRemoving(true)
    try {
      await teamApi.remove(member.id)
      toast.success('Team member deleted')
      setConfirmDeleteOpen(false)
      navigate('/team')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not delete team member'))
    } finally {
      setRemoving(false)
    }
  }

  const handleBack = () => {
    if (isSelf && !isAdmin) {
      navigate('/tasks', { replace: true })
      return
    }
    if (window.history.length > 1) navigate(-1)
    else navigate('/team')
  }

  return (
    <PageWrapper
      breadcrumb={isAdmin ? ['Team', displayName] : [displayName]}
      pageActions={
        <div className="sd-float-page-header__bar sd-page-toolbar sd-page-toolbar--team">
          <div className="sd-team-portal__header-left">
            {isAdmin ? (
              <button
                type="button"
                className="sd-team-portal__back"
                onClick={handleBack}
                aria-label="Back to team"
              >
                <IconArrowLeft size={16} stroke={1.75} />
                Back
              </button>
            ) : null}
            <PageHeader
              title={isSelf ? 'My workspace' : 'Member portal'}
              subtitle="Overview, attendance, payroll, and work"
            />
          </div>
          {canManage && member ? (
            <div className="sd-page-actions">
              <Button
                variant="secondary"
                className="sd-header-new-project sd-team-manage-btn inline-flex shrink-0 border-0"
                onClick={() => setEditOpen(true)}
              >
                <IconPencil size={16} />
                Edit profile
              </Button>
              <Button
                variant="secondary"
                className={cn(
                  'sd-header-new-project sd-team-manage-btn inline-flex shrink-0 border-0',
                  !accessRevoked && 'sd-team-portal__revoke-btn',
                )}
                onClick={() => (accessRevoked ? handleRestoreAccess() : setConfirmRemoveOpen(true))}
                disabled={removing}
              >
                {accessRevoked ? (
                  <>
                    <IconUserCheck size={16} stroke={1.75} />
                    Restore access
                  </>
                ) : (
                  <>
                    <IconUserOff size={16} stroke={1.75} />
                    Revoke access
                  </>
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    className="sd-header-new-project sd-team-manage-btn inline-flex size-10 shrink-0 border-0 px-0"
                    aria-label="More actions"
                  >
                    <IconDotsVertical size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleResendInvite} className="cursor-pointer">
                    Resend invite
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setConfirmDeleteOpen(true)}
                    className="cursor-pointer text-red-500 focus:text-red-500"
                  >
                    Delete member
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : null}
        </div>
      }
    >
      <div className="sd-page sd-page--team sd-team-portal sd-animate-in">
        {loading || !member ? (
          <div className="sd-team-portal__empty">
            {loading ? 'Loading team member…' : 'Team member not found.'}
          </div>
        ) : (
          <>
            <section className="sd-team-portal__profile">
              <div className="sd-team-portal__profile-main">
                <TeamAvatar member={member} className="sd-team-portal__profile-avatar" />
                <div className="sd-team-portal__profile-copy">
                  <div className="sd-team-portal__profile-title-row">
                    <h1 className="sd-team-portal__profile-name">{displayName}</h1>
                    <span
                      className="sd-team-portal__invite-badge"
                      style={{ background: inviteTone.bg, color: inviteTone.color }}
                    >
                      <span
                        className="sd-team-portal__invite-badge-dot"
                        style={{ background: inviteTone.dot }}
                      />
                      {STATUS_LABEL[member.invite_status] || 'Active'}
                    </span>
                  </div>

                  <div className="sd-team-portal__profile-facts-inline">
                    <p className="sd-team-card__fact-line" title={position}>
                      <IconBriefcase size={14} stroke={1.65} className="sd-team-card__fact-icon" aria-hidden />
                      <span className="sd-team-card__fact-key">Position</span>
                      <span className="sd-team-card__fact-sep">-</span>
                      <span className="sd-team-card__fact-val">{position}</span>
                    </p>
                    <p className="sd-team-card__fact-line" title={department}>
                      <IconBuilding size={14} stroke={1.65} className="sd-team-card__fact-icon" aria-hidden />
                      <span className="sd-team-card__fact-key">Department</span>
                      <span className="sd-team-card__fact-sep">-</span>
                      <span className="sd-team-card__fact-val">{department}</span>
                    </p>
                  </div>

                  <div className="sd-team-portal__profile-meta">
                    {member.email ? (
                      <button type="button" onClick={copyEmail} title="Copy email">
                        <IconMail size={13} stroke={1.65} />
                        <span>{member.email}</span>
                        <IconCopy size={11} stroke={1.75} />
                      </button>
                    ) : null}
                    <span>
                      <IconCalendar size={13} stroke={1.65} />
                      Joined {joinedLabel}
                    </span>
                    <span>
                      <IconId size={13} stroke={1.65} />
                      Employee ID #{member.employee_id || '—'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="sd-team-portal__profile-side">
                {data?.liveStatus ? (
                  <article
                    className="sd-team-portal__live-status"
                    style={{ background: liveTone.bg, borderColor: liveTone.border }}
                  >
                    <span
                      className="sd-team-portal__live-status-dot"
                      style={{ background: liveTone.dot, color: liveTone.dot }}
                    />
                    <div>
                      <p className="sd-team-portal__live-status-label" style={{ color: liveTone.color }}>
                        {data.liveStatus.label}
                      </p>
                      <p className="sd-team-portal__live-status-detail">{data.liveStatus.detail}</p>
                    </div>
                  </article>
                ) : null}
                <PortalContactActions
                  person={member}
                  aria-label="Contact team member"
                  onChat={() => {
                    if (isSelf) {
                      navigate('/inbox?channel=team')
                      return
                    }
                    navigate(`/inbox?channel=team&member=${member.id}`)
                  }}
                />
              </div>
            </section>

            <div className="sd-team-portal__tabs-wrap" role="tablist" aria-label="Portal sections">
              <div className="sd-header-tabs sd-team-portal__tabs">
                {TABS.map((tab) => {
                  const Icon = tab.icon
                  const active = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn('sd-header-tab sd-team-portal__tab', active && 'sd-header-tab--active')}
                    >
                      <Icon size={14} stroke={1.75} aria-hidden />
                      {tab.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="sd-team-portal__content">
              {activeTab === 'overview' && (
                <OverviewTab data={data} onNavigateTab={setActiveTab} />
              )}
              {activeTab === 'attendance' && (
                <AttendanceTab member={member} data={data} canManage={canManage} />
              )}
              {activeTab === 'leave' && (
                <LeaveTab data={data} canManage={canManage} />
              )}
              {activeTab === 'payroll' && (
                <PayrollTab data={data} member={member} canManage={canManage} />
              )}
              {activeTab === 'work' && (
                <MemberWorkPanel
                  memberId={member.id}
                  isSelf={isSelf}
                  canManage={canManage}
                />
              )}
              {activeTab === 'performance' && <PerformanceTab data={data} />}
              {activeTab === 'documents' && <DocumentsTab data={data} />}
              {activeTab === 'expenses' && <ExpensesTab data={data} />}
            </div>

            <TeamProfileModal
              member={member}
              open={editOpen}
              onOpenChange={setEditOpen}
              agencyId={agencyId}
              departments={departments}
              canManage={isAdmin}
              onInviteStatusChange={(memberId, status) => {
                if (String(memberId) !== String(member?.id)) return
                patchMemberLocal({
                  invite_status: status,
                  access_revoked: status === 'access_revoked',
                })
              }}
              onUpdated={async (memberId, updateData) => {
                try {
                  const res = await teamApi.update(memberId, {
                    ...(updateData.name ? { name: updateData.name } : {}),
                    ...(updateData.role && updateData.role !== 'admin' ? { role: updateData.role } : {}),
                    department: updateData.role === 'admin' ? 'Management' : (updateData.department || null),
                    job_title: updateData.job_title || null,
                    phone: updateData.phone || null,
                    ...(updateData.employment_type ? { employment_type: updateData.employment_type } : {}),
                  })
                  patchMemberLocal(res.data.data)
                } catch (err) {
                  toast.error(err.response?.data?.message || 'Could not update team member')
                }
              }}
              onRemoved={handleRemovedFromModal}
            />

            <Dialog open={confirmRemoveOpen} onOpenChange={(open) => !removing && setConfirmRemoveOpen(open)}>
              <DialogContent className="sd-team-profile-dialog sm:max-w-md border-0">
                <DialogHeader className="sr-only">
                  <DialogTitle>Revoke access</DialogTitle>
                  <DialogDescription>Confirm revoking this team member’s workspace access.</DialogDescription>
                </DialogHeader>
                <div className="sd-team-profile-confirm">
                  <div className="sd-team-profile-confirm__icon">
                    <IconUserOff size={22} stroke={1.5} />
                  </div>
                  <h3>Revoke {displayName}’s access?</h3>
                  <p>
                    They will lose login access immediately, but stay on your team roster so you can restore access later.
                  </p>
                  <div className="sd-team-profile-confirm__actions">
                    <Button
                      variant="outline"
                      className="h-10 rounded-full px-5"
                      onClick={() => setConfirmRemoveOpen(false)}
                      disabled={removing}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      className="h-10 rounded-full px-5"
                      onClick={handleRevokeAccess}
                      disabled={removing}
                    >
                      {removing ? 'Revoking…' : 'Revoke access'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={confirmDeleteOpen} onOpenChange={(open) => !removing && setConfirmDeleteOpen(open)}>
              <DialogContent className="sd-team-profile-dialog sm:max-w-md border-0">
                <DialogHeader className="sr-only">
                  <DialogTitle>Delete team member</DialogTitle>
                  <DialogDescription>Confirm permanently deleting this team member.</DialogDescription>
                </DialogHeader>
                <div className="sd-team-profile-confirm">
                  <div className="sd-team-profile-confirm__icon">
                    <IconTrash size={22} stroke={1.5} />
                  </div>
                  <h3>Delete {displayName}?</h3>
                  <p>
                    This permanently removes them from your agency team. This cannot be undone from here.
                  </p>
                  <div className="sd-team-profile-confirm__actions">
                    <Button
                      variant="outline"
                      className="h-10 rounded-full px-5"
                      onClick={() => setConfirmDeleteOpen(false)}
                      disabled={removing}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      className="h-10 rounded-full px-5"
                      onClick={handleDeleteMember}
                      disabled={removing}
                    >
                      {removing ? 'Deleting…' : 'Delete member'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </PageWrapper>
  )
}
