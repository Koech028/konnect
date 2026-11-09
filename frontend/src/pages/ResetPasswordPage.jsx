import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/common/PageHeader'
import { api } from '../utils/api'

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const [email, setEmail] = useState(params.get('email') || '')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const submit = async event => {
    event.preventDefault()
    setIsLoading(true)
    try {
      const result = await api.post('/api/v1/auth/password-reset/confirm/', { email, code, password })
      setMessage(result.detail)
      setError('')
    } catch (err) {
      setError(err.message || 'The password could not be changed.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <PageHeader title="Reset password" backTo="/login" />
      <div style={{ padding: 'var(--space-md)' }}>
        <form onSubmit={submit} className="auth-card" style={cardStyle}>
          <h2 style={{ fontSize: 19, marginBottom: 12 }}>Choose a new password</h2>
          <label htmlFor="reset-email" style={labelStyle}>Email address</label>
          <input id="reset-email" name="email" type="email" autoCapitalize="none" inputMode="email" maxLength={254} autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} style={inputStyle} />
          <label htmlFor="reset-code" style={{ ...labelStyle, marginTop: 14 }}>Six-digit code</label>
          <input id="reset-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} style={inputStyle} />
          <label htmlFor="new-password" style={{ ...labelStyle, marginTop: 14 }}>New password</label>
          <input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={event => setPassword(event.target.value)} style={inputStyle} />
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 10 }}>The code expires after 10 minutes and can only be used once.</p>
          <button type="submit" disabled={isLoading} style={buttonStyle}>{isLoading ? 'Updating...' : 'Update password'}</button>
          {message && <p role="status" style={{ color: 'var(--color-success)', marginTop: 12 }}>{message}</p>}
          {error && <p role="alert" style={{ color: 'var(--color-error)', marginTop: 12 }}>{error}</p>}
          <Link to={`/forgot-password?email=${encodeURIComponent(email.trim())}`} style={{ display: 'block', textAlign: 'center', marginTop: 14, color: 'var(--color-primary)' }}>Request another code</Link>
          <Link to="/login" style={{ display: 'block', textAlign: 'center', marginTop: 18, color: 'var(--color-primary)' }}>Back to sign in</Link>
        </form>
      </div>
    </>
  )
}

const cardStyle = { maxWidth: 480, margin: '0 auto', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }
const labelStyle = { display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }
const inputStyle = { width: '100%', padding: '12px 14px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg)', color: 'var(--color-text-primary)', font: 'inherit' }
const buttonStyle = { width: '100%', padding: 14, marginTop: 16, border: 0, borderRadius: 'var(--radius-lg)', background: 'var(--color-primary)', color: 'white', font: 'inherit', fontWeight: 700, cursor: 'pointer' }
