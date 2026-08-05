import { useEffect, useMemo, useState } from 'react'
import {
  IconBriefcase,
  IconBuilding,
  IconCheck,
  IconLayoutGrid,
  IconList,
  IconSearch,
  IconShieldCheck,
  IconUserPlus,
  IconUsers,
  IconUsersGroup,
  IconX,
} from '@tabler/icons-react'
import PageWrapper from '../components/layout/PageWrapper'
import PageHeader from '../components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import useAuthStore from '../store/authStore'
import { getAgencyId } from '../lib/media'
import { teamApi } from '../services/api'
import TeamMemberCard from '../components/team/TeamMemberCard'
import TeamMemberRow from '../components/team/TeamMemberRow'
import TeamProfileModal from '../components/team/TeamProfileModal'
import AddMemberModal from '../components/team/AddMemberModal'
import ManageDepartmentsModal from '../components/team/ManageDepartmentsModal'
import { fetchDepartments } from '../components/team/departmentStorage'
import { mergeMemberProfile, saveMemberProfile } from '../components/team/memberProfileStorage'
import { TEAM_FILTER_PILLS, matchesMemberFilter } from '../components/team/team-utils'

const SORT_OPTIONS = [
  { id: 'recent', label: 'Recently added' },
  { id: 'name_asc', label: 'Name A–Z' },
  { id: 'name_desc', label: 'Name Z–A' },
  { id: 'department', label: 'Department' },
]

function statusOnlineCount(members) {
  return members.filter((m) => m.availability === 'available').length
}

function pmCount(members) {
  return members.filter((m) => m.role === 'pm').length
}

