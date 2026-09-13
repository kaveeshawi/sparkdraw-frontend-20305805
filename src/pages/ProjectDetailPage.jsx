import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  IconPlus,
  IconLayoutDashboard,
  IconLayoutKanban,
  IconList,
  IconChartBar,
  IconFlag,
  IconClockHour4,
  IconMessage2,
  IconFolder,
  IconUsers,
  IconReceipt,
  IconArrowLeft,
  IconPencil,
  IconDotsVertical,
  IconTrash,
  IconSparkles,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import PageWrapper from '../components/layout/PageWrapper'
import PageHeader from '../components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import useProjectStore from '../store/projectStore'
import useAuthStore from '../store/authStore'
import KanbanBoard from '../components/kanban/KanbanBoard'
import NewTaskModal from '../components/modals/NewTaskModal'
import TaskDetailModal from '../components/modals/TaskDetailModal'
import EditProjectModal from '../components/modals/EditProjectModal'
import ConfirmDialog from '../components/assets/ConfirmDialog'
import ProjectHeader from '../components/project-detail/ProjectHeader'
import OverviewTab from '../components/project-detail/OverviewTab'
import AnalyticsTab from '../components/project-detail/AnalyticsTab'
import AiTab from '../components/project-detail/AiTab'
import TaskListTab from '../components/project-detail/TaskListTab'
import MilestonesTab from '../components/project-detail/MilestonesTab'
import TeamTab from '../components/project-detail/TeamTab'
import TimeBudgetTab from '../components/project-detail/TimeBudgetTab'
import FeedbackTab from '../components/project-detail/FeedbackTab'
import FilesTab from '../components/project-detail/FilesTab'
import InvoicesTab from '../components/project-detail/InvoicesTab'
import { cn } from '@/lib/utils'
import { apiErrorMessage } from '@/lib/apiError'
import { isAgencyAdmin, normalizeRole } from '../lib/roles'
import { projectsApi } from '../services/api'

const ALL_TABS = [
  { id: 'overview',   label: 'Overview',      icon: IconLayoutDashboard, roles: ['admin', 'pm', 'member'] },
  { id: 'list',       label: 'List',          icon: IconList,            roles: ['admin', 'pm', 'member'] },
  { id: 'board',      label: 'Board',         icon: IconLayoutKanban,    roles: ['admin', 'pm', 'member'] },
  { id: 'analytics',  label: 'Analytics',     icon: IconChartBar,        roles: ['admin', 'pm'] },
  { id: 'ai',         label: 'AI',            icon: IconSparkles,        roles: ['admin', 'pm'] },
  { id: 'milestones', label: 'Milestones',    icon: IconFlag,            roles: ['admin', 'pm', 'member'] },
  { id: 'feedback',   label: 'Messages',      icon: IconMessage2,        roles: ['admin', 'pm', 'member'] },
  { id: 'files',      label: 'Documents',     icon: IconFolder,          roles: ['admin', 'pm', 'member'] },
  { id: 'team',       label: 'Team',          icon: IconUsers,           roles: ['admin', 'pm', 'member'] },
  { id: 'time',       label: 'Time & Budget', icon: IconClockHour4,      roles: ['admin', 'pm'] },
  { id: 'invoices',   label: 'Invoices',      icon: IconReceipt,         roles: ['admin'] },
]

