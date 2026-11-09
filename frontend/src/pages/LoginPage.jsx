import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err.status === 401
        ? 'Email or password is incorrect. If you just signed up, verify your email first.'
        : err.message || 'We could not sign you in. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-page" style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--color-primary-soft), var(--color-secondary-soft))'
    }}>
      <div className="auth-shell">
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '42px',
            fontWeight: 700,
            color: 'var(--color-primary)',
            marginBottom: '8px'
          }}>
            LinkUp
          </h1>
          <p style={{ fontSize: '16px', color: 'var(--color-text-secondary)' }}>
            Meet people near you
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-card" style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <label htmlFor="login-email" style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
              marginBottom: '8px'
            }}>
              Email
            </label>
            <div className="auth-input-row" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid var(--color-border)',
              background: 'var(--color-bg)'
            }}>
              <Mail size={18} color="var(--color-text-muted)" />
              <input
                id="login-email"
                type="email"
                name="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck="false"
                inputMode="email"
                maxLength={254}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError('')
                }}
                placeholder="you@example.com"
                required
                aria-invalid={Boolean(error)}
              />
            </div>
          </div>

          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <label htmlFor="login-password" style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
              marginBottom: '8px'
            }}>
              Password
            </label>
            <div className="auth-input-row" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid var(--color-border)',
              background: 'var(--color-bg)'
            }}>
              <Lock size={18} color="var(--color-text-muted)" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError('')
                }}
                placeholder="••••••••"
                required
                aria-invalid={Boolean(error)}
              />
              <button
                className="auth-password-toggle"
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-text-muted)',
                  padding: '4px'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div style={{ textAlign: 'right', marginTop: '8px' }}>
              <Link to="/forgot-password" style={{ color: 'var(--color-primary)', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
                Forgot password?
              </Link>
            </div>
          </div>

          {error && (
            <div role="alert" style={{
              marginBottom: 'var(--space-md)',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-primary-soft)',
              color: 'var(--color-primary-dark)',
              fontSize: '13px'
            }}>
              {error}{' '}
              {errNeedsVerification(error) && (
                <Link to={`/verify-email?email=${encodeURIComponent(email.trim())}`} style={{ color: 'inherit', fontWeight: 700 }}>
                  Verify your email
                </Link>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !email.trim() || !password}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 'var(--radius-lg)',
              border: 'none',
              background: 'var(--color-primary)',
              color: 'white',
              fontSize: '16px',
              fontWeight: 600,
              cursor: isLoading ? 'wait' : 'pointer',
              fontFamily: 'var(--font-sans)',
              opacity: isLoading ? 0.8 : 1
            }}
          >
            {isLoading ? 'Signing in…' : 'Sign in'}
          </button>

          <div style={{
            textAlign: 'center',
            marginTop: 'var(--space-lg)',
            paddingTop: 'var(--space-lg)',
            borderTop: '1px solid var(--color-border-light)'
          }}>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              Don't have an account?{' '}
              <Link to="/signup" style={{
                color: 'var(--color-primary)',
                fontWeight: 600,
                textDecoration: 'none'
              }}>
                Sign Up
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}

function errNeedsVerification(error) {
  return error.includes('verify your email')
}
