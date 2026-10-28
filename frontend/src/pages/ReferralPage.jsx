import { useEffect, useState } from 'react'
import { Copy, Share2, UserPlus } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import { api } from '../utils/api'

export default function ReferralPage() {
  const [referral, setReferral] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    api.get('/api/v1/referrals/me/')
      .then(setReferral)
      .catch(err => setError(err.message || 'Your invitation link could not be loaded.'))
  }, [])

  const inviteUrl = referral
    ? `${window.location.origin}/signup?ref=${encodeURIComponent(referral.referral_code)}`
    : ''

  const copyLink = async () => {
    if (!navigator.clipboard?.writeText) {
      setError('Copy is not supported in this browser. Select the invitation link to copy it.')
      return
    }
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setMessage('Invitation link copied.')
      setError('')
    } catch (err) {
      setError(err.message || 'The invitation link could not be copied. Select the link to copy it.')
      setMessage('')
    }
  }

  const shareLink = async () => {
    if (!navigator.share) {
      await copyLink()
      return
    }
    setSharing(true)
    try {
      await navigator.share({
        title: 'Join me on LinkUp',
        text: 'Create a LinkUp profile and connect with people.',
        url: inviteUrl
      })
      setMessage('Invitation ready to share.')
      setError('')
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'The invitation could not be shared.')
        setMessage('')
      }
    } finally {
      setSharing(false)
    }
  }

  return (
    <>
      <PageHeader title="Invite friends" />
      <main style={{ padding: 'var(--space-md)' }}>
        <section style={cardStyle}>
          <div style={iconStyle}><UserPlus size={24} /></div>
          <h2 style={titleStyle}>Grow your LinkUp circle</h2>
          <p style={descriptionStyle}>Share your personal invitation link. When someone signs up through it, their signup is counted here.</p>
          <label htmlFor="referral-link" style={labelStyle}>Your invitation link</label>
          <input
            id="referral-link"
            type="text"
            readOnly
            value={inviteUrl}
            onFocus={event => event.target.select()}
            aria-label="Your personal referral link"
            style={inputStyle}
          />
          <div style={buttonRowStyle}>
            <button type="button" onClick={copyLink} disabled={!referral} style={buttonStyle}>
              <Copy size={17} /> Copy link
            </button>
            <button type="button" onClick={shareLink} disabled={!referral || sharing} style={secondaryButtonStyle}>
              <Share2 size={17} /> {sharing ? 'Opening share…' : 'Share'}
            </button>
          </div>
        </section>

        {referral && (
          <section style={countCardStyle} aria-live="polite">
            <UserPlus size={21} color="var(--color-primary)" />
            <span><strong>{referral.successful_signups}</strong> successful signups through your link</span>
          </section>
        )}

        <p style={noteStyle}>Referral tracking is currently informational only. There are no cash, credit, or premium rewards.</p>
        {error && <p role="alert" style={errorStyle}>{error}</p>}
        {message && <p role="status" style={successStyle}>{message}</p>}
        {!referral && !error && <p role="status" style={noteStyle}>Preparing your invitation link…</p>}
      </main>
    </>
  )
}

const cardStyle = { padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-sm)' }
const iconStyle = { display: 'grid', placeItems: 'center', width: 48, height: 48, marginBottom: 14, borderRadius: '50%', background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }
const titleStyle = { margin: '0 0 8px', fontSize: 20, color: 'var(--color-text-primary)' }
const descriptionStyle = { margin: '0 0 18px', color: 'var(--color-text-secondary)', fontSize: 14, lineHeight: 1.5 }
const labelStyle = { display: 'block', marginBottom: 6, color: 'var(--color-text-secondary)', fontSize: 13, fontWeight: 600 }
const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '11px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg)', color: 'var(--color-text-primary)', font: 'inherit', fontSize: 13 }
const buttonRowStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }
const buttonStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: 12, border: 0, borderRadius: 'var(--radius-md)', background: 'var(--color-primary)', color: 'white', font: 'inherit', fontWeight: 700, cursor: 'pointer' }
const secondaryButtonStyle = { ...buttonStyle, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }
const countCardStyle = { display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, padding: '14px 16px', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-sm)', color: 'var(--color-text-primary)', fontSize: 14 }
const noteStyle = { margin: '12px 2px 0', color: 'var(--color-text-tertiary)', fontSize: 12, lineHeight: 1.5 }
const errorStyle = { marginTop: 12, color: 'var(--color-error)', fontSize: 13 }
const successStyle = { marginTop: 12, color: 'var(--color-success)', fontSize: 13 }
