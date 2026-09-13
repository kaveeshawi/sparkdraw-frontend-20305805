import { useState } from 'react'
import PageWrapper from '../components/layout/PageWrapper'
import useAuthStore from '../store/authStore'
import NewProjectModal from '../components/modals/NewProjectModal'
import DashboardOverviewGrid from '../components/dashboard/v2/DashboardOverviewGrid'
import DashboardSparkAI from '../components/dashboard/v2/DashboardSparkAI'
import DashboardProjectsOverview from '../components/dashboard/v2/DashboardProjectsOverview'
import DashboardActivityFeed from '../components/dashboard/v2/DashboardActivityFeed'
import {
  DashboardHealthWidget,
  DashboardTeamWorkload,
  DashboardMilestonesWidget,
  DashboardRiskAlerts,
} from '../components/dashboard/v2/DashboardBottomWidgets'
import useDashboardData from '../hooks/useDashboardData'
import { canSeeAgencyOverview, userHasPermission } from '@/lib/roles'

function DashboardWelcome({ lean = false }) {
  const { user } = useAuthStore()
  const firstName = user?.name?.split(' ')[0] || 'there'

  return (
    <header className="sd-dash-v2__welcome">
      <h1 className="sd-dash-v2__welcome-title">
        Welcome back, <span>{firstName}</span>
      </h1>
      <p className="sd-dash-v2__welcome-sub">
        {lean
          ? 'Your assigned projects and tasks.'
          : "Here's a smart overview of your agency workspace."}
      </p>
    </header>
  )
}

export default function DashboardPage() {
  const [showNewProject, setShowNewProject] = useState(false)
  const { user } = useAuthStore()
  const showAgencyFeed = canSeeAgencyOverview(user)
  const showFinance = userHasPermission(user, 'financials.view')
  const canCreateProject = user?.role === 'admin' || user?.role === 'pm'
  const dash = useDashboardData({ includeAgencyFeed: showAgencyFeed, includeFinance: showFinance })

  return (
    <PageWrapper onNewProject={canCreateProject ? () => setShowNewProject(true) : undefined}>
      <div className="sd-page sd-dash-v2 sd-animate-in">
        <DashboardWelcome lean={!showAgencyFeed} />

        <DashboardOverviewGrid
          loading={dash.loading}
          summary={dash.summary}
          health={showAgencyFeed ? dash.health : null}
          revenue={dash.revenue}
          timeOverview={dash.timeOverview}
          presence={dash.presence}
          tasksInProgress={dash.tasksInProgress}
          focusItems={dash.focusItems}
          pendingUpsells={dash.pendingUpsells}
          showRevenue={showFinance}
          showPresence={showAgencyFeed}
        />

        {showFinance || showAgencyFeed ? (
          <DashboardSparkAI
            health={dash.health}
            credits={dash.credits}
            presence={dash.presence}
            alerts={dash.alerts}
          />
        ) : null}

        <div className={`sd-dash-v2__main${!showAgencyFeed ? ' sd-dash-v2__main--solo' : ''}`}>
          <DashboardProjectsOverview projects={dash.projects} loading={dash.loading} />
          {showAgencyFeed ? (
            <DashboardActivityFeed items={dash.activityItems} loading={dash.loading} />
          ) : null}
        </div>

        {showAgencyFeed ? (
          <div className="sd-dash-v2__bottom">
            <DashboardHealthWidget health={dash.health} loading={dash.loading} />
            <DashboardTeamWorkload presence={dash.presence} />
            <DashboardMilestonesWidget projects={dash.projects} />
            <DashboardRiskAlerts health={dash.health} />
          </div>
        ) : (
          <div className="sd-dash-v2__bottom">
            <DashboardMilestonesWidget projects={dash.projects} />
          </div>
        )}
      </div>

      {canCreateProject ? (
        <NewProjectModal
          open={showNewProject}
          onClose={() => setShowNewProject(false)}
          onCreated={() => {
            setShowNewProject(false)
            dash.refresh()
          }}
        />
      ) : null}
    </PageWrapper>
  )
}
