import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import CommandPalette from '@/components/layout/command-palette'
import { NotificationDropdown } from '@/components/layout/notification-dropdown'
import { MessagesDropdown } from '@/components/layout/messages-dropdown'
import { UserMenu } from '@/components/layout/user-menu'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { CreditsDropdown } from '@/components/layout/credits-dropdown'
import useAuthStore from '@/store/authStore'

type SiteHeaderProps = {
  onNewProject?: () => void
}

export function SiteHeader({ onNewProject }: SiteHeaderProps) {
  const { user } = useAuthStore()
  const canCreateProject = ['admin', 'pm'].includes(user?.role ?? '')

  return (
    <header className="sd-float-topbar" aria-label="Page utilities">
      {canCreateProject && onNewProject && (
        <Button
          variant="default"
          className="sd-float-topbar__project sd-header-new-project sd-btn-gradient hidden sm:inline-flex shrink-0"
          onClick={onNewProject}
        >
          <Plus size={16} />
          New project
        </Button>
      )}
      <div className="sd-float-topbar__search">
        <CommandPalette onNewProject={canCreateProject ? onNewProject : undefined} mode="bar" />
      </div>
      <CreditsDropdown />
      <div className="sd-float-topbar__dock">
        <MessagesDropdown />
        <NotificationDropdown />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  )
}
