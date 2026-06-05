import { Zap, LayoutDashboard, FolderKanban, Users, Sparkles } from 'lucide-react'

const NAV = [
  { icon: LayoutDashboard, active: false },
  { icon: FolderKanban, active: true },
  { icon: Users, active: false },
  { icon: Sparkles, active: false },
]

export default function LoginSystemUI() {
  return (
    <div className="login-system-ui">
      {/* Glass shell */}
      <div className="login-system-ui__shell">
        {/* Sidebar */}
        <aside className="login-system-ui__sidebar">
          {NAV.map(({ icon: Icon, active }, i) => (
            <div
              key={i}
              className={`login-system-ui__nav-item${active ? ' login-system-ui__nav-item--active' : ''}`}
            >
              <Icon className="size-3.5" strokeWidth={active ? 2.2 : 1.8} />
            </div>
          ))}
        </aside>

        {/* Main workspace */}
        <div className="login-system-ui__main">
          {/* Top tabs */}
          <div className="login-system-ui__tabs">
            <span className="login-system-ui__tab login-system-ui__tab--active">Projects</span>
            <span className="login-system-ui__tab">Health</span>
            <span className="login-system-ui__tab">Clients</span>
          </div>

          {/* Workflow canvas */}
          <div className="login-system-ui__canvas">
            <svg className="login-system-ui__lines" viewBox="0 0 320 200" preserveAspectRatio="none">
              <path d="M 72 52 L 128 52" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeDasharray="4 4" fill="none" />
              <path d="M 168 52 L 210 80" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeDasharray="4 4" fill="none" />
              <path d="M 210 120 L 168 148" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeDasharray="4 4" fill="none" />
              <path d="M 128 148 L 72 148" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeDasharray="4 4" fill="none" />
            </svg>

            {/* Node: Client brief */}
            <div className="login-system-ui__node login-system-ui__node--brief">
              <span className="login-system-ui__node-label">Client brief</span>
            </div>

            {/* Node: AI translate */}
            <div className="login-system-ui__node login-system-ui__node--ai">
              <Zap className="size-3 text-[#c4b5fd]" fill="#c4b5fd" />
              <span className="login-system-ui__node-label">AI ticket</span>
            </div>

            {/* Diamond decision */}
            <div className="login-system-ui__diamond">
              <span>?</span>
            </div>

            {/* Health score — green accent */}
            <div className="login-system-ui__node login-system-ui__node--health">
              <span className="login-system-ui__health-num">88</span>
              <span className="login-system-ui__node-label">Health</span>
            </div>

            {/* PM review with avatar */}
            <div className="login-system-ui__node login-system-ui__node--review">
              <div className="login-system-ui__avatar">PM</div>
              <span className="login-system-ui__node-label">Review</span>
            </div>

            {/* Cursor pointer */}
            <svg className="login-system-ui__cursor" width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M3 2L14 9L9 10.5L7.5 15L3 2Z" fill="white" stroke="rgba(0,0,0,0.2)" strokeWidth="0.5" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
