import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

const STATUS_VARIANT = {
  active: 'success',
  completed: 'info',
  on_hold: 'warning',
  cancelled: 'destructive',
}

export default function ProjectCard({ project }) {
  const progress = project.progress_percent ?? 0

  return (
    <Link
      to={`/projects/${project.id}/`}
      className="sd-table-row"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="size-2.5 shrink-0 rounded-sm"
          style={{ background: project.color || 'var(--primary)' }}
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{project.name}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {project.client?.company_name || '—'}
            {project.end_date ? ` · ${project.end_date}` : ''}
          </p>
        </div>
      </div>

      <div className="hidden md:block">
        <Progress value={progress} className="h-1.5" />
      </div>

      <span className="hidden text-right text-xs tabular-nums text-muted-foreground md:block">
        {progress}%
      </span>

      <Badge
        variant={STATUS_VARIANT[project.status] || 'outline'}
        className="justify-self-end capitalize md:justify-self-auto"
      >
        {project.status?.replace('_', ' ') || 'unknown'}
      </Badge>
    </Link>
  )
}
