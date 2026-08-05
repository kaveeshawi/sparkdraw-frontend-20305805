import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Lock, Eye, EyeOff, User } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import LoginPromoPanel from '@/components/auth/LoginPromoPanel'
import SparkLogo from '@/components/auth/SparkLogo'
import { passwordSetupApi } from '@/services/api'
import '@/styles/login.css'

export default function SetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState('loading')
  const [invite, setInvite] = useState(null)
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!token) {
      setStatus('invalid')
      setError('No setup token was provided. Check your invite email for the full link.')
      return
    }

    let cancelled = false

    passwordSetupApi
      .validate(token)
      .then((res) => {
        if (cancelled) return
        setInvite(res.data.data)
        setStatus('ready')
      })
      .catch((err) => {
        if (cancelled) return
        setStatus('invalid')
        setError(
          err.response?.data?.message ||
            'This password setup link is invalid or has expired.'
        )
      })

    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    if (status !== 'success') return

    const timer = setTimeout(() => {
      navigate('/login', { replace: true })
    }, 2500)

    return () => clearTimeout(timer)
  }, [status, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (password !== passwordConfirmation) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)

    try {
      await passwordSetupApi.submit({
        token,
        password,
        password_confirmation: passwordConfirmation,
      })
      setStatus('success')
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.errors?.password?.[0] ||
        'Unable to set password. Please try again.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <section className="login-promo">
        <LoginPromoPanel />
      </section>

      <section className="login-form-side">
        <header className="login-panel-header">
          <SparkLogo />
        </header>

        <div className="login-panel-content">
          <div className="login-form-wrap">
            <h1 className="text-[26px] font-semibold leading-tight text-[#11112A]">
              Set your <span className="sd-gradient-text">password.</span>
            </h1>
            <p className="mt-1.5 text-sm leading-snug text-[#6b7280]">
              {status === 'success'
                ? 'Your account is ready. Redirecting to login…'
                : 'Create a password to access your Sparkdraw workspace.'}
            </p>

            {status === 'loading' && (
              <p className="mt-6 text-sm text-[#6b7280]">Validating invite link…</p>
            )}

            {status === 'invalid' && (
              <Alert variant="destructive" className="mt-4 rounded-xl">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {status === 'success' && (
              <Alert className="mt-4 rounded-xl border-[#f0eeff] bg-[#fdfcff]">
                <AlertDescription className="text-[#11112A]">
                  Password set successfully. You can now log in with your new credentials.
                </AlertDescription>
              </Alert>
            )}

            {status === 'ready' && invite && (
              <>
                <div className="mt-4 rounded-xl border border-[#f0eeff] bg-[#fdfcff] px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-[#11112A]">
                    <User className="size-4 text-[#802AEE]" />
                    <span className="font-medium">{invite.name}</span>
                  </div>
                  <p className="mt-1 pl-6 text-sm text-[#6b7280]">{invite.email}</p>
                </div>

                {error && (
                  <Alert variant="destructive" className="mt-4 rounded-xl">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmit} className="login-form-start">
                  <div className="login-field">
                    <Lock className="login-field-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="New password"
                      autoComplete="new-password"
                      minLength={8}
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

                  <div className="login-field">
                    <Lock className="login-field-icon" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={passwordConfirmation}
                      onChange={(e) => setPasswordConfirmation(e.target.value)}
                      placeholder="Confirm password"
                      autoComplete="new-password"
                      minLength={8}
                      required
                      className="login-input login-input-pr"
                    />
                    <button
                      type="button"
                      className="login-eye-btn"
                      onClick={() => setShowConfirm((v) => !v)}
                      tabIndex={-1}
                      aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    >
                      {showConfirm ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                    </button>
                  </div>

                  <button type="submit" className="login-primary" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving…' : 'Set password'}
                  </button>
                </form>
              </>
            )}

            {(status === 'invalid' || status === 'success') && (
              <p className="login-signup">
                <button
                  type="button"
                  className="login-link font-semibold text-[#802AEE]"
                  onClick={() => navigate('/login', { replace: true })}
                >
                  Go to login
                </button>
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
