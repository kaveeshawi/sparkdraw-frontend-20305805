import {
  IconCalendarStats, IconUmbrella, IconFolder, IconCreditCard,
  IconListCheck, IconCalendarDue,
} from '@tabler/icons-react'
import { Panel, LeaveBalancePie, DataTable, StatusBadge, ProgressCell } from './shared'
import { cn } from '@/lib/utils'
import { useFormatMoney } from '@/hooks/useAgencyCurrency'

const TASK_STATUS = {
  completed: { label: 'Completed', className: 'is-done' },
  in_progress: { label: 'In Progress', className: 'is-hold' },
  not_started: { label: 'Not Started', className: 'is-risk' },
  blocked: { label: 'Blocked', className: 'is-risk' },
  overdue: { label: 'Overdue', className: 'is-risk' },
  cancelled: { label: 'Cancelled', className: 'is-done' },
}

const PRIORITY_CLASS = {
  High: 'is-high',
  Medium: 'is-medium',
  Low: 'is-low',
}

function AttendanceBar({ day }) {
  const heightPct = day.status === 'weekend' ? 15 : Math.min(100, (day.hours / 10) * 100)
  const color = day.status === 'present' ? '#10b981'
    : day.status === 'late' ? '#f59e0b'
    : day.status === 'absent' ? '#ef4444'
    : 'var(--border)'
  return (
    <div className="sd-team-portal__att-col">
      <div className="sd-team-portal__att-track">
        <div className="sd-team-portal__att-fill" style={{ height: `${Math.max(10, heightPct)}%`, background: color }} />
      </div>
      <p className="sd-team-portal__att-label">{day.day}</p>
    </div>
  )
}

function TaskStatusBadge({ status }) {
  const meta = TASK_STATUS[status] || TASK_STATUS.not_started
  return <span className={cn('sd-dash-v2__status', meta.className)}>{meta.label}</span>
}

