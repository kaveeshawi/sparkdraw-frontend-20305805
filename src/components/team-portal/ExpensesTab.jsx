import { IconReceipt, IconClockHour4, IconCircleCheck, IconPlus } from '@tabler/icons-react'
import { KpiCard, Panel, DataTable, StatusBadge } from './shared'
import { useFormatMoney } from '@/hooks/useAgencyCurrency'

export default function ExpensesTab({ data }) {
  const money = useFormatMoney()
  const { expenses } = data

  return (
    <div className="sd-dash-v2" style={{ gap: '1rem' }}>
      <div className="sd-dash-v2__kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(11rem, 1fr))' }}>
        <KpiCard icon={IconReceipt} label="Total Expenses" value={money(expenses.total)} sub="This month" subTone="" tone="blue" />
        <KpiCard icon={IconClockHour4} label="Pending" value={money(expenses.pending)} sub="Awaiting approval" subTone="" tone="amber" />
        <KpiCard icon={IconCircleCheck} label="Approved" value={money(expenses.approved)} sub="Reimbursed" subTone="" tone="green" />
      </div>

      <Panel
        title="Expense Claims"
        desc="Submitted work expenses"
        action={
          <button type="button" className="sd-btn-gradient rounded-full px-4 py-2 text-[12px] font-medium text-white border-0">
            <IconPlus size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />Submit Expense
          </button>
        }
      >
        <DataTable columns={['Date', 'Category', 'Description', 'Amount', 'Status']}>
          {expenses.items.map((e, i) => (
            <tr key={i}>
              <td><strong>{e.date}</strong></td>
              <td>{e.category}</td>
              <td>{e.description}</td>
              <td>{money(e.amount)}</td>
              <td><StatusBadge status={e.status} /></td>
            </tr>
          ))}
        </DataTable>
      </Panel>
    </div>
  )
}
