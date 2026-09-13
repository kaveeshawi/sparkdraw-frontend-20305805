import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconAlertTriangle,
  IconBriefcase,
  IconCheck,
  IconCircleCheck,
  IconFolder,
  IconFolderPlus,
  IconLayoutGrid,
  IconLayoutKanban,
  IconList,
  IconSearch,
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
import NewProjectModal from '../components/modals/NewProjectModal'
import EditProjectModal from '../components/modals/EditProjectModal'
import ManageServicesModal from '../components/projects/ManageServicesModal'
import ProjectCard from '../components/projects/ProjectCard'
import ProjectRow from '../components/projects/ProjectRow'
import ProjectsInsightsPanel from '../components/projects/ProjectsInsightsPanel'
import {
  FILTER_PILLS,
  isProjectAtRisk,
  matchesProjectFilter,
} from '../components/projects/project-utils'
import useAuthStore from '../store/authStore'
import useProjectStore from '../store/projectStore'
import { isAgencyAdmin, normalizeRole } from '../lib/roles'

const SORT_OPTIONS = [
  { id: 'recent', label: 'Recently added' },
  { id: 'name_asc', label: 'Name A–Z' },
  { id: 'name_desc', label: 'Name Z–A' },
  { id: 'due', label: 'Due date' },
  { id: 'health', label: 'Health (worst first)' },
]

const HEALTH_RANK = { red: 0, amber: 1, green: 2, none: 3 }

