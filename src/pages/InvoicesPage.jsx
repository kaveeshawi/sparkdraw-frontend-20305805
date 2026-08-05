import { useCallback, useEffect, useState } from 'react'
import { IconPlus } from '@tabler/icons-react'
import PageWrapper from '../components/layout/PageWrapper'
import PageHeader from '../components/layout/PageHeader'
import { invoicesApi } from '../services/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import NewInvoiceModal from '../components/modals/NewInvoiceModal'
import InvoiceDetailModal from '../components/modals/InvoiceDetailModal'
import useAuthStore from '../store/authStore'

const STATUS_VARIANTS = {
  draft: 'outline', sent: 'info', paid: 'success', overdue: 'destructive',
}

const FILTERS = ['all', 'draft', 'sent', 'paid', 'overdue']

export default function InvoicesPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const [invoices, setInvoices] = useState([])
  const [revenue, setRevenue] = useState(null)
  const [filter, setFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [detailId, setDetailId] = useState(null)
  const [sendingId, setSendingId] = useState(null)

  const fetchData = useCallback(() => {
    setIsLoading(true)
    const params = filter !== 'all' ? { status: filter } : {}
    Promise.all([
      invoicesApi.index(params),
      isAdmin ? invoicesApi.revenue() : Promise.resolve({ data: { data: null } }),
    ])
      .then(([invRes, revRes]) => {
        setInvoices(invRes.data.data || [])
        setRevenue(revRes.data.data)
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [filter, isAdmin])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSend = async (id) => {
    setSendingId(id)
    try {
      await invoicesApi.send(id)
      fetchData()
    } finally {
      setSendingId(null)
    }
  }

  return (
    <PageWrapper>
      <div className="sd-page">
        <PageHeader
          title="Invoices"
          subtitle={`${invoices.length} invoice${invoices.length !== 1 ? 's' : ''}`}
          action={
            <Button size="sm" onClick={() => setShowNew(true)}>
              <IconPlus size={15} />
              New invoice
            </Button>
          }
        />

        {isAdmin && revenue && (
          <div className="sd-card flex flex-wrap items-center gap-8 p-4">
            <div>
              <p className="text-xs text-muted-foreground">This month</p>
              <p className="text-xl font-semibold tabular-nums">${Number(revenue.this_month).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last month</p>
              <p className="text-sm tabular-nums">${Number(revenue.last_month).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Change</p>
              <p className={`text-sm font-medium tabular-nums ${revenue.change_pct >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {revenue.change_pct >= 0 ? '+' : ''}{revenue.change_pct}%
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Paid this month</p>
              <p className="text-sm tabular-nums">{revenue.paid_count}</p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${
                filter === f
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:bg-accent'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="sd-card overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col gap-2 p-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">No invoices found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Invoice #', 'Client', 'Project', 'Amount', 'Status', 'Due', 'Actions'].map((h) => (
                      <th key={h} className="px-3.5 py-2.5 text-left text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-border last:border-b-0">
                      <td className="px-3.5 py-2.5 font-medium">{inv.invoice_number || `#${inv.id}`}</td>
                      <td className="px-3.5 py-2.5 text-muted-foreground">{inv.client_name || '—'}</td>
                      <td className="px-3.5 py-2.5 text-muted-foreground">{inv.project_name || '—'}</td>
                      <td className="px-3.5 py-2.5 font-medium tabular-nums">${Number(inv.total ?? inv.amount).toLocaleString()}</td>
                      <td className="px-3.5 py-2.5"><Badge variant={STATUS_VARIANTS[inv.status] || 'outline'} className="capitalize">{inv.status}</Badge></td>
                      <td className="px-3.5 py-2.5 text-xs text-muted-foreground">{inv.due_date || '—'}</td>
                      <td className="px-3.5 py-2.5">
                        <div className="flex gap-1.5">
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setDetailId(inv.id)}>View</Button>
                          {inv.status === 'draft' && (
                            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" disabled={sendingId === inv.id} onClick={() => handleSend(inv.id)}>
                              {sendingId === inv.id ? '…' : 'Send'}
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled title="PDF export coming soon">PDF</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <NewInvoiceModal open={showNew} onClose={() => setShowNew(false)} onCreated={fetchData} />
      <InvoiceDetailModal open={!!detailId} invoiceId={detailId} onClose={() => setDetailId(null)} onUpdated={fetchData} />
    </PageWrapper>
  )
}
