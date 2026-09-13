import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconAlertTriangle,
  IconBriefcase,
  IconCheck,
  IconLayoutGrid,
  IconList,
  IconMailForward,
  IconSearch,
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
import useProjectStore from '../store/projectStore'
import { clientsApi } from '../services/api'
import ClientCard from '../components/clients/ClientCard'
import ClientRow from '../components/clients/ClientRow'
import ClientProfileModal from '../components/clients/ClientProfileModal'
import AddClientModal from '../components/clients/AddClientModal'
import {
  FILTER_PILLS,
  isPendingInvite,
  matchesClientFilter,
} from '../components/clients/client-utils'
import { toProjectsTabRow } from '../components/projects/project-utils'
import { toast } from 'sonner'
import { canAccessClients, homePathForUser, userHasPermission } from '@/lib/roles'

const SORT_OPTIONS = [
  { id: 'recent', label: 'Recently added' },
  { id: 'name_asc', label: 'Company A–Z' },
  { id: 'name_desc', label: 'Company Z–A' },
  { id: 'projects', label: 'Most projects' },
]

function activeProjectsTotal(clients) {
  return clients.reduce((sum, c) => sum + (c.active_projects_count || 0), 0)
}

function pendingInviteCount(clients) {
  return clients.filter((c) => isPendingInvite(c)).length
}

function atRiskCount(clients) {
  return clients.filter((c) => c.at_risk).length
}

