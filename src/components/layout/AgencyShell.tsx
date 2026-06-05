import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

import { AppSidebar } from '@/components/layout/sidebar/app-sidebar'

import { SiteHeader } from '@/components/layout/site-header'

import { TooltipProvider } from '@/components/ui/tooltip'

type AgencyShellProps = {
  children: React.ReactNode
  breadcrumb?: string[]
  pageTitle?: string
  pageSubtitle?: React.ReactNode
  topbarAction?: React.ReactNode | {
    label: string
    icon?: React.ComponentType<{ size?: number; className?: string }>
    onClick: () => void
  }
  /** Fixed page header (title + actions) — does not scroll with content */
  pageActions?: React.ReactNode
  onNewProject?: () => void
}

export default function AgencyShell({
  children,
  pageActions,
  onNewProject,
}: AgencyShellProps) {
  return (
    <TooltipProvider>
      <SidebarProvider
        defaultOpen={false}
        className="sd-shell-root !min-h-0"
        style={
          {
            '--sidebar-width': '13.5rem',
            '--sidebar-width-icon': '13.5rem',
            '--sd-header-height': '3.75rem',
          } as React.CSSProperties
        }
      >
        <AppSidebar />

        <SidebarInset className="sd-shell-main">
          <div className="sd-shell-viewport">
            <SiteHeader onNewProject={onNewProject} />
            {pageActions ? (
              <div className="sd-float-page-header">{pageActions}</div>
            ) : null}
            <div className="sd-shell-content">{children}</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
