import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { IconPlus, IconList, IconLayoutKanban, IconCalendar, IconTimeline, IconAdjustmentsHorizontal, IconArrowsSort } from '@tabler/icons-react'
import PageWrapper from '../components/layout/PageWrapper'
import useProjectStore from '../store/projectStore'
import KanbanBoard from '../components/kanban/KanbanBoard'
import NewTaskModal from '../components/modals/NewTaskModal'
import TaskDetailModal from '../components/modals/TaskDetailModal'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

// TODO Session 5.x — replace with real team API
const MOCK_TEAM = [
  { id: 1, name: 'Morgan Lee', role: 'admin' },
  { id: 2, name: 'Jordan Kim', role: 'pm' },
  { id: 3, name: 'Alex Chen',  role: 'member' },
]

const VIEW_TABS = [
  { id: 'list',    label: 'List',     icon: IconList },
  { id: 'kanban',  label: 'Kanban',   icon: IconLayoutKanban },
  { id: 'calendar',label: 'Calendar', icon: IconCalendar },
  { id: 'timeline',label: 'Timeline', icon: IconTimeline },
]

function initials(name) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

function IconBtn({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 rounded-lg border border-border bg-card-solid/60 px-2.5 py-1.5 text-[11px] text-muted-foreground backdrop-blur transition-all hover:border-primary/30 hover:text-primary cursor-pointer"
    >
      <Icon size={13} />
      {label}
    </button>
  )
}

export default function KanbanPage() {
  const { id } = useParams()
  const { currentProject, fetchProject, isLoading } = useProjectStore()

  const [activeView,       setActiveView]       = useState('kanban')
  const [taskModalOpen,    setTaskModalOpen]    = useState(false)
  const [selectedTask,     setSelectedTask]     = useState(null)
  const [newTaskOpen,      setNewTaskOpen]      = useState(false)
  const [newTaskStatus,    setNewTaskStatus]    = useState('todo')
  const [boardKey,         setBoardKey]         = useState(0) // increment to force board re-fetch

  useEffect(() => { fetchProject(id) }, [id])

  const projectName = isLoading ? '…' : (currentProject?.name || 'Project')
  const progress    = currentProject?.progress_percent ?? 0

  const openNewTask = (status = 'todo') => {
    setNewTaskStatus(status)
    setNewTaskOpen(true)
  }

  const openTaskDetail = (task) => {
    setSelectedTask(task)
    setTaskModalOpen(true)
  }

  const handleTaskCreated = () => {
    setBoardKey((k) => k + 1) // re-fetch board
  }

  return (
    <PageWrapper
      breadcrumb={['Projects', projectName]}
      topbarAction={{ label: 'New task', icon: IconPlus, onClick: () => openNewTask('todo') }}
    >
      <div className="flex h-full flex-col">

        {/* Sub-header */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border pb-3 mb-3 shrink-0">
          {/* Left: title + progress */}
          <div className="flex min-w-0 flex-col gap-1">
            <div className="text-[15px] font-medium text-foreground">
              {projectName}
            </div>
            <div className="flex items-center gap-2">
              <div className="h-[3px] w-24 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${progress}%`, background: 'var(--sd-grad)' }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{progress}% complete</span>
            </div>
          </div>

          {/* Center: view tabs */}
          <div className="flex items-center gap-0.5 rounded-xl border border-border bg-card-solid/50 p-0.5 backdrop-blur">
            {VIEW_TABS.map((tab) => {
              const active = activeView === tab.id
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveView(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-[11px] cursor-pointer transition-all',
                    active
                      ? 'font-medium text-primary bg-[var(--sd-grad-soft)] shadow-[var(--sd-glow-sm)]'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  )}
                >
                  <Icon size={13} />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Right: sort + filter + team avatars + invite */}
          <div className="flex items-center gap-2">
            <IconBtn icon={IconArrowsSort} label="Sort" />
            <IconBtn icon={IconAdjustmentsHorizontal} label="Filter" />

            {/* Team avatar stack */}
            <div className="flex items-center">
              {MOCK_TEAM.map((member, i) => (
                <Avatar
                  key={member.id}
                  className={cn('size-6', i !== 0 && '-ml-1.5 ring-2 ring-card-solid')}
                  title={member.name}
                >
                  <AvatarFallback className="text-[9px] font-semibold">{initials(member.name)}</AvatarFallback>
                </Avatar>
              ))}
            </div>

            <button className="rounded-lg border border-dashed border-primary/50 px-2.5 py-1.5 text-[11px] text-primary cursor-pointer transition-all hover:bg-[var(--sd-grad-soft)] hover:shadow-[var(--sd-glow-sm)]">
              + Invite
            </button>
          </div>
        </div>

        {/* Board area */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {activeView === 'kanban' ? (
            <KanbanBoard
              key={boardKey}
              projectId={id}
              onTaskClick={openTaskDetail}
              onAddTask={openNewTask}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2">
              <div className="text-[13px] font-medium text-foreground">
                {VIEW_TABS.find((t) => t.id === activeView)?.label} view
              </div>
              <div className="text-[11px] text-muted-foreground">
                Coming in a future session.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
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
    </PageWrapper>
  )
}
