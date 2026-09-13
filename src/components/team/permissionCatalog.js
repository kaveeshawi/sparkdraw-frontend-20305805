// Mirrors App\Support\Permissions on the backend — keep the keys in sync.
export const PERMISSION_COLUMNS = [
  {
    key: 'projects.manage',
    label: 'Relevant projects',
    description: 'Assigned projects, tasks, and AI tools for that work only',
  },
  {
    key: 'projects.view_all',
    label: 'All projects',
    description: 'See every agency project — not only assigned ones',
  },
  {
    key: 'clients.manage',
    label: 'Relevant clients',
    description: 'Clients linked to this role’s assigned projects',
  },
  {
    key: 'clients.view_all',
    label: 'All clients',
    description: 'See every agency client — not only relevant ones',
  },
  {
    key: 'clients.contact_details',
    label: 'Contact details',
    description: 'Email, phone and address on client records',
  },
  {
    key: 'financials.view',
    label: 'Financials',
    description: 'Budget figures, invoices, and revenue',
  },
  {
    key: 'team.manage',
    label: 'Team',
    description: 'Team roster, inbox team chat, departments, agency settings and integrations',
  },
  {
    key: 'workspace.agency_overview',
    label: 'Agency overview',
    description: 'Team presence, activity feed, and agency-wide dashboard widgets',
  },
]

export const DEFAULT_PERMISSIONS = {
  pm: {
    'projects.manage': true,
    'projects.view_all': true,
    'clients.manage': true,
    'clients.view_all': true,
    'clients.contact_details': true,
    'financials.view': false,
    'team.manage': true,
    'workspace.agency_overview': true,
  },
  member: {
    'projects.manage': true,
    'projects.view_all': false,
    'clients.manage': false,
    'clients.view_all': false,
    'clients.contact_details': false,
    'financials.view': false,
    'team.manage': true,
    'workspace.agency_overview': false,
  },
}