function TaskList({ tasks }) {
  return (
    <ul className="sd-team-portal__task-list">
      {tasks.map((task, i) => (
        <li key={`${task.title}-${i}`} className={cn('sd-team-portal__task-row', task.status === 'completed' && 'is-completed')}>
          <div className="sd-team-portal__task-main">
            <p className="sd-team-portal__task-title">{task.title}</p>
            <p className="sd-team-portal__task-meta">
              <span>{task.area}</span>
              <span aria-hidden>·</span>
              <span>Due {task.due}</span>
              {task.remarks ? (
                <>
                  <span aria-hidden>·</span>
                  <span>{task.remarks}</span>
                </>
              ) : null}
            </p>
          </div>
          <div className="sd-team-portal__task-side">
            <span className={cn('sd-team-portal__task-priority', PRIORITY_CLASS[task.priority] || 'is-medium')}>
              {task.priority}
            </span>
            <TaskStatusBadge status={task.status} />
            <div className="sd-team-portal__task-progress">
              <ProgressCell value={task.completion} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

export default function OverviewTab({ data, onNavigateTab }) {
  const money = useFormatMoney()
  const { attendance, leave, projects, payroll, weekTasks = [], upcomingTasks = [] } = data
  const leaveRemaining = leave.annual.total - leave.annual.used
  const activeProjects = projects.filter((p) => p.status !== 'completed').length

  const workDays = attendance.week.filter((d) => d.status !== 'weekend')
  const presentDays = workDays.filter((d) => d.status === 'present' || d.status === 'late').length
  const lateDays = workDays.filter((d) => d.status === 'late').length
  const weekHours = workDays.reduce((sum, d) => sum + (d.hours || 0), 0)
  const weekHoursLabel = `${weekHours.toFixed(weekHours % 1 === 0 ? 0 : 1)}h`

  return (
    <div className="sd-dash-v2 sd-team-portal__overview">
      <div className="sd-team-kpi">
        <div className="sd-stat-tile sd-team-kpi__card">
          <div className="sd-team-kpi__top">
            <div>
              <p className="sd-stat-tile__label">Attendance</p>
              <p className="sd-stat-tile__value">{attendance.pct}%</p>
              <p className="sd-team-kpi__hint">This month</p>
            </div>
            <span className="sd-team-kpi__icon sd-team-kpi__icon--blue">
              <IconCalendarStats size={18} stroke={1.75} />
            </span>
          </div>
        </div>

        <div className="sd-stat-tile sd-team-kpi__card">
          <div className="sd-team-kpi__top">
            <div>
              <p className="sd-stat-tile__label">Leave Balance</p>
              <p className="sd-stat-tile__value">{leaveRemaining} days</p>
              <p className="sd-team-kpi__hint">Annual remaining</p>
            </div>
            <span className="sd-team-kpi__icon sd-team-kpi__icon--amber">
              <IconUmbrella size={18} stroke={1.75} />
            </span>
          </div>
        </div>

        <div className="sd-stat-tile sd-team-kpi__card">
          <div className="sd-team-kpi__top">
            <div>
              <p className="sd-stat-tile__label">Projects</p>
              <p className="sd-stat-tile__value">{activeProjects}</p>
              <p className="sd-team-kpi__hint">Active engagements</p>
            </div>
            <span className="sd-team-kpi__icon sd-team-kpi__icon--indigo">
              <IconFolder size={18} stroke={1.75} />
            </span>
          </div>
        </div>

        <div className="sd-stat-tile sd-team-kpi__card">
          <div className="sd-team-kpi__top">
            <div>
              <p className="sd-stat-tile__label">Monthly Salary</p>
              <p className="sd-stat-tile__value">{money(payroll.grossSalary)}</p>
              <p className="sd-team-kpi__hint">Gross salary</p>
            </div>
            <span className="sd-team-kpi__icon sd-team-kpi__icon--green">
              <IconCreditCard size={18} stroke={1.75} />
            </span>
          </div>
        </div>
      </div>

      <div className="sd-team-portal__overview-grid">
        <div className="sd-team-portal__overview-stack">
          <Panel
            title="This Week's Tasks"
            desc="Weekly target deliverables"
            action={(
              <span className="sd-team-portal__panel-count">
                <IconListCheck size={14} stroke={1.75} />
                {weekTasks.length}
              </span>
            )}
          >
            <TaskList tasks={weekTasks} />
          </Panel>

          <Panel
            title="Upcoming Tasks"
            desc="Next week targets & follow-ups"
            action={(
              <span className="sd-team-portal__panel-count">
                <IconCalendarDue size={14} stroke={1.75} />
                {upcomingTasks.length}
              </span>
            )}
          >
            <TaskList tasks={upcomingTasks} />
          </Panel>
        </div>

        <div className="sd-team-portal__overview-stack">
          <Panel
            title="Leave Balance"
            desc="Remaining entitlements this year"
            action={(
              <button type="button" className="sd-dash-v2__panel-link" onClick={() => onNavigateTab('leave')}>
                View All →
              </button>
            )}
          >
            <div className="sd-team-portal__leave-panel">
              <LeaveBalancePie leave={leave} />
            </div>
          </Panel>

          <Panel
            title="Attendance Overview"
            desc="Hours worked this week"
            action={(
              <button type="button" className="sd-dash-v2__panel-link" onClick={() => onNavigateTab('attendance')}>
                View All →
              </button>
            )}
          >
            <div className="sd-team-portal__att-row">
              {attendance.week.map((d) => <AttendanceBar key={d.day} day={d} />)}
            </div>
            <div className="sd-team-portal__att-week-stats">
              <div>
                <span>Present</span>
                <strong>{presentDays}/{workDays.length} days</strong>
              </div>
              <div>
                <span>Hours</span>
                <strong>{weekHoursLabel}</strong>
              </div>
              <div>
                <span>Late</span>
                <strong>{lateDays} {lateDays === 1 ? 'day' : 'days'}</strong>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
