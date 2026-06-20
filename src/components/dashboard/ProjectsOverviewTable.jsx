import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

const STATUS_MAP = {
  active: { label: 'On Track', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  on_hold: { label: 'At Risk', className: 'bg-amber-50 text-amber-700 border-amber-100' },
  completed: { label: 'Completed', className: 'bg-blue-50 text-blue-700 border-blue-100' },
  cancelled: { label: 'Cancelled', className: 'bg-red-50 text-red-700 border-red-100' },
}

const HEALTH_COLORS = {
  green: 'bg-emerald-500 text-white',
  amber: 'bg-amber-500 text-white',
  red: 'bg-red-500 text-white',
}

function healthFromProgress(p) {
  if (p >= 70) return 'green'
  if (p >= 40) return 'amber'
  return 'red'
}

export default function ProjectsOverviewTable({ projects, healthScores = [] }) {
  const hsMap = Object.fromEntries(
    healthScores.map((hs) => [hs.project?.id ?? hs.project_id, hs])
  )

  return (
    <div className="ref-projects-table">
      <div className="ref-projects-table__head">
        <span>Project</span>
        <span>Client</span>
        <span>Progress</span>
        <span>Health</span>
        <span>Next milestone</span>
        <span>Due</span>
        <span>Status</span>
      </div>
      {projects.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No projects yet.</p>
      ) : (
        projects.slice(0, 5).map((project) => {
          const progress = project.progress_percent ?? 0
          const hs = hsMap[project.id]
          const flag = hs?.flag || healthFromProgress(progress)
          const score = hs?.score ?? progress
          const status = STATUS_MAP[project.status] || STATUS_MAP.active

          return (
            <Link
              key={project.id}
              to={`/projects/${project.id}/`}
              className="ref-projects-table__row"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <div
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: project.color || 'var(--primary)' }}
                />
                <span className="truncate font-medium">{project.name}</span>
              </div>
              <span className="truncate text-sm text-muted-foreground">
                {project.client?.company_name || '—'}
              </span>
              <div className="flex items-center gap-2">
                <Progress value={progress} className="h-1.5 flex-1" />
                <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">
                  {progress}%
                </span>
              </div>
              <div
                className={cn(
                  'flex size-8 items-center justify-center rounded-full text-xs font-semibold',
                  HEALTH_COLORS[flag] || HEALTH_COLORS.green
                )}
              >
                {score}
              </div>
              <span className="truncate text-sm text-muted-foreground">
                {project.milestones?.[0]?.title || 'Review phase'}
              </span>
              <span className="text-sm text-muted-foreground">{project.end_date || '—'}</span>
              <Badge variant="outline" className={cn('w-fit border', status.className)}>
                {status.label}
              </Badge>
            </Link>
          )
        })
      )}
    </div>
  )
}
