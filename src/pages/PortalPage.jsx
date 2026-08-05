import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import ClientPortal from '../components/portal/ClientPortal'
import ProgressView from '../components/portal/ProgressView'
import FeedbackHub from '../components/portal/FeedbackHub'
import ApprovalCard from '../components/portal/ApprovalCard'
import { portalApi, invoicesApi } from '../services/api'
import Badge from '../components/legacy-ui/Badge'

// TODO Session 5.x — replace with real API
const MOCK_APPROVALS = [
  {
    id:                1,
    deliverable_name:  'Homepage Design v2',
    description:       'Final homepage design based on feedback from round 2. Includes updated hero section and refined typography.',
    status:            'pending',
    requested_at:      '2026-06-18',
  },
  {
    id:                2,
    deliverable_name:  'Brand Style Guide',
    description:       'Complete style guide covering colors, typography, icons, and usage guidelines.',
    status:            'approved',
    requested_at:      '2026-06-10',
  },
]

function PortalPageHeader({ title, subtitle }) {
  return (
    <div>
      <div className="text-lg font-medium text-foreground">{title}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>
    </div>
  )
}

function InvoiceRow({ invoice, onPay }) {
  const canPay = ['sent', 'overdue'].includes(invoice.status)
  const variant = { paid: 'success', sent: 'info', overdue: 'danger', draft: 'muted' }[invoice.status] || 'muted'

  return (
    <div className="flex items-center justify-between border-b border-border py-3 last:border-0">
      <div>
        <div className="text-xs font-medium text-foreground">
          {invoice.invoice_number || `INV-${invoice.id}`}
        </div>
        <div className="mt-0.5 text-[10px] text-muted-foreground">
          Due {invoice.due_date || '—'}
          {invoice.paid_at && ` · Paid ${new Date(invoice.paid_at).toLocaleDateString('en-GB')}`}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[13px] font-medium text-foreground">
          ${Number(invoice.total ?? invoice.amount).toLocaleString()}
        </span>
        <Badge variant={variant}>{invoice.status}</Badge>
        {canPay && (
          <button
            onClick={() => onPay(invoice.id)}
            className="portal-pay-btn cursor-pointer rounded-lg px-3.5 py-1.5 text-[11px] font-medium"
          >
            Pay now
          </button>
        )}
      </div>
    </div>
  )
}

export default function PortalPage() {
  const navigate = useNavigate()
  const { slug: urlSlug }  = useParams()
  const { user }           = useAuthStore()

  // Public URL slug takes priority; fallback to authenticated user's agency slug
  const slug = urlSlug || user?.agency?.domain_slug || null

  const [activeTab, setActiveTab] = useState('overview')

  // Client's linked project — fetched on mount, first project used as default
  // (TODO Session 5.x: project selector for clients with multiple projects)
  const [projects, setProjects] = useState([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const projectId = projects[0]?.id || null

  useEffect(() => {
    if (!slug) { setProjectsLoading(false); return }
    setProjectsLoading(true)
    portalApi
      .listProjects(slug)
      .then((res) => setProjects(res.data.data || []))
      .catch(() => setProjects([]))
      .finally(() => setProjectsLoading(false))
  }, [slug])

  // Approvals state
  const [approvals, setApprovals] = useState([])
  const [approvalsLoading, setApprovalsLoading] = useState(true)

  // Invoices state
  const [invoices, setInvoices]   = useState([])
  const [invoicesLoading, setInvoicesLoading] = useState(true)

  const fetchApprovals = () => {
    if (!slug || !projectId) { setApprovals(MOCK_APPROVALS); setApprovalsLoading(false); return }
    portalApi
      .listApprovals(slug, projectId)
      .then((res) => setApprovals(res.data.data || []))
      .catch((err) => {
        if (err.response?.status === 404) setApprovals(MOCK_APPROVALS)
      })
      .finally(() => setApprovalsLoading(false))
  }

  const fetchInvoices = () => {
    if (!slug) { setInvoices([]); setInvoicesLoading(false); return }
    setInvoicesLoading(true)
    portalApi
      .listInvoices(slug)
      .then((res) => setInvoices(res.data.data || []))
      .catch(() => setInvoices([]))
      .finally(() => setInvoicesLoading(false))
  }

  const handlePayInvoice = (invoiceId) => {
    navigate(`/invoices/${invoiceId}/pay`)
  }

  useEffect(() => {
    fetchApprovals()
    fetchInvoices()
  }, [slug, projectId])

  return (
    <ClientPortal slug={slug} activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'overview' && (
        <ProgressView slug={slug} projectId={projectId} />
      )}

      {activeTab === 'feedback' && (
        <FeedbackHub slug={slug} projectId={projectId} />
      )}

      {activeTab === 'approvals' && (
        <div className="flex flex-col gap-6">
          <PortalPageHeader
            title="Approvals"
            subtitle="Review and approve deliverables from your project team."
          />

          {approvalsLoading ? (
            <div className="text-xs text-muted-foreground">Loading…</div>
          ) : approvals.length === 0 ? (
            <div className="sd-glass p-10 text-center text-xs text-muted-foreground">
              No pending approvals.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {approvals.map((approval) => (
                <ApprovalCard
                  key={approval.id}
                  approval={approval}
                  slug={slug}
                  projectId={projectId}
                  onUpdated={fetchApprovals}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="flex flex-col gap-6">
          <PortalPageHeader
            title="Invoices"
            subtitle="View and pay your project invoices. Sandbox card checkout — test mode only."
          />

          <div className="sd-glass p-5 px-6">
            {invoicesLoading ? (
              <div className="text-xs text-muted-foreground">Loading…</div>
            ) : invoices.length === 0 ? (
              <div className="py-3 text-xs text-muted-foreground">
                No invoices yet.
              </div>
            ) : (
              invoices.map((inv) => (
                <InvoiceRow key={inv.id} invoice={inv} onPay={handlePayInvoice} />
              ))
            )}
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
            Payments use sandbox card checkout — no real money is charged.
          </div>
        </div>
      )}
    </ClientPortal>
  )
}