export default function ProjectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { currentProject, fetchProject, isLoading } = useProjectStore()
  const { user } = useAuthStore()

  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'overview')
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [newTaskOpen, setNewTaskOpen] = useState(false)
  const [newTaskStatus, setNewTaskStatus] = useState('todo')
  const [boardKey, setBoardKey] = useState(0)
  const [editOpen, setEditOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  useEffect(() => { fetchProject(id) }, [id])

  const canEdit = isAgencyAdmin(user) || normalizeRole(user?.role) === 'pm'
  const canDelete = isAgencyAdmin(user)

  const applyProjectUpdate = (updated) => {
    const store = useProjectStore.getState()
    const prev = store.currentProject
    if (!updated) {
      fetchProject(id)
      return
    }
    store.setCurrentProject({
      ...prev,
      ...updated,
      client: { ...(prev?.client || {}), ...(updated.client || {}) },
      team_members: updated.team_members || prev?.team_members,
    })
    // Keep list cache in sync when name/status change
    if (Array.isArray(store.projects) && store.projects.length) {
      useProjectStore.setState({
        projects: store.projects.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)),
      })
    }
  }

  const tabs = useMemo(
    () => ALL_TABS.filter((t) => !user?.role || t.roles.includes(user.role)),
    [user?.role],
  )

  useEffect(() => {
    const fromUrl = searchParams.get('tab')
    if (fromUrl && tabs.some((t) => t.id === fromUrl) && fromUrl !== activeTab) {
      setActiveTab(fromUrl)
    }
  }, [searchParams, tabs, activeTab])

  useEffect(() => {
    if (tabs.length && !tabs.some((t) => t.id === activeTab)) {
      setActiveTab(tabs[0].id)
    }
  }, [tabs, activeTab])

  const selectTab = (tabId) => {
    setActiveTab(tabId)
    const next = new URLSearchParams(searchParams)
    if (tabId === 'overview') next.delete('tab')
    else next.set('tab', tabId)
    setSearchParams(next, { replace: true })
  }

  const projectName = isLoading ? '…' : (currentProject?.name || 'Project')

  const openNewTask = (status = 'todo') => {
    setNewTaskStatus(status)
    setNewTaskOpen(true)
  }

  const openTaskDetail = (task) => {
    setSelectedTask(task)
    setTaskModalOpen(true)
  }

  const handleTaskCreated = () => setBoardKey((k) => k + 1)
  const refreshProject = () => fetchProject(id)

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/projects')
  }

  const handleDeleteProject = async () => {
    if (!currentProject?.id || deleting) return

    setDeleting(true)
    try {
      await projectsApi.destroy(currentProject.id)
      const store = useProjectStore.getState()
      useProjectStore.setState({
        currentProject: null,
        projects: (store.projects || []).filter((p) => p.id !== currentProject.id),
        lastFetchedAt: null,
      })
      setConfirmDeleteOpen(false)
      toast.success('Project deleted')
      navigate('/projects')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not delete project'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <PageWrapper
      breadcrumb={['Projects', projectName]}
      pageActions={
        <div className="sd-float-page-header__bar sd-page-toolbar sd-page-toolbar--team">
          <div className="sd-team-portal__header-left">
            <button
              type="button"
              className="sd-team-portal__back"
              onClick={handleBack}
              aria-label="Back to projects"
            >
              <IconArrowLeft size={16} stroke={1.75} />
              Back
            </button>
            <PageHeader
              title="Project workspace"
              subtitle="Board, analytics, milestones and delivery signals"
            />
          </div>
          <div className="sd-page-actions">
            {canEdit && currentProject ? (
              <Button
                variant="secondary"
                className="sd-header-new-project sd-team-manage-btn inline-flex shrink-0 border-0"
                onClick={() => setEditOpen(true)}
              >
                <IconPencil size={16} />
                Edit project
              </Button>
            ) : null}
            {(activeTab === 'board' || activeTab === 'list') ? (
              <Button
                className="sd-btn-gradient sd-header-new-project inline-flex shrink-0 border-0"
                onClick={() => openNewTask('todo')}
              >
                <IconPlus size={16} />
                New task
              </Button>
            ) : null}
            {canDelete && currentProject ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    className="sd-header-new-project sd-team-manage-btn inline-flex size-10 shrink-0 border-0 px-0"
                    aria-label="More project actions"
                    disabled={deleting}
                  >
                    <IconDotsVertical size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="sd-soft-dropdown w-48 p-1.5 border-0">
                  <DropdownMenuItem
                    className="cursor-pointer gap-2 rounded-lg text-red-600 focus:text-red-600"
                    disabled={deleting}
                    onClick={() => setConfirmDeleteOpen(true)}
                  >
                    <IconTrash size={15} stroke={1.75} />
                    Delete project
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>
      }
    >
      <div className="sd-page sd-page--projects sd-team-portal sd-proj-portal sd-animate-in">
        {!currentProject && isLoading ? (
          <div className="sd-team-portal__empty">Loading project…</div>
        ) : !currentProject ? (
          <div className="sd-team-portal__empty">Project not found.</div>
        ) : (
          <>
            <ProjectHeader
              project={currentProject}
              showBudget={user?.role !== 'member'}
              canEdit={canEdit}
              onEdit={() => setEditOpen(true)}
              onOpenMessages={() => setActiveTab('feedback')}
              onUpdated={applyProjectUpdate}
            />

            <div className="sd-team-portal__tabs-wrap" role="tablist" aria-label="Project sections">
              <div className="sd-header-tabs sd-team-portal__tabs">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  const active = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      data-testid={`project-tab-${tab.id}`}
                      onClick={() => selectTab(tab.id)}
                      className={cn('sd-header-tab sd-team-portal__tab', active && 'sd-header-tab--active')}
                    >
                      <Icon size={14} stroke={1.75} aria-hidden />
                      {tab.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className={cn(
              'sd-team-portal__content sd-proj-portal__content',
              (activeTab === 'board' || activeTab === 'list') && 'sd-proj-portal__content--fill',
            )}
            >
              {activeTab === 'overview' && (
                <OverviewTab project={currentProject} projectId={id} />
              )}
              {activeTab === 'list' && (
                <TaskListTab projectId={id} onTaskClick={openTaskDetail} />
              )}
              {activeTab === 'board' && (
                <KanbanBoard
                  key={boardKey}
                  projectId={id}
                  onTaskClick={openTaskDetail}
                  onAddTask={openNewTask}
                />
              )}
              {activeTab === 'analytics' && (
                <AnalyticsTab project={currentProject} projectId={id} />
              )}
              {activeTab === 'ai' && (
                <AiTab
                  project={currentProject}
                  projectId={id}
                  onProjectRefresh={() => fetchProject(id)}
                />
              )}
              {activeTab === 'milestones' && (
                <MilestonesTab project={currentProject} projectId={id} onChanged={refreshProject} />
              )}
              {activeTab === 'time' && (
                <TimeBudgetTab project={currentProject} projectId={id} />
              )}
              {activeTab === 'feedback' && <FeedbackTab projectId={id} />}
              {activeTab === 'files' && <FilesTab projectId={id} />}
              {activeTab === 'team' && <TeamTab project={currentProject} />}
              {activeTab === 'invoices' && <InvoicesTab projectId={id} />}
            </div>
          </>
        )}
      </div>

      <NewTaskModal
        open={newTaskOpen}
        onClose={() => setNewTaskOpen(false)}
        projectId={id}
        projectType={currentProject?.type || 'general'}
        defaultStatus={newTaskStatus}
        onCreated={handleTaskCreated}
      />

      <TaskDetailModal
        open={taskModalOpen}
        task={selectedTask}
        onClose={() => { setTaskModalOpen(false); setSelectedTask(null) }}
      />

      {canEdit && currentProject ? (
        <EditProjectModal
          open={editOpen}
          onOpenChange={setEditOpen}
          project={currentProject}
          onUpdated={applyProjectUpdate}
        />
      ) : null}

      {canDelete && currentProject ? (
        <ConfirmDialog
          open={confirmDeleteOpen}
          onOpenChange={setConfirmDeleteOpen}
          title={`Delete "${currentProject.name || 'this project'}"?`}
          description="This archives the project and cannot be undone from the board."
          confirmLabel={deleting ? 'Deleting…' : 'Delete project'}
          cancelLabel="Cancel"
          destructive
          busy={deleting}
          closeOnConfirm={false}
          onConfirm={handleDeleteProject}
        />
      ) : null}
    </PageWrapper>
  )
}
