import { useEffect, useState } from 'react'
import PageWrapper from '../components/layout/PageWrapper'
import PageHeader from '../components/layout/PageHeader'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import WorkloadHeatmap from '../components/dashboard/WorkloadHeatmap'
import { ClockControl } from '@/components/layout/clock-control'
import { projectsApi } from '../services/api'
import { getInitials } from '@/lib/utils'

const ROLE_BADGE = { admin: 'default', pm: 'info', member: 'success' }
const AVAILABILITY = ['Available', 'Busy', 'Out of office']

function capacityVariant(pct) {
  if (pct > 90) return 'destructive'
  if (pct >= 70) return 'warning'
  return 'success'
}

export default function WorkloadPage() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [availability, setAvailability] = useState({})

  useEffect(() => {
    projectsApi
      .timeSummary()
      .then((res) => setMembers(res.data.data?.members ?? []))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <PageWrapper>
      <div className="sd-page">
        <PageHeader
          title="Time"
          subtitle="Clock in/out and team capacity for this week."
          action={<ClockControl />}
        />

        <div className="sd-card">
          {loading ? (
            <div className="flex flex-col gap-2 p-4">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : members.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">No team members found.</div>
          ) : (
            members.map((m) => {
              const avail = availability[m.user_id] || 'Available'
              const variant = capacityVariant(m.capacity_pct)
              return (
                <div key={m.user_id} className="flex items-center gap-3 border-t border-border px-4 py-3 first:border-t-0">
                  <Avatar className="size-10 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                      {getInitials(m.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{m.name}</span>
                      <Badge variant={ROLE_BADGE[m.role] || 'outline'} className="capitalize">{m.role}</Badge>
                    </div>
                    <p className="mb-1.5 text-xs text-muted-foreground">
                      {m.active_tasks} active tasks · {m.hours_this_week}h this week
                    </p>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={m.capacity_pct}
                        className="h-1.5 flex-1"
                        indicatorColor={
                          variant === 'destructive' ? 'bg-red-500' : variant === 'warning' ? 'bg-orange-500' : 'bg-green-500'
                        }
                      />
                      <span className="w-9 shrink-0 text-right text-xs font-medium tabular-nums">{m.capacity_pct}%</span>
                    </div>
                  </div>
                  <select
                    value={avail}
                    onChange={(e) => setAvailability((s) => ({ ...s, [m.user_id]: e.target.value }))}
                    className="h-8 shrink-0 rounded-lg border border-input bg-background px-2 text-xs"
                  >
                    {AVAILABILITY.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              )
            })
          )}
        </div>

        <div className="sd-card">
          <div className="sd-card-header">
            <div>
              <p className="sd-card-title">Agency heatmap</p>
              <p className="sd-card-desc">Task activity over the last 21 days.</p>
            </div>
          </div>
          <div className="sd-card-body">
            <WorkloadHeatmap />
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
