import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/common/PageHeader'
import { useAuth } from '../context/AuthContext'
import { api } from '../utils/api'

export default function VerifyEmailPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { verifyEmail } = useAuth()
  const [email, setEmail] = useState(params.get('email') || '')
  const [code, setCode] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const submit = async event => {
    event.preventDefault()
    setIsLoading(true)
    setError('')
    try {
      await verifyEmail(email, code)
      navigate('/feed', { replace: true })
    } catch (err) {
      setError(err.message || 'That code could not be verified. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const resend = async () => {
    setIsLoading(true)
    setError('')
    setNotice('')
    try {
      const result = await api.post('/api/v1/auth/verify-email/resend/', { email })
      setNotice(result.detail)
    } catch (err) {
      setError(err.message || 'A new code could not be sent. Please wait a moment and retry.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <PageHeader title="Verify your email" backTo="/signup" />
      <div style={{ padding: 'var(--space-md)' }}>
        <form onSubmit={submit} style={cardStyle}>
          <h2 style={{ fontSize: 19, marginBottom: 8 }}>Check your inbox</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginBottom: 18 }}>
            Enter the six-digit code we sent to your email address. It expires in 10 minutes.
          </p>
          <label htmlFor="verification-email" style={labelStyle}>Email address</label>
          <input id="verification-email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} style={inputStyle} />
          <label htmlFor="verification-code" style={{ ...labelStyle, marginTop: 14 }}>Verification code</label>
          <input id="verification-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} style={inputStyle} />
          <button type="submit" disabled={isLoading} style={buttonStyle}>{isLoading ? 'Verifying...' : 'Verify email'}</button>
          {error && <p role="alert" style={{ color: 'var(--color-error)', marginTop: 12 }}>{error}</p>}
          {notice && <p role="status" style={{ color: 'var(--color-success)', marginTop: 12 }}>{notice}</p>}
          <button type="button" disabled={isLoading || !email} onClick={resend} style={resendButtonStyle}>Send a new code</button>
          <Link to="/login" style={{ display: 'block', textAlign: 'center', marginTop: 18, color: 'var(--color-primary)' }}>Back to sign in</Link>
        </form>
      </div>
    </>
  )
}

const cardStyle = { maxWidth: 480, margin: '0 auto', padding: 'var(--space-xl)', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }
const labelStyle = { display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }
const inputStyle = { width: '100%', padding: '12px 14px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg)', color: 'var(--color-text-primary)', font: 'inherit' }
const buttonStyle = { width: '100%', padding: 14, marginTop: 18, border: 0, borderRadius: 'var(--radius-lg)', background: 'var(--color-primary)', color: 'white', font: 'inherit', fontWeight: 700, cursor: 'pointer' }
const resendButtonStyle = { display: 'block', margin: '14px auto 0', padding: 8, border: 0, background: 'transparent', color: 'var(--color-primary)', font: 'inherit', fontWeight: 600, cursor: 'pointer' }
