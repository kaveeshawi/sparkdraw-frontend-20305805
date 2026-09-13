import { useState } from 'react'
import { IconFlag, IconCircleCheck } from '@tabler/icons-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { milestonesApi } from '../../services/api'
import { formatDate } from './shared'

export default function MilestonesTab({ project, projectId, onChanged }) {
  const [completingId, setCompletingId] = useState(null)
  const milestones = project.milestones || []

  const handleComplete = async (id) => {
    setCompletingId(id)
    try {
      await milestonesApi.complete(projectId, id)
      onChanged?.()
    } finally {
      setCompletingId(null)
    }
  }

  if (milestones.length === 0) {
    return (
      <div className="sd-card flex flex-col items-center gap-2 p-10 text-center">
        <IconFlag size={22} className="text-muted-foreground" />
        <p className="text-[13px] font-medium">No milestones yet</p>
        <p className="text-[11.5px] text-muted-foreground">Milestones will appear here once created for this project.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2.5 overflow-y-auto pb-4">
      {milestones.map((m) => {
        const isDone = ['completed', 'done'].includes(m.status)
        const overdue = !isDone && m.days_remaining != null && m.days_remaining < 0
        return (
          <div key={m.id} className="sd-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-medium text-foreground">{m.title}</p>
                  <Badge variant={isDone ? 'success' : overdue ? 'destructive' : 'outline'} className="capitalize text-[9px]">
                    {m.status?.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Due {formatDate(m.due_date)}
                  {m.days_remaining != null && !isDone && (
                    <span className={overdue ? 'text-red-500' : ''}> · {overdue ? `${Math.abs(m.days_remaining)}d overdue` : `${m.days_remaining}d left`}</span>
                  )}
                  {' '}· {m.task_count} task{m.task_count === 1 ? '' : 's'}
                </p>
              </div>

              {!isDone && (
                <button
                  onClick={() => handleComplete(m.id)}
                  disabled={completingId === m.id}
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] text-muted-foreground transition-all hover:border-primary/40 hover:text-primary cursor-pointer disabled:opacity-50"
                >
                  <IconCircleCheck size={13} />
                  Mark complete
                </button>
              )}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <Progress value={m.completion_pct} className="h-1.5 flex-1" />
              <span className="text-[10px] tabular-nums text-muted-foreground">{m.completion_pct}%</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
