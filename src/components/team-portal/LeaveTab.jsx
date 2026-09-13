import { useMemo, useState } from 'react'
import {
  IconUmbrella, IconPlus, IconCalendarEvent, IconStethoscope, IconMoodSmile,
  IconCheck, IconX,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import { KpiCard, Panel, DataTable, StatusBadge, MetricRow, LeaveBalancePie, LeaveBalanceTrend } from './shared'

const LEAVE_TYPES = [
  {
    key: 'annual',
    label: 'Annual Leave',
    icon: IconCalendarEvent,
    tone: 'orange',
    desc: 'Paid vacation entitlement',
  },
  {
    key: 'casual',
    label: 'Casual Leave',
    icon: IconMoodSmile,
    tone: 'green',
    desc: 'Short personal leave',
  },
  {
    key: 'medical',
    label: 'Medical Leave',
    icon: IconStethoscope,
    tone: 'blue',
    desc: 'Illness / medical care',
  },
]

const REQUEST_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
]

export default function LeaveTab({ data, canManage = false }) {
  const { leave } = data
  const [requests, setRequests] = useState(() =>
    (leave.requests || []).map((r, i) => ({ ...r, id: r.id || `leave-req-${i}` })),
  )
  const [filter, setFilter] = useState('pending')

  const totalAllocated = LEAVE_TYPES.reduce((sum, t) => sum + (leave[t.key]?.total || 0), 0)
  const totalRemaining = LEAVE_TYPES.reduce((sum, t) => {
    const row = leave[t.key] || { used: 0, total: 0 }
    return sum + Math.max(0, row.total - row.used)
  }, 0)

  const filteredRequests = useMemo(() => {
    if (filter === 'all') return requests
    return requests.filter((r) => r.status === filter)
  }, [requests, filter])

  const pendingCount = requests.filter((r) => r.status === 'pending').length

  const updateStatus = (id, status) => {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
    toast.success(status === 'approved' ? 'Leave request approved' : 'Leave request rejected')
  }

  return (
    <div className="sd-dash-v2 sd-team-portal__leave">
      <div className="sd-dash-v2__kpi-grid sd-team-portal__leave-kpi">
        <KpiCard
          icon={IconUmbrella}
          label="Total remaining"
          value={`${totalRemaining} days`}
          sub={`of ${totalAllocated} allocated`}
          subTone=""
          tone="orange"
        />
        {LEAVE_TYPES.map((type) => {
          const row = leave[type.key] || { used: 0, total: 0 }
          const remaining = Math.max(0, row.total - row.used)
          return (
            <KpiCard
              key={type.key}
              icon={type.icon}
              label={type.label}
              value={`${remaining}/${row.total}`}
              sub={`${row.used} used · ${type.desc}`}
              subTone=""
              tone={type.tone}
            />
          )
        })}
      </div>

      <div className="sd-team-portal__leave-top-grid">
        <Panel title="Leave Balance" desc="Remaining by leave type">
          <div className="sd-team-portal__leave-panel">
            <LeaveBalancePie leave={leave} size={168} />
          </div>
        </Panel>

        <Panel
          title="Manage leave requests"
          desc={pendingCount ? `${pendingCount} pending review` : 'Approve, reject, or track leave submissions'}
          action={!canManage ? (
            <button type="button" className="sd-btn-gradient rounded-full px-4 py-2 text-[12px] font-medium text-white border-0">
              <IconPlus size={14} style={{ display: 'inline', marginRight: 4 }} />
              Request Leave
            </button>
          ) : null}
        >
          <div className="sd-team-portal__leave-manage">
            <div className="sd-team-portal__leave-manage-filters">
              {REQUEST_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`sd-team-portal__leave-filter${filter === f.id ? ' is-active' : ''}`}
                  onClick={() => setFilter(f.id)}
                >
                  {f.label}
                  {f.id === 'pending' && pendingCount > 0 ? (
                    <em>{pendingCount}</em>
                  ) : null}
                </button>
              ))}
            </div>

            <DataTable columns={[
              'Leave Type',
              'Start Date',
              'End Date',
              'Days',
              'Reason',
              'Status',
              ...(canManage ? ['Actions'] : []),
            ]}>
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 7 : 6} className="sd-team-portal__leave-manage-empty">
                    No leave requests in this filter.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.type}</strong></td>
                    <td>{r.start}</td>
                    <td>{r.end}</td>
                    <td>{r.days}</td>
                    <td>{r.reason}</td>
                    <td><StatusBadge status={r.status} /></td>
                    {canManage ? (
                      <td>
                        {r.status === 'pending' ? (
                          <div className="sd-team-portal__leave-actions">
                            <button
                              type="button"
                              className="sd-team-portal__leave-action is-approve"
                              onClick={() => updateStatus(r.id, 'approved')}
                            >
                              <IconCheck size={14} stroke={2} />
                              Approve
                            </button>
                            <button
                              type="button"
                              className="sd-team-portal__leave-action is-reject"
                              onClick={() => updateStatus(r.id, 'rejected')}
                            >
                              <IconX size={14} stroke={2} />
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="sd-team-portal__leave-actions-done">—</span>
                        )}
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </DataTable>
          </div>
        </Panel>
      </div>

      <Panel title="Leave entitlements" desc="Standard agency leave allocation for this employee">
        <div className="sd-team-portal__leave-entitlements">
          {LEAVE_TYPES.map((type) => {
            const row = leave[type.key] || { used: 0, total: 0 }
            const remaining = Math.max(0, row.total - row.used)
            return (
              <article key={type.key} className="sd-team-portal__leave-card">
                <div className="sd-team-portal__leave-card-top">
                  <span className={`sd-team-portal__leave-card-icon is-${type.key}`}>
                    <type.icon size={18} stroke={1.75} />
                  </span>
                  <div>
                    <h3>{type.label}</h3>
                    <p>{type.desc}</p>
                  </div>
                </div>
                <div className="sd-team-portal__leave-card-stats">
                  <div>
                    <strong>{row.total}</strong>
                    <span>Allocated</span>
                  </div>
                  <div>
                    <strong>{row.used}</strong>
                    <span>Used</span>
                  </div>
                  <div>
                    <strong className="is-remain">{remaining}</strong>
                    <span>Remaining</span>
                  </div>
                </div>
                <MetricRow
                  label="Usage"
                  value={row.used}
                  total={row.total}
                  tone={
                    type.key === 'annual' ? 'var(--primary)' : type.key === 'casual' ? '#0d9488' : '#2563eb'
                  }
                />
              </article>
            )
          })}
        </div>
      </Panel>

      <Panel title="Leave usage" desc="Balance trend across the year">
        <div className="sd-team-portal__leave-panel sd-team-portal__leave-panel--chart">
          <LeaveBalanceTrend leave={leave} embedded />
        </div>
      </Panel>
    </div>
  )
}
