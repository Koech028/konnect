import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import { api } from '../utils/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setIsLoading(true)
    try {
      await api.post('/api/v1/auth/password-reset/', { email })
      setSubmitted(true)
      setError('')
    } catch (err) {
      setError(err.message || 'The password reset request could not be sent.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <PageHeader title="Password help" backTo="/login" />
      <div style={{ padding: 'var(--space-md)' }}>
        <form onSubmit={submit} style={cardStyle}>
          <div style={iconStyle}><Mail size={24} /></div>
          <h2 style={{ fontSize: '19px', textAlign: 'center', margin: '14px 0 6px' }}>Forgot your password?</h2>
          <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
            Enter the email address associated with your account.
          </p>
          <label htmlFor="reset-email" style={labelStyle}>Email address</label>
          <input id="reset-email" type="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" style={inputStyle} />
          <button type="submit" disabled={isLoading} style={buttonStyle}>{isLoading ? 'Sending...' : 'Continue'}</button>
          {submitted && <p role="status" style={{ color: 'var(--color-success)', fontSize: '14px', marginTop: '14px' }}>If an account exists for that email, password-reset instructions have been sent.</p>}
          {error && <p role="alert" style={{ color: 'var(--color-error)', fontSize: '14px', marginTop: '14px' }}>{error}</p>}
          <p style={{ color: 'var(--color-text-muted)', fontSize: '12px', marginTop: '14px' }}>For your privacy, we do not confirm whether an account exists.</p>
          <Link to="/login" style={{ display: 'block', textAlign: 'center', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600, marginTop: '20px' }}>Back to sign in</Link>
        </form>
      </div>
    </>
  )
}

const cardStyle = { maxWidth: '480px', margin: '0 auto', padding: 'var(--space-xl)', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }
const iconStyle = { width: '52px', height: '52px', margin: '0 auto', borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }
const labelStyle = { display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }
const inputStyle = { width: '100%', padding: '12px 14px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg)', color: 'var(--color-text-primary)', font: 'inherit' }
const buttonStyle = { width: '100%', padding: '14px', marginTop: '16px', border: 'none', borderRadius: 'var(--radius-lg)', background: 'var(--color-primary)', color: 'white', font: 'inherit', fontWeight: 700, cursor: 'pointer' }
