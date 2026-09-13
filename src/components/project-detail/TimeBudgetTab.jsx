import { useEffect, useState } from 'react'
import { IconClockHour4 } from '@tabler/icons-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { tasksApi, projectsApi } from '../../services/api'
import { useFormatMoney } from '@/hooks/useAgencyCurrency'

export default function TimeBudgetTab({ project, projectId }) {
  const money = useFormatMoney()
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState([])
  const [breakdown, setBreakdown] = useState([])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.allSettled([
      tasksApi.index(projectId),
      projectsApi.timeSummaryFor(projectId),
    ]).then(([taskRes, summaryRes]) => {
      if (cancelled) return
      if (taskRes.status === 'fulfilled') setTasks(taskRes.value.data.data?.tasks || [])
      if (summaryRes.status === 'fulfilled') setBreakdown(summaryRes.value.data.data?.breakdown || [])
    }).finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [projectId])

  const actual = tasks.reduce((sum, t) => sum + (Number(t.actual_hours) || 0), 0)
  const estimated = tasks.reduce((sum, t) => sum + (Number(t.estimated_hours) || 0), 0) || project.estimated_hours || 0
  const burnPct = estimated ? Math.min(999, Math.round((actual / estimated) * 100)) : 0

  if (loading) {
    return <div className="flex flex-col gap-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-40 w-full" /></div>
  }

  return (
    <div className="flex flex-col gap-3 overflow-y-auto pb-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sd-card p-4">
          <p className="text-[10.5px] text-muted-foreground">Budget</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {project.budget != null ? money(project.budget) : '—'}
          </p>
        </div>
        <div className="sd-card p-4">
          <p className="text-[10.5px] text-muted-foreground">Hours logged / estimated</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{actual}h / {estimated || '—'}h</p>
        </div>
        <div className="sd-card p-4">
          <p className="text-[10.5px] text-muted-foreground">Burn ratio</p>
          <p className={`mt-1 text-lg font-semibold tabular-nums ${burnPct > 85 ? 'text-red-500' : ''}`}>{estimated ? `${burnPct}%` : '—'}</p>
        </div>
      </div>

      {estimated > 0 && (
        <div className="sd-card p-4">
          <div className="flex items-center justify-between">
            <p className="sd-card-title flex items-center gap-1.5"><IconClockHour4 size={14} /> Hours burn</p>
            <span className="text-[11px] text-muted-foreground">{actual}h of {estimated}h</span>
          </div>
          <Progress
            value={Math.min(100, burnPct)}
            className="mt-3 h-2"
            indicatorColor={burnPct > 85 ? 'bg-red-500' : burnPct > 60 ? 'bg-amber-500' : 'bg-emerald-500'}
          />
        </div>
      )}

      <div className="sd-card">
        <div className="sd-card-header">
          <p className="sd-card-title">This month by team member</p>
        </div>
        <div className="sd-card-body--flush sd-card-body">
          {breakdown.length === 0 ? (
            <p className="text-[11.5px] text-muted-foreground">No time logged this month.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {breakdown.map((b) => (
                <li key={b.user_id} className="flex items-center justify-between text-[12px]">
                  <span className="text-foreground">{b.user_name}</span>
                  <span className="tabular-nums text-muted-foreground">{b.total_hours}h</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="sd-card">
        <div className="sd-card-header">
          <p className="sd-card-title">Hours by task</p>
        </div>
        <div className="sd-card-body--flush sd-card-body">
          {tasks.length === 0 ? (
            <p className="text-[11.5px] text-muted-foreground">No tasks yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {tasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between text-[12px]">
                  <span className="truncate text-foreground">{t.title}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {t.actual_hours || 0}h / {t.estimated_hours || 0}h
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