export default function MembersPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('thumbnail')
  const [profileMember, setProfileMember] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showDepartments, setShowDepartments] = useState(false)
  const [departments, setDepartments] = useState([])
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('recent')
  const [filterId, setFilterId] = useState('all')

  const agencyId = getAgencyId(user)

  const load = () => {
    setLoading(true)
    teamApi
      .index()
      .then((res) => setMembers(res.data.data || []))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (!agencyId) return
    fetchDepartments(agencyId).then(setDepartments)
  }, [agencyId])

  const enrichedMembers = useMemo(
    () => members.map((m) => mergeMemberProfile(agencyId, m)),
    [members, agencyId],
  )

  const onlineCount = useMemo(
    () => statusOnlineCount(enrichedMembers),
    [enrichedMembers],
  )

  const projectManagers = useMemo(
    () => pmCount(enrichedMembers),
    [enrichedMembers],
  )
  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = enrichedMembers.filter((m) => matchesMemberFilter(m, filterId))
    if (q) {
      list = list.filter((m) => {
        const hay = [
          m.name,
          m.email,
          m.job_title,
          m.department,
          m.employee_id,
          m.role,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return hay.includes(q)
      })
    }

    const sorted = [...list]
    if (sortBy === 'name_asc') {
      sorted.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
    } else if (sortBy === 'name_desc') {
      sorted.sort((a, b) => String(b.name || '').localeCompare(String(a.name || '')))
    } else if (sortBy === 'department') {
      sorted.sort((a, b) =>
        String(a.department || 'zzz').localeCompare(String(b.department || 'zzz')),
      )
    } else {
      sorted.sort((a, b) => Number(b.id || 0) - Number(a.id || 0))
    }
    return sorted
  }, [enrichedMembers, search, sortBy, filterId])

  const sortLabel =
    SORT_OPTIONS.find((o) => o.id === sortBy)?.label || 'Recently added'

  const handleAddMember = async (payload) => {
    const res = await teamApi.invite(payload)
    const member = res.data.data
    load()
    return member
  }

  const handleSendInvite = async (memberId) => {
    await teamApi.resendInvite(memberId)
  }

  const openProfile = (member) => setProfileMember(member)

  return (
    <PageWrapper
      pageActions={
        <div className="sd-float-page-header__bar sd-page-toolbar sd-page-toolbar--team">
          <PageHeader
            title="Team"
            subtitle="Manage your team members and their access"
          />
          {isAdmin ? (
            <div className="sd-page-actions">
              <Button
                variant="secondary"
                className="sd-header-new-project sd-team-manage-btn inline-flex shrink-0 border-0"
                onClick={() => setShowDepartments(true)}
              >
                <IconBuilding size={16} />
                Manage departments
              </Button>
              <Button
                variant="default"
                className="sd-header-new-project sd-btn-gradient inline-flex shrink-0 border-0 shadow-none"
                onClick={() => setShowAdd(true)}
              >
                <IconUserPlus size={16} />
                Add team member
              </Button>
            </div>
          ) : null}
        </div>
      }
    >
      <div className="sd-page sd-page--team">
        <div className="sd-team-kpi">
          <div className="sd-stat-tile sd-team-kpi__card">
            <div className="sd-team-kpi__top">
              <div>
                <p className="sd-stat-tile__label">Total Members</p>
                <p className="sd-stat-tile__value">{enrichedMembers.length}</p>
                <p className="sd-team-kpi__hint">Active team members</p>
              </div>
              <span className="sd-team-kpi__icon sd-team-kpi__icon--blue">
                <IconUsersGroup size={18} stroke={1.75} />
              </span>
            </div>
          </div>

          <div className="sd-stat-tile sd-team-kpi__card">
            <div className="sd-team-kpi__top">
              <div>
                <p className="sd-stat-tile__label">Departments</p>
                <p className="sd-stat-tile__value">{departments.length}</p>
                <p className="sd-team-kpi__hint">Across the organization</p>
              </div>
              <span className="sd-team-kpi__icon sd-team-kpi__icon--indigo">
                <IconShieldCheck size={18} stroke={1.75} />
              </span>
            </div>
          </div>

          <div className="sd-stat-tile sd-team-kpi__card">
            <div className="sd-team-kpi__top">
              <div>
                <p className="sd-stat-tile__label">Online Now</p>
                <p className="sd-stat-tile__value">{onlineCount}</p>
                <p className="sd-team-kpi__hint">Currently online</p>
              </div>
              <span className="sd-team-kpi__icon sd-team-kpi__icon--green">
                <span className="sd-team-kpi__online-dot" />
              </span>
            </div>
          </div>

          <div className="sd-stat-tile sd-team-kpi__card">
            <div className="sd-team-kpi__top">
              <div>
                <p className="sd-stat-tile__label">Project Managers</p>
                <p className="sd-stat-tile__value">{projectManagers}</p>
                <p className="sd-team-kpi__hint">Leading active work</p>
              </div>
              <span className="sd-team-kpi__icon sd-team-kpi__icon--amber">
                <IconBriefcase size={18} stroke={1.75} />
              </span>
            </div>
          </div>
        </div>

        <div className="sd-team-toolbar sd-team-toolbar--clients">
          <div className="sd-team-toolbar__search">
            <IconSearch size={16} stroke={1.75} className="sd-team-toolbar__search-icon" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search members..."
              className="sd-team-toolbar__input"
            />
            {search ? (
              <button
                type="button"
                className="sd-team-toolbar__clear"
                aria-label="Clear search"
                onClick={() => setSearch('')}
              >
                <IconX size={14} stroke={2} />
              </button>
            ) : null}
          </div>

          <div className="sd-client-filters" role="group" aria-label="Filter members">
            {TEAM_FILTER_PILLS.map((pill) => (
              <button
                key={pill.id}
                type="button"
                className={`sd-client-filter sd-client-filter--${pill.id}${filterId === pill.id ? ' is-active' : ''}`}
                onClick={() => setFilterId(pill.id)}
              >
                {pill.label}
              </button>
            ))}
          </div>

          <div className="sd-team-toolbar__right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="sd-team-toolbar__sort">
                  Sort by: <strong>{sortLabel}</strong>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="sd-soft-dropdown w-48 p-1.5 border-0">
                {SORT_OPTIONS.map((opt) => (
                  <DropdownMenuItem
                    key={opt.id}
                    className="cursor-pointer gap-2 rounded-lg"
                    onClick={() => setSortBy(opt.id)}
                  >
                    <span className="flex-1">{opt.label}</span>
                    {sortBy === opt.id && <IconCheck size={14} className="text-primary" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="sd-team-view-toggle" role="group" aria-label="View mode">
              <button
                type="button"
                className={viewMode === 'thumbnail' ? 'is-active' : undefined}
                aria-label="Grid view"
                onClick={() => setViewMode('thumbnail')}
              >
                <IconLayoutGrid size={16} stroke={1.75} />
              </button>
              <button
                type="button"
                className={viewMode === 'list' ? 'is-active' : undefined}
                aria-label="List view"
                onClick={() => setViewMode('list')}
              >
                <IconList size={16} stroke={1.75} />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          viewMode === 'thumbnail' ? (
            <div className="sd-team-grid">
              <Skeleton className="h-64 w-full rounded-[1.25rem]" />
              <Skeleton className="h-64 w-full rounded-[1.25rem]" />
              <Skeleton className="h-64 w-full rounded-[1.25rem]" />
            </div>
          ) : (
            <div className="sd-card p-4">
              <Skeleton className="mb-2 h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          )
        ) : filteredMembers.length === 0 && !isAdmin ? (
          <div className="sd-card flex flex-col items-center gap-3 px-6 py-14 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <IconUsers size={22} stroke={1.5} />
            </div>
            <p className="text-sm font-medium">
              {search || filterId !== 'all' ? 'No members match your filters' : 'No team members yet'}
            </p>
          </div>
        ) : viewMode === 'thumbnail' ? (
          <div className="sd-team-grid">
            {filteredMembers.map((member) => (
              <TeamMemberCard key={member.id} member={member} onClick={openProfile} />
            ))}
            {isAdmin && (
              <button
                type="button"
                className="sd-team-add-card"
                onClick={() => setShowAdd(true)}
              >
                <span className="sd-team-add-card__icon">
                  <IconUserPlus size={22} stroke={1.5} />
                </span>
                <span className="sd-team-add-card__title">Add new member</span>
                <span className="sd-team-add-card__desc">
                  Invite new team member to your workspace
                </span>
                <span className="sd-team-add-card__btn">
                  <IconUserPlus size={14} />
                  Add team member
                </span>
              </button>
            )}
          </div>
        ) : (
          <div className="sd-team-list">
            {filteredMembers.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No members match your filters
              </p>
            ) : (
              filteredMembers.map((member) => (
                <TeamMemberRow key={member.id} member={member} onClick={openProfile} />
              ))
            )}
          </div>
        )}
      </div>

      <TeamProfileModal
        member={profileMember}
        open={!!profileMember}
        onOpenChange={(open) => {
          if (!open) setProfileMember(null)
        }}
        agencyId={agencyId}
        departments={departments}
        canManage={isAdmin}
        onInviteStatusChange={(id, status) => {
          setMembers((prev) =>
            prev.map((m) => (m.id === id ? { ...m, invite_status: status } : m)),
          )
          setProfileMember((prev) =>
            prev?.id === id ? { ...prev, invite_status: status } : prev,
          )
        }}
        onUpdated={async (id, data) => {
          if (data.avatar_url || data.avatar_path) {
            const avatarPatch = {
              avatar_url: data.avatar_url,
              avatar_path: data.avatar_path,
              photo_preview: data.avatar_url,
              avatar_version: data.avatar_version || Date.now(),
            }
            setProfileMember((prev) =>
              prev?.id === id
                ? mergeMemberProfile(agencyId, { ...prev, ...avatarPatch })
                : prev,
            )
            setMembers((prev) =>
              prev.map((m) => (m.id === id ? { ...m, ...avatarPatch } : m)),
            )
          }

          const {
            name,
            role,
            email,
            department,
            job_title,
            phone,
            employment_type,
            first_name,
            last_name,
            address,
            birthday,
            gender,
            start_date,
            work_location,
            employee_id,
            phone_country,
          } = data

          const payload = {
            ...(name ? { name } : {}),
            ...(email ? { email } : {}),
            department: role === 'admin' ? 'Management' : (department || null),
            job_title: job_title || null,
            phone: phone || null,
            ...(employment_type ? { employment_type } : {}),
            profile_meta: {
              first_name,
              last_name,
              address,
              birthday,
              gender,
              start_date,
              work_location,
              ...(role === 'admin' ? {} : { employee_id }),
              phone_country,
            },
          }
          if (role && role !== 'admin') payload.role = role

          try {
            const res = await teamApi.update(id, payload)
            const updated = res.data.data
            setMembers((prev) => prev.map((m) => (m.id === id ? updated : m)))
            setProfileMember((prev) =>
              prev && prev.id === id ? mergeMemberProfile(agencyId, updated) : prev,
            )
          } catch {
            /* local profile still saved in modal */
          }
          load()
        }}
        onRemoved={async (id) => {
          await teamApi.remove(id)
          setProfileMember(null)
          load()
        }}
      />

      {isAdmin && (
        <>
          <AddMemberModal
            open={showAdd}
            onOpenChange={setShowAdd}
            onSuccess={handleAddMember}
            onSendInvite={handleSendInvite}
            agencyId={agencyId}
            departments={departments}
            members={members}
            onOpenManageDepartments={() => {
              setShowAdd(false)
              setShowDepartments(true)
            }}
          />
          <ManageDepartmentsModal
            open={showDepartments}
            onOpenChange={setShowDepartments}
            agencyId={agencyId}
            members={enrichedMembers}
            onDepartmentsChange={setDepartments}
            onDepartmentRenamed={(oldName, newName) => {
              const oldNeedle = oldName.trim().toLowerCase()
              setMembers((prev) =>
                prev.map((m) =>
                  (m.department || '').trim().toLowerCase() === oldNeedle
                    ? { ...m, department: newName }
                    : m,
                ),
              )
            }}
            onDepartmentRemoved={(removedName) => {
              if (!removedName) return
              const needle = removedName.trim().toLowerCase()
              setMembers((prev) =>
                prev.map((m) => {
                  if ((m.department || '').trim().toLowerCase() !== needle) return m
                  saveMemberProfile(agencyId, m, { department: '' })
                  return { ...m, department: '' }
                }),
              )
              setProfileMember((current) => {
                if (!current) return current
                if ((current.department || '').trim().toLowerCase() !== needle) return current
                return { ...current, department: '' }
              })
            }}
          />
        </>
      )}
    </PageWrapper>
  )
}
