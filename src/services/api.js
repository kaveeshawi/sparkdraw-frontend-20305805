import axios from 'axios'

let handling401 = false

function clearAuth() {
  localStorage.removeItem('sparkdraw-token')
  localStorage.removeItem('sparkdraw-auth')
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sparkdraw-token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !handling401) {
      handling401 = true
      clearAuth()
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  login:  (email, password) => api.post('/auth/login', { email, password }),
  logout: ()               => api.post('/auth/logout'),
  me:     ()               => api.get('/auth/me'),
}

export const passwordSetupApi = {
  validate: (token) => api.get('/password-setup/validate', { params: { token } }),
  submit:   (data)   => api.post('/password-setup', data),
}

export const projectsApi = {
  index:       ()         => api.get('/projects'),
  show:        (id)       => api.get(`/projects/${id}`),
  store:       (data)     => api.post('/projects', data),
  update:      (id, data) => api.put(`/projects/${id}`, data),
  destroy:     (id)       => api.delete(`/projects/${id}`),
  timeSummary: ()         => api.get('/projects/time-summary'),
}

export const tasksApi = {
  index:        (projectId)               => api.get(`/projects/${projectId}/tasks`),
  byStatus:     (projectId)               => api.get(`/projects/${projectId}/tasks`, { params: { group_by: 'status' } }),
  store:        (projectId, data)         => api.post(`/projects/${projectId}/tasks`, data),
  update:       (projectId, id, data)     => api.put(`/projects/${projectId}/tasks/${id}`, data),
  updateStatus: (projectId, id, status)   => api.patch(`/projects/${projectId}/tasks/${id}/status`, { status }),
  timeLogs:     (projectId, taskId)       => api.get(`/projects/${projectId}/tasks/${taskId}/time-logs`),
  logTime:      (projectId, taskId, data) => api.post(`/projects/${projectId}/tasks/${taskId}/time-logs`, data),
  mine:         (params)                  => api.get('/tasks', { params }),
}

export const milestonesApi = {
  index: (projectId) => api.get(`/projects/${projectId}/milestones`),
}

export const revisionsApi = {
  index:       (projectId)             => api.get(`/projects/${projectId}/revisions`),
  store:       (projectId, data)       => api.post(`/projects/${projectId}/revisions`, data),
  update:      (projectId, id, data)   => api.put(`/projects/${projectId}/revisions/${id}`, data),
  acceptTicket:(projectId, id)         => api.post(`/projects/${projectId}/revisions/${id}/accept-ticket`),
  withTickets: (limit = 3)             => api.get('/revisions/with-tickets', { params: { limit } }),
  all:         (params)                => api.get('/revisions', { params }),
}

export const approvalsApi = {
  index:   (projectId)         => api.get(`/projects/${projectId}/approvals`),
  store:   (projectId, data)   => api.post(`/projects/${projectId}/approvals`, data),
  approve: (projectId, id)     => api.patch(`/projects/${projectId}/approvals/${id}/approve`),
  reject:  (projectId, id, data) => api.patch(`/projects/${projectId}/approvals/${id}/reject`, data),
}

