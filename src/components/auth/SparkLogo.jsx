import { Zap } from 'lucide-react'

export default function SparkLogo({ variant = 'dark', subtitle = false }) {
  const isLight = variant === 'light'

  return (
    <div className="login-brand">
      <div className="login-brand__icon">
        <svg viewBox="0 0 40 40" className="size-9">
          <polygon points="20,3 36,11 36,29 20,37 4,29 4,11" fill="#EA580C" />
        </svg>
        <Zap className="login-brand__bolt" fill="white" />
      </div>
      <div className="login-brand__text">
        <p className={`login-brand__name${isLight ? ' login-brand__name--light' : ''}`}>
          Sparkdraw
        </p>
        {subtitle && <p className="login-brand__tag">Agency Workspace</p>}
      </div>
    </div>
  )
}
