import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import useAuthStore from './store/authStore'

import LoginPage      from './pages/LoginPage'
import SetPasswordPage from './pages/SetPasswordPage'
import DashboardPage  from './pages/DashboardPage'
import ProjectsPage   from './pages/ProjectsPage'
import KanbanPage     from './pages/KanbanPage'
import ClientsPage    from './pages/ClientsPage'
import InvoicesPage   from './pages/InvoicesPage'
import InvoicePaymentSuccessPage from './pages/InvoicePaymentSuccessPage'
import InvoicePaymentPage from './pages/InvoicePaymentPage'
import InboxPage      from './pages/InboxPage'
import AIStudioPage   from './pages/AIStudioPage'
import HealthScoresPage from './pages/HealthScoresPage'
import PortalPage     from './pages/PortalPage'
import WorkloadPage   from './pages/WorkloadPage'
import MembersPage    from './pages/MembersPage'
import IntegrationsPage from './pages/IntegrationsPage'
import TasksPage      from './pages/TasksPage'
import CalendarPage   from './pages/CalendarPage'
import RevisionsPage  from './pages/RevisionsPage'
import AssetsPage     from './pages/AssetsPage'
import FeedbackTranslatorPage from './pages/FeedbackTranslatorPage'
import UpsellPage     from './pages/UpsellPage'
import SettingsPage   from './pages/SettingsPage'
import UnderConstructionPage from './pages/UnderConstructionPage'

function ProtectedRoute({ allowedRoles }) {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) return <Navigate to="/login" replace />

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'client' ? '/portal' : '/'} replace />
  }

  return <Outlet />
}

function GuestRoute() {
  const { isAuthenticated, user } = useAuthStore()
  if (isAuthenticated) {
    return <Navigate to={user?.role === 'client' ? '/portal' : '/'} replace />
  }
  return <Outlet />
}

export default function App() {
  const { loadUser } = useAuthStore()

  useEffect(() => {
    loadUser()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/set-password" element={<SetPasswordPage />} />
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        {/* Agency — all internal roles */}
        <Route element={<ProtectedRoute allowedRoles={['admin', 'pm', 'member']} />}>
          <Route path="/"                element={<DashboardPage />} />
          <Route path="/projects"        element={<ProjectsPage />} />
          <Route path="/projects/:id/kanban" element={<KanbanPage />} />
          <Route path="/clients"         element={<ClientsPage />} />
          <Route path="/tasks"           element={<TasksPage />} />
          <Route path="/calendar"        element={<CalendarPage />} />
          <Route path="/workload"        element={<WorkloadPage />} />
          <Route path="/assets"          element={<AssetsPage />} />
          <Route path="/settings"        element={<SettingsPage />} />
          <Route path="/analytics"       element={<UnderConstructionPage title="Analytics" description="Deeper agency-wide analytics and trend reporting." />} />
        </Route>

        {/* Agency — admin + PM only */}
        <Route element={<ProtectedRoute allowedRoles={['admin', 'pm']} />}>
          <Route path="/inbox"           element={<InboxPage />} />
          <Route path="/revisions"       element={<RevisionsPage />} />
          <Route path="/ai-studio"       element={<AIStudioPage />} />
          <Route path="/health-scores"   element={<HealthScoresPage />} />
          <Route path="/feedback-translator" element={<FeedbackTranslatorPage />} />
          <Route path="/upsell-engine"   element={<UpsellPage />} />
        </Route>

        {/* Agency — admin only */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/invoices"        element={<InvoicesPage />} />
          <Route path="/invoices/:id/pay" element={<InvoicePaymentPage />} />
          <Route path="/invoices/:id/success" element={<InvoicePaymentSuccessPage />} />
          <Route path="/invoices/:id/cancel" element={<InvoicePaymentSuccessPage />} />
          <Route path="/reports"         element={<UnderConstructionPage title="Reports" description="Exportable financial and project reports." />} />
          <Route path="/team"            element={<MembersPage />} />
          <Route path="/integrations"    element={<IntegrationsPage />} />
        </Route>

        {/* Client portal — authenticated client */}
        <Route element={<ProtectedRoute allowedRoles={['client']} />}>
          <Route path="/portal" element={<PortalPage />} />
          <Route path="/invoices/:id/pay" element={<InvoicePaymentPage />} />
          <Route path="/invoices/:id/success" element={<InvoicePaymentSuccessPage />} />
        </Route>

        {/* Public portal by slug */}
        <Route path="/portal/:slug" element={<PortalPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
