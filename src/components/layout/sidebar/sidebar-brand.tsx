import { Link } from 'react-router-dom'

import { SidebarHeader } from '@/components/ui/sidebar'

import Logo from '@/components/layout/logo'



export function SidebarBrand() {

  return (

    <SidebarHeader className="sd-sidebar-brand sd-sidebar-brand--float !flex-row !items-center !justify-start !gap-0 !p-0">

      <Link to="/" className="sd-float-brand sd-sidebar-logo" aria-label="Sparkdraw home">

        <Logo className="sd-sidebar-logo__mark shrink-0 rounded-2xl" />

        <span className="sd-sidebar-logo__text">Sparkdraw</span>

      </Link>

    </SidebarHeader>

  )

}