export default function ClientsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  const canManage = (user?.role === 'admin' || user?.role === 'pm') && userHasPermission(user, 'clients.manage')
  const showContact = userHasPermission(user, 'clients.contact_details')
  const { projects, fetchProjects } = useProjectStore()

  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('thumbnail')
  const [profileClient, setProfileClient] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')
  const [filterId, setFilterId] = useState('all')
  const [sortBy, setSortBy] = useState('recent')

  useEffect(() => {
    if (!canAccessClients(user)) {
      navigate(homePathForUser(user), { replace: true })
    }
  }, [user, navigate])

  const load = () => {
    setLoading(true)
    clientsApi
      .index()
      .then((res) => setClients(res.data.data || []))
      .catch(() => setClients([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    fetchProjects()
  }, [fetchProjects])

  const clientProjects = useMemo(() => {
    if (!profileClient?.id) return []
    return projects
      .filter((p) => Number(p.client_id) === Number(profileClient.id) || Number(p.client?.id) === Number(profileClient.id))
      .map(toProjectsTabRow)
  }, [projects, profileClient])

  const pendingCount = useMemo(() => pendingInviteCount(clients), [clients])
  const atRisk = useMemo(() => atRiskCount(clients), [clients])

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = clients.filter((c) => matchesClientFilter(c, filterId))

    if (q) {
      list = list.filter((c) => {
        const hay = [c.company_name, c.contact_name, c.contact_email]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return hay.includes(q)
      })
    }

    const sorted = [...list]
    if (sortBy === 'name_asc') {
      sorted.sort((a, b) =>
        String(a.company_name || '').localeCompare(String(b.company_name || '')),
      )
    } else if (sortBy === 'name_desc') {
      sorted.sort((a, b) =>
        String(b.company_name || '').localeCompare(String(a.company_name || '')),
      )
    } else if (sortBy === 'projects') {
      sorted.sort((a, b) => (b.projects_count || 0) - (a.projects_count || 0))
    } else {
      sorted.sort((a, b) => Number(b.id || 0) - Number(a.id || 0))
    }
    return sorted
  }, [clients, search, sortBy, filterId])

  const sortLabel = SORT_OPTIONS.find((o) => o.id === sortBy)?.label || 'Recently added'

  const openProfile = (client) => setProfileClient(client)

  return (
    <PageWrapper
      pageActions={
        <div className="sd-float-page-header__bar sd-page-toolbar sd-page-toolbar--team">
          <PageHeader
            title="Clients"
            subtitle="Manage client accounts and portal access"
          />
          {isAdmin ? (
            <div className="sd-page-actions">
              <Button
                variant="default"
                className="sd-header-new-project sd-btn-gradient inline-flex shrink-0 border-0 shadow-none"
                onClick={() => setShowAdd(true)}
              >
                <IconUserPlus size={16} />
                Add client
              </Button>
            </div>
          ) : null}
        </div>
      }
    >
      <div className="sd-page sd-page--clients">
        <div className="sd-team-kpi">
          <div className="sd-stat-tile sd-team-kpi__card">
            <div className="sd-team-kpi__top">
              <div>
                <p className="sd-stat-tile__label">Total Clients</p>
                <p className="sd-stat-tile__value">{clients.length}</p>
                <p className="sd-team-kpi__hint">Active client accounts</p>
              </div>
              <span className="sd-team-kpi__icon sd-team-kpi__icon--blue">
                <IconUsersGroup size={18} stroke={1.75} />
              </span>
            </div>
          </div>

          <div className="sd-stat-tile sd-team-kpi__card">
            <div className="sd-team-kpi__top">
              <div>
                <p className="sd-stat-tile__label">Active Projects</p>
                <p className="sd-stat-tile__value">{activeProjectsTotal(clients)}</p>
                <p className="sd-team-kpi__hint">Across all clients</p>
              </div>
              <span className="sd-team-kpi__icon sd-team-kpi__icon--indigo">
                <IconBriefcase size={18} stroke={1.75} />
              </span>
            </div>
          </div>

          <div className="sd-stat-tile sd-team-kpi__card">
            <div className="sd-team-kpi__top">
              <div>
                <p className="sd-stat-tile__label">Pending Invites</p>
                <p className="sd-stat-tile__value">{pendingCount}</p>
                <p className="sd-team-kpi__hint">Awaiting portal setup</p>
              </div>
              <span className="sd-team-kpi__icon sd-team-kpi__icon--green">
                <IconMailForward size={18} stroke={1.75} />
              </span>
            </div>
          </div>

          <div className="sd-stat-tile sd-team-kpi__card">
            <div className="sd-team-kpi__top">
              <div>
                <p className="sd-stat-tile__label">At Risk</p>
                <p className="sd-stat-tile__value">{atRisk}</p>
                <p className="sd-team-kpi__hint">Low sentiment score</p>
              </div>
              <span className="sd-team-kpi__icon sd-team-kpi__icon--amber">
                <IconAlertTriangle size={18} stroke={1.75} />
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
              placeholder="Search clients..."
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

          <div className="sd-client-filters" role="group" aria-label="Filter clients">
            {FILTER_PILLS.map((pill) => (
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
        ) : filteredClients.length === 0 && !isAdmin ? (
          <div className="sd-card flex flex-col items-center gap-3 px-6 py-14 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <IconUsers size={22} stroke={1.5} />
            </div>
            <p className="text-sm font-medium">
              {search ? 'No clients match your search' : 'No clients yet'}
            </p>
          </div>
        ) : viewMode === 'thumbnail' ? (
          <div className="sd-team-grid">
            {filteredClients.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                showContact={showContact}
                onClick={openProfile}
              />
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
                <span className="sd-team-add-card__title">Add new client</span>
                <span className="sd-team-add-card__desc">
                  Invite a client company to your workspace
                </span>
                <span className="sd-team-add-card__btn">
                  <IconUserPlus size={14} />
                  Add client
                </span>
              </button>
            )}
          </div>
        ) : (
          <div className="sd-team-list">
            {filteredClients.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No clients match your search
              </p>
            ) : (
              filteredClients.map((client) => (
                <ClientRow
                  key={client.id}
                  client={client}
                  showContact={showContact}
                  onClick={openProfile}
                />
              ))
            )}
          </div>
        )}
      </div>

      <ClientProfileModal
        client={profileClient}
        open={!!profileClient}
        onOpenChange={(open) => {
          if (!open) setProfileClient(null)
        }}
        canManage={canManage}
        canDelete={isAdmin}
        projects={clientProjects}
        onViewKanban={(projectId) => {
          navigate(`/projects/${projectId}/kanban`)
        }}
        onNewProject={() => {
          navigate('/projects')
          toast.info('Create a project from the Projects page')
        }}
        onUpdated={async (id, data, uploaded) => {
          if (uploaded) {
            setClients((prev) => prev.map((c) => (c.id === id ? { ...c, ...uploaded } : c)))
            setProfileClient((prev) => (prev?.id === id ? { ...prev, ...uploaded } : prev))
          }
          if (!data) return uploaded
          const res = await clientsApi.update(id, data)
          const updated = res.data.data
          setClients((prev) => prev.map((c) => (c.id === id ? updated : c)))
          setProfileClient(updated)
          return updated
        }}
        onRemoved={async (id) => {
          await clientsApi.remove(id)
          setProfileClient(null)
          load()
        }}
        onInviteStatusChange={(id, status) => {
          setClients((prev) =>
            prev.map((c) => (c.id === id ? { ...c, invite_status: status } : c)),
          )
          setProfileClient((prev) =>
            prev?.id === id ? { ...prev, invite_status: status } : prev,
          )
        }}
      />

      {isAdmin && (
        <AddClientModal
          open={showAdd}
          onOpenChange={setShowAdd}
          onSuccess={() => load()}
        />
      )}
    </PageWrapper>
  )
}
