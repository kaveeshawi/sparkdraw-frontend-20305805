import { useState } from 'react'
import PageWrapper from '../components/layout/PageWrapper'
import useAuthStore from '../store/authStore'
import NewProjectModal from '../components/modals/NewProjectModal'
import DashboardKpiStrip from '../components/dashboard/v2/DashboardKpiStrip'
import DashboardFocusToday from '../components/dashboard/v2/DashboardFocusToday'
import DashboardSparkAI from '../components/dashboard/v2/DashboardSparkAI'
import DashboardProjectsOverview from '../components/dashboard/v2/DashboardProjectsOverview'
import DashboardActivityFeed from '../components/dashboard/v2/DashboardActivityFeed'
import {
  DashboardHealthWidget,
  DashboardTeamWorkload,
  DashboardMilestonesWidget,
  DashboardRiskAlerts,
} from '../components/dashboard/v2/DashboardBottomWidgets'

function DashboardWelcome() {
  const { user } = useAuthStore()
  const firstName = user?.name?.split(' ')[0] || 'there'

  return (
    <header className="sd-dash-v2__welcome">
      <h1 className="sd-dash-v2__welcome-title">
        Welcome back, <span>{firstName}</span>
      </h1>
      <p className="sd-dash-v2__welcome-sub">
        Here&apos;s a smart overview of your agency workspace.
      </p>
    </header>
  )
}

export default function DashboardPage() {
  const [showNewProject, setShowNewProject] = useState(false)

  return (
    <PageWrapper onNewProject={() => setShowNewProject(true)}>
      <div className="sd-page sd-dash-v2 sd-animate-in">
        <DashboardWelcome />

        <div className="sd-dash-v2__top">
          <DashboardKpiStrip />
          <DashboardFocusToday />
        </div>

        <DashboardSparkAI />

        <div className="sd-dash-v2__main">
          <DashboardProjectsOverview />
          <DashboardActivityFeed />
        </div>

        <div className="sd-dash-v2__bottom">
          <DashboardHealthWidget />
          <DashboardTeamWorkload />
          <DashboardMilestonesWidget />
          <DashboardRiskAlerts />
        </div>
      </div>

      <NewProjectModal
        open={showNewProject}
        onClose={() => setShowNewProject(false)}
        onCreated={() => setShowNewProject(false)}
      />
    </PageWrapper>
  )
}
