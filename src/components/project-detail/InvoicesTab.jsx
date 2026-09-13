import { useEffect, useState } from 'react'
import { IconReceipt } from '@tabler/icons-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { invoicesApi } from '../../services/api'
import { formatDate } from './shared'
import { useFormatMoney } from '@/hooks/useAgencyCurrency'

const STATUS_VARIANT = { paid: 'success', sent: 'info', overdue: 'destructive', draft: 'outline' }

export default function InvoicesTab({ projectId }) {
  const money = useFormatMoney()
  const [loading, setLoading] = useState(true)
  const [invoices, setInvoices] = useState([])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    invoicesApi.index()
      .then((res) => {
        if (cancelled) return
        const all = res.data.data?.invoices ?? res.data.data ?? []
        setInvoices(all.filter((inv) => String(inv.project?.id) === String(projectId)))
      })
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [projectId])

  if (loading) {
    return <div className="flex flex-col gap-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
  }

  if (invoices.length === 0) {
    return (
      <div className="sd-card flex flex-col items-center gap-2 p-10 text-center">
        <IconReceipt size={22} className="text-muted-foreground" />
        <p className="text-[13px] font-medium">No invoices for this project</p>
        <p className="text-[11.5px] text-muted-foreground">Invoices raised for this project will appear here.</p>
      </div>
    )
  }

  return (
    <div className="sd-card overflow-y-auto">
      <div className="sd-card-body--flush sd-card-body">
        <ul className="flex flex-col gap-2.5">
          {invoices.map((inv) => (
            <li key={inv.id} className="flex items-center justify-between border-t border-border pt-2.5 text-[12px] first:border-t-0 first:pt-0">
              <div>
                <p className="font-medium text-foreground">Invoice #{inv.id}</p>
                <p className="text-[10.5px] text-muted-foreground">Due {formatDate(inv.due_date)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="tabular-nums text-foreground">
                  {inv.amount != null ? money(inv.amount, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                </span>
                <Badge variant={STATUS_VARIANT[inv.status] || 'outline'} className="capitalize text-[9px]">{inv.status}</Badge>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
