import { useEffect, useState } from 'react'
import { IconBuilding, IconShieldLock } from '@tabler/icons-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import DepartmentsPanel from './DepartmentsPanel'
import RolesPermissionsTable from './RolesPermissionsTable'

const TABS = [
  { id: 'departments', label: 'Departments', icon: IconBuilding },
  { id: 'roles', label: 'Roles & Permissions', icon: IconShieldLock },
]

export default function ManageAccessModal({
  open,
  onOpenChange,
  agencyId,
  members,
  canManage = true,
  initialTab = 'departments',
  onDepartmentsChange,
  onDepartmentRenamed,
  onDepartmentRemoved,
}) {
  const [activeTab, setActiveTab] = useState(initialTab)

  useEffect(() => {
    if (!open) return
    if (initialTab === 'departments' || initialTab === 'roles') {
      setActiveTab(initialTab)
    }
  }, [open, initialTab])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col border-0 !max-w-[1100px] p-8 gap-5">
        <DialogHeader className="sd-dept-dialog__header">
          <DialogTitle className="text-xl font-bold">Manage departments &amp; permissions</DialogTitle>
          <DialogDescription className="text-[13px]">
            Organize your agency into departments, and control what each role can access.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-muted/30 p-1.5">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13px] cursor-pointer transition-all',
                  active
                    ? 'font-semibold text-primary bg-card-solid shadow-[var(--sd-glow-md)] ring-1 ring-inset ring-primary/15'
                    : 'font-medium text-muted-foreground hover:text-foreground hover:bg-card-solid/60'
                )}
              >
                <Icon size={16} className={active ? 'text-primary' : 'text-muted-foreground'} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {activeTab === 'departments' && (
          <DepartmentsPanel
            open={open}
            agencyId={agencyId}
            members={members}
            onDepartmentsChange={onDepartmentsChange}
            onDepartmentRenamed={onDepartmentRenamed}
            onDepartmentRemoved={onDepartmentRemoved}
          />
        )}

        {activeTab === 'roles' && (
          <RolesPermissionsTable open={open} canManage={canManage} />
        )}
      </DialogContent>
    </Dialog>
  )
}
