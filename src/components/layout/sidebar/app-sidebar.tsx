import * as React from 'react'
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar'
import { NavMain } from '@/components/layout/sidebar/nav-main'
import { NavUpgrade } from '@/components/layout/sidebar/nav-upgrade'
import { SidebarBrand } from '@/components/layout/sidebar/sidebar-brand'
import { useIsTablet } from '@/hooks/use-mobile'

type AppSidebarProps = React.ComponentProps<typeof Sidebar>

export function AppSidebar({ ...props }: AppSidebarProps) {
  const pathname = useLocation().pathname
  const { setOpen, setOpenMobile, isMobile } = useSidebar()
  const isTablet = useIsTablet()

  useEffect(() => {
    if (isMobile) setOpenMobile(false)
  }, [pathname, isMobile, setOpenMobile])

  useEffect(() => {
    if (!isMobile) setOpen(false)
  }, [isMobile, setOpen])

  return (
    <Sidebar collapsible="icon" className="sd-sidebar sd-sidebar--float border-r-0" {...props}>
      <SidebarBrand />

      <SidebarContent className="sd-sidebar-main sd-sidebar-main--float">
        <NavMain />
      </SidebarContent>

      <SidebarFooter className="sd-sidebar-footer sd-sidebar-footer--float">
        <NavUpgrade />
      </SidebarFooter>
    </Sidebar>
  )
}
