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
  timeSummaryFor: (id)    => api.get(`/projects/${id}/time-summary`),
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
  productivity: (params)                  => api.get('/tasks/productivity', { params }),
}

export const calendarApi = {
  index:   (params) => api.get('/calendar/events', { params }),
  store:   (data)   => api.post('/calendar/events', data),
  update:  (id, data) => api.put(`/calendar/events/${id}`, data),
  destroy: (id)     => api.delete(`/calendar/events/${id}`),
}

export const milestonesApi = {
  index:    (projectId)           => api.get(`/projects/${projectId}/milestones`),
  complete: (projectId, id)       => api.patch(`/projects/${projectId}/milestones/${id}/complete`),
}

export const risksApi = {
  index: (projectId) => api.get(`/projects/${projectId}/risks`),
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
  payWise: (id)       => api.post(`/invoices/${id}/pay-wise`),
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
  send:    (id)     => api.patch(`/upsell-suggestions/${id}/send`),
  undo:    (id)     => api.patch(`/upsell-suggestions/${id}/undo`),
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

/** Agency Drive — Assets → Project files (server disk storage) */
export const driveApi = {
  index:          () => api.get('/drive'),
  createFolder:   (data) => api.post('/drive/folders', data),
  updateFolder:   (id, data) => api.put(`/drive/folders/${id}`, data),
  trashFolder:    (id) => api.post(`/drive/folders/${id}/trash`),
  restoreFolder:  (id) => api.post(`/drive/folders/${id}/restore`),
  destroyFolder:  (id) => api.delete(`/drive/folders/${id}`),
  uploadFile:     (formData) => api.post('/drive/files', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  downloadFile:   (id) => api.get(`/drive/files/${id}/download`, { responseType: 'blob' }),
  renameFile:     (id, original_name) => api.put(`/drive/files/${id}`, { original_name }),
  copyFile:       (id) => api.post(`/drive/files/${id}/copy`),
  replaceContent: (id, formData) => api.put(`/drive/files/${id}/content`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  destroyFile:    (id) => api.delete(`/drive/files/${id}`),
  restoreFile:    (id) => api.post(`/drive/files/${id}/restore`),
  forceDestroyFile: (id) => api.delete(`/drive/files/${id}/force`),
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
  index:         ()              => api.get('/team'),
  show:          (id)            => api.get(`/team/${id}`),
  invite:        (data)          => api.post('/team/invite', data),
  resendInvite:  (id, data)      => api.post(`/team/${id}/resend-invite`, data || {}),
  revokeAccess:  (id)            => api.post(`/team/${id}/revoke-access`),
  restoreAccess: (id)            => api.post(`/team/${id}/restore-access`),
  update:        (id, data)      => api.put(`/team/${id}`, data),
  updateAvailability: (id, availability) => api.patch(`/team/${id}/availability`, { availability }),
  uploadAvatar:  (id, formData)  => api.post(`/team/${id}/avatar`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  remove:        (id)            => api.delete(`/team/${id}`),
}

export const rolesApi = {
  index:  ()         => api.get('/roles'),
  store:  (data)     => api.post('/roles', data),
  update: (id, data) => api.put(`/roles/${id}`, data),
  remove: (id)       => api.delete(`/roles/${id}`),
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
  oauthStart: (provider)            => api.get(`/integrations/${provider}/oauth/start`),
  oauthDemo:  (provider, state)     => api.post(`/integrations/${provider}/oauth/demo`, { state }),
}

export const meetingsApi = {
  create: (data) => api.post('/meetings', data),
}

export const workSessionsApi = {
  current:  () => api.get('/work-sessions/current'),
  clockIn:  () => api.post('/work-sessions/clock-in'),
  clockOut: () => api.post('/work-sessions/clock-out'),
}

export const timeOverviewApi = {
  get: () => api.get('/time-overview'),
  teamPresence: () => api.get('/time/team-presence'),
}

export const meApi = {
  updateAvailability: (availability) => api.patch('/me/availability', { availability }),
}

export const messagesApi = {
  index: (projectId, params = {}) => api.get(`/projects/${projectId}/messages`, { params }),
  store: (projectId, data) => api.post(`/projects/${projectId}/messages`, data),
  markRead: (projectId, data = {}) => api.post(`/projects/${projectId}/messages/read`, data),
  unread: () => api.get('/messages/unread'),
}

export const sentimentApi = {
  project: (projectId) => api.get(`/projects/${projectId}/sentiment`),
}

export const aiApi = {
  credits:         ()              => api.get('/ai/credits'),
  analyzeFeedback: (data)      => api.post('/ai/analyze-feedback', data),
  getSentiment:    (data)      => api.post('/ai/sentiment', data),
  getHealthScore:  (projectId) => api.post('/ai/health-score', { project_id: projectId }),
  getUpsell:       (projectId, opts = {}) => api.post('/ai/upsell', {
    project_id: projectId,
    ...(opts.force != null ? { force: opts.force } : {}),
  }),
  estimateHours:   (data)      => api.post('/ai/estimate-hours', data),
  generateBrief:   (data)      => api.post('/ai/brief-generator', data),
  generateDigest:  (projectId) => api.post('/ai/digest', { project_id: projectId }),
  invoiceReminder: (invoiceId) => api.post('/ai/invoice-reminder', { invoice_id: invoiceId }),
}

// Feedback/approvals reuse the existing authenticated project-scoped endpoints (RevisionController /
// ApprovalController) — no need to duplicate that business logic under the /portal prefix.
export const portalApi = {
  getBranding:    (slug)                       => api.get(`/portal/${slug}/branding`),
  listProjects:   (slug)                       => api.get(`/portal/${slug}/projects`),
  getProgress:    (slug, projectId)            => api.get(`/portal/${slug}/projects/${projectId}/progress`),
  listTeam:       (slug, projectId)            => api.get(`/portal/${slug}/projects/${projectId}/team`),
  listUpsells:    (slug, projectId)            => api.get(`/portal/${slug}/projects/${projectId}/upsells`),
  acceptUpsell:   (slug, projectId, upsellId)  => api.patch(`/portal/${slug}/projects/${projectId}/upsells/${upsellId}/accept`),
  declineUpsell:  (slug, projectId, upsellId)  => api.patch(`/portal/${slug}/projects/${projectId}/upsells/${upsellId}/decline`),
  submitFeedback: (slug, projectId, data)      => api.post(`/projects/${projectId}/revisions`, data),
  listFeedback:   (slug, projectId)            => api.get(`/projects/${projectId}/revisions`),
  listApprovals:  (slug, projectId)            => api.get(`/projects/${projectId}/approvals`),
  approve:        (slug, projectId, approvalId)         => api.patch(`/projects/${projectId}/approvals/${approvalId}/approve`),
  reject:         (slug, projectId, approvalId, reason) => api.patch(`/projects/${projectId}/approvals/${approvalId}/reject`, { reason }),
  listInvoices:   (slug)                       => api.get(`/portal/${slug}/invoices`),
  listAssets:     (slug)                       => api.get(`/portal/${slug}/assets`),
  uploadAsset:    (slug, file)                 => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/portal/${slug}/assets`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  downloadAsset:  (slug, fileId)               => api.get(`/portal/${slug}/assets/files/${fileId}/download`, {
    responseType: 'blob',
  }),
  deleteAsset:    (slug, fileId)               => api.delete(`/portal/${slug}/assets/files/${fileId}`),
}

export default api
