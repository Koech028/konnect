import { useEffect, useState } from 'react'
import { BadgeCheck, CheckCircle2 } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import { useAuth } from '../context/AuthContext'
import { api } from '../utils/api'

export default function VerificationPage() {
  const { user, refreshUser } = useAuth()
  const [status, setStatus] = useState(user?.verification_status || 'not_started')
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/api/v1/profiles/me/verification/')
      .then(response => setStatus(response.status))
      .catch(err => setError(err.message || 'Verification status could not be loaded.'))
  }, [])

  const submitRequest = async () => {
    try {
      const result = await api.post('/api/v1/profiles/me/verification/', {})
      setStatus(result.status)
      await refreshUser()
      setError('')
    } catch (err) {
      setError(err.message || 'Could not submit your verification request.')
    }
  }

  const isVerified = user?.verification_status === 'verified'

  return (
    <>
      <PageHeader title="Profile verification" />
      <div style={{ padding: 'var(--space-md)' }}>
        <section style={cardStyle}>
          <div style={iconStyle}>{status === 'pending' ? <CheckCircle2 size={26} /> : <BadgeCheck size={28} />}</div>
          <h2 style={{ textAlign: 'center', fontSize: '19px', margin: '14px 0 8px' }}>
            {isVerified ? 'Your profile is verified' : status === 'pending' ? 'Request received' : 'Verify your profile'}
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', textAlign: 'center', lineHeight: 1.6 }}>
            {isVerified
              ? 'Your account currently has verified status.'
              : status === 'pending'
                ? 'Your request is pending review. We will update your profile when it has been reviewed.'
                : 'Request a profile review. Do not upload identity documents or sensitive personal information.'}
          </p>
          {!isVerified && status !== 'pending' && (
            <>
              <button type="button" onClick={submitRequest} style={buttonStyle}>Request verification</button>
            </>
          )}
          {error && <p role="alert" style={{ color: 'var(--color-error)', fontSize: '14px', marginTop: '12px' }}>{error}</p>}
          <p style={noteStyle}>A moderator will review the request. Do not send government IDs through this feature.</p>
        </section>
      </div>
    </>
  )
}

const cardStyle = { maxWidth: '520px', margin: '0 auto', padding: 'var(--space-xl)', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-sm)' }
const iconStyle = { width: '56px', height: '56px', margin: '0 auto', display: 'grid', placeItems: 'center', borderRadius: '50%', background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }
const buttonStyle = { width: '100%', marginTop: '14px', padding: '14px', border: 'none', borderRadius: 'var(--radius-lg)', background: 'var(--color-primary)', color: 'white', font: 'inherit', fontWeight: 700, cursor: 'pointer' }
const noteStyle = { marginTop: '18px', fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.5 }
