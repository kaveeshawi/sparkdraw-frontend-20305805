import { Link } from 'react-router-dom'
import {
  IconCreditCard,
  IconLogout,
  IconSettings,
  IconUserCircle,
} from '@tabler/icons-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getInitials } from '@/lib/utils'
import useAuthStore from '@/store/authStore'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Agency Admin',
  pm: 'Project Manager',
  member: 'Team Member',
  client: 'Client',
}

export function UserMenu() {
  const { user, logout } = useAuthStore()

  if (!user) return null

  const initials = getInitials(user.name || user.email || 'User')
  const roleLabel = ROLE_LABELS[user.role] || user.role?.replace('_', ' ')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="sd-header-icon-btn sd-header-profile overflow-hidden p-0"
          aria-label={`${user.name} account menu`}
        >
          <Avatar className="size-full">
            <AvatarFallback className="rounded-full bg-primary/10 text-xs font-medium text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="sd-user-menu-panel min-w-56 p-2"
        align="end"
        sideOffset={8}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-3 px-2 py-2 text-left text-sm">
            <Avatar className="size-9">
              <AvatarFallback className="rounded-full bg-primary/10 text-xs font-medium text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs text-muted-foreground">{roleLabel}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <IconUserCircle size={18} stroke={1.75} />
            Account
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/settings">
              <IconSettings size={18} stroke={1.75} />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <IconCreditCard size={18} stroke={1.75} />
            Billing
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => logout()}>
          <IconLogout size={18} stroke={1.75} />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
