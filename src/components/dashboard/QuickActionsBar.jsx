import { Link } from 'react-router-dom'
import { Plus, UserPlus, Receipt, Sparkles } from 'lucide-react'

const ACTIONS = [
  { label: 'New project', icon: Plus, href: null, action: 'newProject' },
  { label: 'Invite client', icon: UserPlus, href: '/clients' },
  { label: 'Generate invoice', icon: Receipt, href: '/invoices' },
  { label: 'AI Insights', icon: Sparkles, href: '/ai-studio' },
]

export default function QuickActionsBar({ onNewProject }) {
  return (
    <div className="ref-quick-actions">
      {ACTIONS.map(({ label, icon: Icon, href, action }) =>
        action === 'newProject' ? (
          <button key={label} type="button" className="ref-quick-actions__item" onClick={onNewProject}>
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ) : (
          <Link key={label} to={href} className="ref-quick-actions__item">
            <Icon size={16} />
            <span>{label}</span>
          </Link>
        )
      )}
    </div>
  )
}
