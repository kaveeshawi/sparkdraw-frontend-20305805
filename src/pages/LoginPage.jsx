import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import LoginPromoPanel from '@/components/auth/LoginPromoPanel'
import SparkLogo from '@/components/auth/SparkLogo'
import useAuthStore from '@/store/authStore'
import '@/styles/login.css'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, isLoading } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const result = await login(email, password)
    if (result.success) {
      navigate(result.role === 'client' ? '/portal' : '/', { replace: true })
    } else {
      setError(result.message)
    }
  }

  return (
    <div className="login-page">
      {/* LEFT 50% — promo */}
      <section className="login-promo">
        <LoginPromoPanel />
      </section>

      {/* RIGHT 50% — login form */}
      <section className="login-form-side">
        <header className="login-panel-header">
          <SparkLogo />
        </header>

        <div className="login-panel-content">
          <div className="login-form-wrap">
            <h1 className="text-[26px] font-semibold leading-tight text-[#11112A]">
              Log in to your <span className="sd-gradient-text">workspace.</span>
            </h1>
            <p className="mt-1.5 text-sm leading-snug text-[#6b7280]">
              Enter your email address and password to log in.
            </p>

            {error && (
              <Alert variant="destructive" className="mt-4 rounded-xl">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="login-form-start">
              <div className="login-field">
                <Mail className="login-field-icon" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email Address"
                  autoComplete="email"
                  required
                  className="login-input"
                />
              </div>

              <div className="login-field">
                <Lock className="login-field-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete="current-password"
                  required
                  className="login-input login-input-pr"
                />
                <button
                  type="button"
                  className="login-eye-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                </button>
              </div>

              <div className="login-forgot">
                <button type="button" className="login-link text-sm font-medium text-[#802AEE]">
                  Forgot password?
                </button>
              </div>

              <button type="submit" className="login-primary" disabled={isLoading}>
                {isLoading ? 'Signing in…' : 'Login'}
              </button>

              <div className="login-divider">
                <span>or</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button type="button" className="login-social">
                  <GoogleIcon /> Google
                </button>
                <button type="button" className="login-social">
                  <FacebookIcon /> Facebook
                </button>
              </div>
            </form>

            <p className="login-signup">
              Don&apos;t you have an account?{' '}
              <button type="button" className="login-link font-semibold text-[#802AEE]">
                Sign Up
              </button>
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