export const clientsApi = {
  index:        ()         => api.get('/clients'),
  show:         (id)       => api.get(`/clients/${id}`),
  store:        (data)     => api.post('/clients', data),
  update:       (id, data) => api.put(`/clients/${id}`, data),
  uploadAvatar: (id, formData) => api.post(`/clients/${id}/avatar`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  remove:       (id)       => api.delete(`/clients/${id}`),
  resendInvite: (id)       => api.post(`/clients/${id}/resend-invite`),
  count:        ()         => api.get('/clients/count'),
  sentiment:    ()         => api.get('/clients/sentiment'),
}

export const invoicesApi = {
  index:   (params)  => api.get('/invoices', { params }),
  show:    (id)       => api.get(`/invoices/${id}`),
  store:   (data)     => api.post('/invoices', data),
  update:  (id, data) => api.put(`/invoices/${id}`, data),
  send:    (id)       => api.patch(`/invoices/${id}/send`),
  pay:     (id)       => api.post(`/invoices/${id}/pay`),
  payCard: (id, data) => api.post(`/invoices/${id}/pay-card`, data),
  revenue: ()         => api.get('/invoices/revenue'),
  paymentSuccess: (id, token) => api.get(`/invoices/${id}/payment-success`, { params: { token } }),
  paymentCancel:  (id) => api.get(`/invoices/${id}/payment-cancel`),
}

export const healthScoresApi = {
  list:          ()           => api.get('/health-scores'),
  agencyAverage: ()           => api.get('/health-scores/agency-average'),
  show:          (projectId)  => api.get(`/health-scores/${projectId}`),
  compute:       (projectId)  => api.post(`/health-scores/compute/${projectId}`),
  computeAll:    ()           => api.post('/health-scores/compute-all'),
}

export const upsellApi = {
  index:   (params) => api.get('/upsell-suggestions', { params }),
  approve: (id)     => api.patch(`/upsell-suggestions/${id}/approve`),
  reject:  (id)     => api.patch(`/upsell-suggestions/${id}/reject`),
}

export const assetsApi = {
  all:             (params)      => api.get('/assets', { params }),
  index:           (projectId)   => api.get(`/projects/${projectId}/assets`),
  store:           (projectId, formData) => api.post(`/projects/${projectId}/assets`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  markDeliverable: (projectId, id) => api.patch(`/projects/${projectId}/assets/${id}/deliverable`),
  destroy:         (projectId, id) => api.delete(`/projects/${projectId}/assets/${id}`),
}

export const alertsApi = {
  index: (limit = 15) => api.get('/project-events/alerts', { params: { limit } }),
}

export const agencyApi = {
  show:       ()     => api.get('/agency'),
  update:     (data) => api.put('/agency', data),
  uploadLogo: (formData) => api.post('/agency/upload-logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
}

export const teamApi = {
  index:        ()              => api.get('/team'),
  invite:       (data)          => api.post('/team/invite', data),
  resendInvite: (id)            => api.post(`/team/${id}/resend-invite`),
  update:       (id, data)      => api.put(`/team/${id}`, data),
  uploadAvatar: (id, formData)  => api.post(`/team/${id}/avatar`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  remove:       (id)            => api.delete(`/team/${id}`),
}

export const departmentsApi = {
  index:  ()         => api.get('/departments'),
  store:  (data)     => api.post('/departments', data),
  update: (id, data) => api.put(`/departments/${id}`, data),
  remove: (id)       => api.delete(`/departments/${id}`),
}

export const agencyServicesApi = {
  index:  ()         => api.get('/agency-services'),
  store:  (data)     => api.post('/agency-services', data),
  update: (id, data) => api.put(`/agency-services/${id}`, data),
  remove: (id)       => api.delete(`/agency-services/${id}`),
}

export const integrationsApi = {
  index:      ()                    => api.get('/integrations'),
  connect:    (provider, credentials) => api.post(`/integrations/${provider}/connect`, { credentials }),
  disconnect: (provider)            => api.post(`/integrations/${provider}/disconnect`),
}

export const workSessionsApi = {
  current:  () => api.get('/work-sessions/current'),
  clockIn:  () => api.post('/work-sessions/clock-in'),
  clockOut: () => api.post('/work-sessions/clock-out'),
}

export const timeOverviewApi = {
  get: () => api.get('/time-overview'),
}

export const meApi = {
  updateAvailability: (availability) => api.patch('/me/availability', { availability }),
}

export const messagesApi = {
  index: (projectId)       => api.get(`/projects/${projectId}/messages`),
  store: (projectId, data) => api.post(`/projects/${projectId}/messages`, data),
}

export const sentimentApi = {
  project: (projectId) => api.get(`/projects/${projectId}/sentiment`),
}

export const aiApi = {
  analyzeFeedback: (data)      => api.post('/ai/analyze-feedback', data),
  getSentiment:    (data)      => api.post('/ai/sentiment', data),
  getHealthScore:  (projectId) => api.post('/ai/health-score', { project_id: projectId }),
  getUpsell:       (projectId) => api.post('/ai/upsell', { project_id: projectId }),
  estimateHours:   (data)      => api.post('/ai/estimate-hours', data),
  generateBrief:   (data)      => api.post('/ai/brief-generator', data),
  generateDigest:  (projectId) => api.post('/ai/digest', { project_id: projectId }),
}

// Feedback/approvals reuse the existing authenticated project-scoped endpoints (RevisionController /
// ApprovalController) — no need to duplicate that business logic under the /portal prefix.
// Invoicing (listInvoices) isn't built yet (Section 6 B5) — still 404s to mock data in components.
export const portalApi = {
  getBranding:    (slug)                       => api.get(`/portal/${slug}/branding`),
  listProjects:   (slug)                       => api.get(`/portal/${slug}/projects`),
  getProgress:    (slug, projectId)            => api.get(`/portal/${slug}/projects/${projectId}/progress`),
  submitFeedback: (slug, projectId, data)      => api.post(`/projects/${projectId}/revisions`, data),
  listFeedback:   (slug, projectId)            => api.get(`/projects/${projectId}/revisions`),
  listApprovals:  (slug, projectId)            => api.get(`/projects/${projectId}/approvals`),
  approve:        (slug, projectId, approvalId)         => api.patch(`/projects/${projectId}/approvals/${approvalId}/approve`),
  reject:         (slug, projectId, approvalId, reason) => api.patch(`/projects/${projectId}/approvals/${approvalId}/reject`, { reason }),
  listInvoices:   (slug)                       => api.get(`/portal/${slug}/invoices`),
}

export default api
