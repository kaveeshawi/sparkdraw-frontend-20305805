import { IconUsers } from '@tabler/icons-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { memberPhotoSrc } from '@/lib/media'
import { initials } from './shared'

const ROLE_VARIANT = { admin: 'default', pm: 'info', member: 'outline' }

export default function TeamTab({ project }) {
  const team = project.team_members || []

  if (team.length === 0) {
    return (
      <div className="sd-card flex flex-col items-center gap-2 p-10 text-center">
        <IconUsers size={22} className="text-muted-foreground" />
        <p className="text-[13px] font-medium">No team members assigned</p>
        <p className="text-[11.5px] text-muted-foreground">Assign people to tasks on the Board tab and they'll appear here.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-2.5 overflow-y-auto pb-4 sm:grid-cols-2 lg:grid-cols-3">
      {team.map((member) => (
        <div key={member.id} className="sd-card flex items-center gap-3 p-3.5">
          <Avatar className="size-10">
            <AvatarImage src={memberPhotoSrc(member)} alt={member.name} />
            <AvatarFallback className="text-[11px] font-semibold">{initials(member.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-medium text-foreground">{member.name}</p>
            <Badge variant={ROLE_VARIANT[member.role] || 'outline'} className="mt-0.5 capitalize text-[9px]">{member.role}</Badge>
          </div>
        </div>
      ))}
    </div>
  )
}
