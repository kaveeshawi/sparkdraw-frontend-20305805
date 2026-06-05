import SparkLogo from '@/components/auth/SparkLogo'
import LoginSystemUI from '@/components/auth/LoginSystemUI'

export default function LoginPromoPanel() {
  return (
    <div className="login-promo-inner">
      <div className="login-promo-blob login-promo-blob--1" />
      <div className="login-promo-blob login-promo-blob--2" />
      <div className="login-promo-blob login-promo-blob--3" />

      <header className="login-panel-header">
        <SparkLogo variant="light" subtitle />
      </header>

      <div className="login-panel-content">
        <LoginSystemUI />
      </div>

      <footer className="login-panel-footer">
        <h2 className="login-promo-footer__title">
          Empower your agency with Sparkdraw
        </h2>
        <p className="login-promo-footer__sub">sparkdraw.app</p>
      </footer>
    </div>
  )
}