export default function ProjectsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const canCreate = isAgencyAdmin(user) || normalizeRole(user?.role) === 'pm'
  const isAdmin = isAgencyAdmin(user)

  const { projects, summary, fetchProjects, isLoading } = useProjectStore()
  const [showNewProject, setShowNewProject] = useState(false)
  const [showManageServices, setShowManageServices] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [viewMode, setViewMode] = useState('thumbnail')
  const [search, setSearch] = useState('')
  const [filterId, setFilterId] = useState('all')
  const [sortBy, setSortBy] = useState('recent')

  useEffect(() => {
    fetchProjects(true)
  }, [fetchProjects])

  const stats = useMemo(() => {
    if (summary && typeof summary === 'object') {
      return {
        total: summary.total ?? projects.length,
        active: summary.active ?? 0,
        completed: summary.completed ?? 0,
        atRisk: summary.at_risk ?? projects.filter(isProjectAtRisk).length,
      }
    }
    return {
      total: projects.length,
      active: projects.filter((p) => p.status === 'active').length,
      completed: projects.filter((p) => p.status === 'completed').length,
      atRisk: projects.filter(isProjectAtRisk).length,
    }
  }, [projects, summary])

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = projects.filter((p) => matchesProjectFilter(p, filterId))

    if (q) {
      list = list.filter((p) => {
        const hay = [p.name, p.type, p.client?.company_name, p.status]
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
    } else if (sortBy === 'due') {
      sorted.sort((a, b) => {
        const da = a.end_date ? new Date(a.end_date).getTime() : Infinity
        const db = b.end_date ? new Date(b.end_date).getTime() : Infinity
        return da - db
      })
    } else if (sortBy === 'health') {
      sorted.sort((a, b) => {
        const fa = a.health_score?.flag || a.latest_health_score?.flag || 'none'
        const fb = b.health_score?.flag || b.latest_health_score?.flag || 'none'
        const ra = HEALTH_RANK[fa] ?? 3
        const rb = HEALTH_RANK[fb] ?? 3
        if (ra !== rb) return ra - rb
        const sa = a.health_score?.score ?? a.latest_health_score?.score ?? 999
        const sb = b.health_score?.score ?? b.latest_health_score?.score ?? 999
        return sa - sb
      })
    } else {
      sorted.sort((a, b) => Number(b.id || 0) - Number(a.id || 0))
    }
    return sorted
  }, [projects, search, filterId, sortBy])

  const sortLabel = SORT_OPTIONS.find((o) => o.id === sortBy)?.label || 'Recently added'
  const openModal = () => setShowNewProject(true)
  const openBoard = (project) => navigate(`/projects/${project.id}/kanban`)

  const projectsMain = (
    <>
      <div className="sd-team-toolbar sd-team-toolbar--clients">
        <div className="sd-team-toolbar__search">
          <IconSearch size={16} stroke={1.75} className="sd-team-toolbar__search-icon" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
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

        <div className="sd-client-filters" role="group" aria-label="Filter projects">
          {FILTER_PILLS.map((pill) => (
            <button
              key={pill.id}
              type="button"
              className={`sd-client-filter sd-client-filter--${pill.id}${
                filterId === pill.id ? ' is-active' : ''
              }`}
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
            <DropdownMenuContent align="end" className="sd-soft-dropdown w-52 p-1.5 border-0">
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

      {isLoading ? (
        <div className="sd-team-grid sd-team-grid--projects">
          <Skeleton className="h-72 w-full rounded-2xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="sd-card flex flex-col items-center gap-3 px-6 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <IconFolderPlus size={22} stroke={1.5} />
          </div>
          <div>
            <p className="text-sm font-medium">
              {search || filterId !== 'all'
                ? 'No projects match your filters'
                : 'No projects yet'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {search || filterId !== 'all'
                ? 'Try another search or filter.'
                : 'Create your first project to start tracking work and health scores.'}
            </p>
          </div>
          {canCreate && !search && filterId === 'all' ? (
            <Button onClick={openModal} className="sd-btn-gradient mt-2 border-0">
              Create your first project
            </Button>
          ) : null}
        </div>
      ) : viewMode === 'list' ? (
        <div className="sd-team-list">
          {filteredProjects.map((project) => (
            <ProjectRow
              key={project.id}
              project={project}
              onOpen={openBoard}
              canEdit={canCreate}
              onEdit={setEditingProject}
            />
          ))}
          {canCreate ? (
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-[var(--color-surface-1)] px-4 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
              onClick={openModal}
            >
              <IconFolderPlus size={18} stroke={1.75} />
              New project
            </button>
          ) : null}
        </div>
      ) : (
        <div className={`sd-team-grid sd-team-grid--projects${isAdmin ? ' sd-team-grid--projects-with-rail' : ''}`}>
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onOpen={openBoard}
              canEdit={canCreate}
              onEdit={setEditingProject}
            />
          ))}
          {canCreate ? (
            <button type="button" className="sd-team-add-card" onClick={openModal}>
              <span className="sd-team-add-card__icon">
                <IconFolderPlus size={22} stroke={1.5} />
              </span>
              <span className="sd-team-add-card__title">New project</span>
              <span className="sd-team-add-card__desc">
                AI brief + milestones for faster kickoff
              </span>
              <span className="sd-team-add-card__btn">
                <IconFolderPlus size={14} />
                Create project
              </span>
            </button>
          ) : null}
        </div>
      )}
    </>
  )

  return (
    <PageWrapper
      pageActions={
        <div className="sd-float-page-header__bar sd-page-toolbar sd-page-toolbar--team">
          <PageHeader
            title="Projects"
            subtitle="Track delivery, health scores, and AI risk signals"
          />
          {canCreate ? (
            <div className="sd-page-actions">
              <Button
                variant="secondary"
                className="sd-header-new-project sd-team-manage-btn inline-flex shrink-0 border-0"
                onClick={() => setShowManageServices(true)}
              >
                <IconBriefcase size={16} />
                Manage services
              </Button>
              <Button
                variant="default"
                className="sd-header-new-project sd-btn-gradient inline-flex shrink-0 border-0 shadow-none"
                onClick={openModal}
              >
                <IconFolderPlus size={16} />
                New project
              </Button>
            </div>
          ) : null}
        </div>
      }
    >
      <div className={`sd-page sd-page--projects${isAdmin ? ' sd-page--projects-admin' : ''}`}>
        <div className="sd-team-kpi sd-team-kpi--projects-lite">
          <div className="sd-stat-tile sd-team-kpi__card">
            <div className="sd-team-kpi__top">
              <div>
                <p className="sd-stat-tile__label">Total Projects</p>
                <p className="sd-stat-tile__value">{stats.total}</p>
                <p className="sd-team-kpi__hint">Across your agency</p>
              </div>
              <span className="sd-team-kpi__icon sd-team-kpi__icon--blue">
                <IconFolder size={18} stroke={1.75} />
              </span>
            </div>
          </div>
          <div className="sd-stat-tile sd-team-kpi__card">
            <div className="sd-team-kpi__top">
              <div>
                <p className="sd-stat-tile__label">Active</p>
                <p className="sd-stat-tile__value">{stats.active}</p>
                <p className="sd-team-kpi__hint">In progress now</p>
              </div>
              <span className="sd-team-kpi__icon sd-team-kpi__icon--green">
                <IconLayoutKanban size={18} stroke={1.75} />
              </span>
            </div>
          </div>
          <div className="sd-stat-tile sd-team-kpi__card">
            <div className="sd-team-kpi__top">
              <div>
                <p className="sd-stat-tile__label">At Risk</p>
                <p className="sd-stat-tile__value">{stats.atRisk}</p>
                <p className="sd-team-kpi__hint">Amber or red health</p>
              </div>
              <span className="sd-team-kpi__icon sd-team-kpi__icon--amber">
                <IconAlertTriangle size={18} stroke={1.75} />
              </span>
            </div>
          </div>
          <div className="sd-stat-tile sd-team-kpi__card">
            <div className="sd-team-kpi__top">
              <div>
                <p className="sd-stat-tile__label">Completed</p>
                <p className="sd-stat-tile__value">{stats.completed}</p>
                <p className="sd-team-kpi__hint">Delivered work</p>
              </div>
              <span className="sd-team-kpi__icon sd-team-kpi__icon--indigo">
                <IconCircleCheck size={18} stroke={1.75} />
              </span>
            </div>
          </div>
        </div>

        {isAdmin ? (
          <div className="sd-projects-layout">
            <div className="sd-projects-layout__main">{projectsMain}</div>
            <aside className="sd-projects-layout__rail" aria-label="Agency insights">
              <ProjectsInsightsPanel projects={projects} compact />
            </aside>
          </div>
        ) : (
          projectsMain
        )}
      </div>

      <NewProjectModal
        open={showNewProject}
        onClose={() => setShowNewProject(false)}
        onCreated={() => {
          fetchProjects(true)
          setShowNewProject(false)
        }}
      />

      {canCreate ? (
        <EditProjectModal
          open={!!editingProject}
          onOpenChange={(open) => {
            if (!open) setEditingProject(null)
          }}
          project={editingProject}
          onUpdated={() => {
            fetchProjects(true)
            setEditingProject(null)
          }}
        />
      ) : null}

      <ManageServicesModal
        open={showManageServices}
        onOpenChange={setShowManageServices}
        projects={projects}
        onServiceRenamed={() => fetchProjects(true)}
      />
    </PageWrapper>
  )
}
