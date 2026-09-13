import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { IconCheckbox, IconReceipt } from '@tabler/icons-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import useAuthStore from '../store/authStore'
import ClientPortal from '../components/portal/ClientPortal'
import ProgressView from '../components/portal/ProgressView'
import PortalChat from '../components/portal/PortalChat'
import FeedbackHub from '../components/portal/FeedbackHub'
import ApprovalCard from '../components/portal/ApprovalCard'
import PortalAssets from '../components/portal/PortalAssets'
import { portalApi } from '../services/api'
import { useFormatMoney } from '@/hooks/useAgencyCurrency'

const STATUS_VARIANT = {
  paid: 'success',
  sent: 'default',
  overdue: 'destructive',
  draft: 'outline',
}

const TAB_META = {
  overview: {
    title: 'Overview',
    subtitle: 'Track milestone progress on your active project.',
  },
  chat: {
    title: 'Chat',
    subtitle: 'Talk with everyone on the project, or open a private thread with one team member.',
  },
  feedback: {
    title: 'Feedback',
    subtitle: 'Share free-text feedback — your agency turns it into clear action items.',
  },
  approvals: {
    title: 'Approvals',
    subtitle: 'Review deliverables and approve or request changes with a clear record.',
  },
  assets: {
    title: 'Assets',
    subtitle: 'Upload and download files in your company folder.',
  },
  invoices: {
    title: 'Invoices',
    subtitle: 'View and pay project invoices. Sandbox checkout only — no real charges.',
  },
}

function InvoiceRow({ invoice, onPay }) {
  const money = useFormatMoney()
  const canPay = ['sent', 'overdue'].includes(invoice.status)
  const due = invoice.due_date
    ? new Date(invoice.due_date).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—'

  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {invoice.invoice_number || `INV-${invoice.id}`}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Due {due}
          {invoice.project?.name ? ` · ${invoice.project.name}` : ''}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-sm font-semibold">
          {money(invoice.total ?? invoice.amount)}
        </span>
        <Badge variant={STATUS_VARIANT[invoice.status] || 'outline'} className="capitalize">
          {invoice.status}
        </Badge>
        {canPay ? (
          <Button type="button" size="sm" onClick={() => onPay(invoice.id)}>
            Pay now
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export default function PortalPage() {
  const navigate = useNavigate()
  const { slug: urlSlug } = useParams()
  const { user } = useAuthStore()

  const slug = urlSlug || user?.agency?.domain_slug || null

  const [activeTab, setActiveTab] = useState('overview')
  const [projects, setProjects] = useState([])
  const [projectId, setProjectId] = useState(null)
  const [projectsLoading, setProjectsLoading] = useState(true)

  const [approvals, setApprovals] = useState([])
  const [approvalsLoading, setApprovalsLoading] = useState(false)
  const [invoices, setInvoices] = useState([])
  const [invoicesLoading, setInvoicesLoading] = useState(false)

  useEffect(() => {
    if (!slug) {
      setProjects([])
      setProjectId(null)
      setProjectsLoading(false)
      return
    }
    setProjectsLoading(true)
    portalApi
      .listProjects(slug)
      .then((res) => {
        const list = res.data.data || []
        setProjects(list)
        setProjectId((prev) => {
          if (prev && list.some((p) => p.id === prev)) return prev
          return list[0]?.id || null
        })
      })
      .catch(() => {
        setProjects([])
        setProjectId(null)
      })
      .finally(() => setProjectsLoading(false))
  }, [slug])

  const fetchApprovals = () => {
    if (!slug || !projectId) {
      setApprovals([])
      setApprovalsLoading(false)
      return
    }
    setApprovalsLoading(true)
    portalApi
      .listApprovals(slug, projectId)
      .then((res) => setApprovals(res.data.data || []))
      .catch(() => setApprovals([]))
      .finally(() => setApprovalsLoading(false))
  }

  const fetchInvoices = () => {
    if (!slug) {
      setInvoices([])
      setInvoicesLoading(false)
      return
    }
    setInvoicesLoading(true)
    portalApi
      .listInvoices(slug)
      .then((res) => setInvoices(res.data.data || []))
      .catch(() => setInvoices([]))
      .finally(() => setInvoicesLoading(false))
  }

  useEffect(() => {
    if (activeTab === 'approvals') fetchApprovals()
  }, [slug, projectId, activeTab])

  useEffect(() => {
    if (activeTab === 'invoices') fetchInvoices()
  }, [slug, activeTab])

  const meta = TAB_META[activeTab] || TAB_META.overview

  return (
    <ClientPortal
      slug={slug}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      projects={projects}
      projectId={projectId}
      onProjectChange={setProjectId}
      projectsLoading={projectsLoading}
      pageTitle={meta.title}
      pageSubtitle={meta.subtitle}
    >
      {activeTab === 'overview' ? (
        <ProgressView slug={slug} projectId={projectId} />
      ) : null}

      {activeTab === 'chat' ? (
        <PortalChat slug={slug} projectId={projectId} />
      ) : null}

      {activeTab === 'feedback' ? (
        <FeedbackHub slug={slug} projectId={projectId} />
      ) : null}

      {activeTab === 'approvals' ? (
        <div className="sd-page sd-page--team">
          {!projectId ? (
            <div className="sd-card p-8 text-center">
              <IconCheckbox size={22} stroke={1.5} className="mx-auto text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">No project selected</p>
            </div>
          ) : approvalsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-28 w-full rounded-2xl" />
              <Skeleton className="h-28 w-full rounded-2xl" />
            </div>
          ) : approvals.length === 0 ? (
            <div className="sd-card p-8 text-center">
              <IconCheckbox size={22} stroke={1.5} className="mx-auto text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">No approvals waiting</p>
              <p className="mt-1 text-xs text-muted-foreground">
                When the team sends a deliverable for review, it will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
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
      ) : null}

      {activeTab === 'assets' ? (
        <PortalAssets slug={slug} />
      ) : null}

      {activeTab === 'invoices' ? (
        <div className="sd-page sd-page--team">
          <section className="sd-card p-5">
            {invoicesLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : invoices.length === 0 ? (
              <div className="py-6 text-center">
                <IconReceipt size={22} stroke={1.5} className="mx-auto text-muted-foreground" />
                <p className="mt-2 text-sm font-medium">No invoices yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Sent invoices from your agency will show up here.
                </p>
              </div>
            ) : (
              invoices.map((inv) => (
                <InvoiceRow
                  key={inv.id}
                  invoice={inv}
                  onPay={(id) => navigate(`/invoices/${id}/pay`)}
                />
              ))
            )}
          </section>
          <p className="mt-3 text-xs text-muted-foreground">
            Payments use sandbox card checkout — no real money is charged.
          </p>
        </div>
      ) : null}
    </ClientPortal>
  )
}
