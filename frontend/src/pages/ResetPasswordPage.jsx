import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/common/PageHeader'
import { api } from '../utils/api'

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const uid = params.get('uid')
  const token = params.get('token')

  const submit = async event => {
    event.preventDefault()
    setIsLoading(true)
    try {
      const result = await api.post('/api/v1/auth/password-reset/confirm/', { uid, token, password })
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
        <form onSubmit={submit} style={cardStyle}>
          <h2 style={{ fontSize: 19, marginBottom: 12 }}>Choose a new password</h2>
          {!uid || !token
            ? <p role="alert" style={{ color: 'var(--color-error)' }}>This reset link is incomplete. Request a new password reset email.</p>
            : <>
                <label htmlFor="new-password" style={labelStyle}>New password</label>
                <input id="new-password" type="password" minLength={8} required value={password} onChange={event => setPassword(event.target.value)} style={inputStyle} />
                <button type="submit" disabled={isLoading} style={buttonStyle}>{isLoading ? 'Updating...' : 'Update password'}</button>
              </>}
          {message && <p role="status" style={{ color: 'var(--color-success)', marginTop: 12 }}>{message}</p>}
          {error && <p role="alert" style={{ color: 'var(--color-error)', marginTop: 12 }}>{error}</p>}
          <Link to="/login" style={{ display: 'block', textAlign: 'center', marginTop: 18, color: 'var(--color-primary)' }}>Back to sign in</Link>
        </form>
      </div>
    </>
  )
}

const cardStyle = { maxWidth: 480, margin: '0 auto', padding: 'var(--space-xl)', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }
const labelStyle = { display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }
const inputStyle = { width: '100%', padding: '12px 14px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg)', color: 'var(--color-text-primary)', font: 'inherit' }
const buttonStyle = { width: '100%', padding: 14, marginTop: 16, border: 0, borderRadius: 'var(--radius-lg)', background: 'var(--color-primary)', color: 'white', font: 'inherit', fontWeight: 700, cursor: 'pointer' }
