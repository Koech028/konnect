import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Shield, UserRoundX, Flag } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import { useAppData } from '../context/AppDataContext'
import { api } from '../utils/api'

const reasons = [
  ['spam', 'Spam or scam'],
  ['inappropriate', 'Inappropriate content'],
  ['fake_profile', 'Fake profile'],
  ['harassment', 'Harassment or abuse'],
  ['other', 'Other']
]

export default function SafetyPage() {
  const [searchParams] = useSearchParams()
  const initialUserId = searchParams.get('userId') || ''
  const [userId, setUserId] = useState(initialUserId)
  const [reason, setReason] = useState(reasons[0][0])
  const [details, setDetails] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const { blockedProfiles, reports, relationshipsError, setBlocked, addReport, searchProfiles } = useAppData()
  const [profiles, setProfiles] = useState([])
  const selectedUser = profiles.find(user => user.id === userId)

  useEffect(() => {
    searchProfiles({})
      .then(setProfiles)
      .catch(err => setError(err.message || 'Profiles could not be loaded.'))
  }, [searchProfiles])

  const submitReport = async (event) => {
    event.preventDefault()
    if (!selectedUser) {
      setError('Choose a profile to report.')
      return
    }
    try {
      await addReport({ user_id: selectedUser.id, reason, details: details.trim() })
      setDetails('')
      setMessage('Your report was sent to the moderation team.')
      setError('')
    } catch (err) {
      setError(err.message || 'Your report could not be saved.')
    }
  }

  const toggleBlock = async (blockedId, blocked) => {
    try {
      await setBlocked(blockedId, blocked)
      setMessage(blocked ? 'Profile blocked.' : 'Profile unblocked.')
      setError('')
    } catch (err) {
      setError(err.message || 'Could not update your block list.')
    }
  }

  return (
    <>
      <PageHeader title="Safety center" />
      <div style={{ padding: 'var(--space-md)' }}>
        <section style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', color: 'var(--color-primary)' }}><Shield size={22} /><h2 style={{ color: 'var(--color-text-primary)', fontSize: '17px' }}>Report a profile</h2></div>
          <p style={helperStyle}>Reports are sent securely to the moderation team for review.</p>
          <form onSubmit={submitReport}>
            <label htmlFor="report-user" style={labelStyle}>Profile</label>
            <select id="report-user" value={userId} onChange={event => setUserId(event.target.value)} style={fieldStyle}>
              <option value="">Choose a profile</option>
              {profiles.map(person => <option key={person.id} value={person.id}>{person.display_name}</option>)}
            </select>
            <label htmlFor="report-reason" style={labelStyle}>Reason</label>
            <select id="report-reason" value={reason} onChange={event => setReason(event.target.value)} style={fieldStyle}>
              {reasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <label htmlFor="report-details" style={labelStyle}>Details (optional)</label>
            <textarea id="report-details" value={details} onChange={event => setDetails(event.target.value)} maxLength={500} rows={3} placeholder="Share any helpful context" style={{ ...fieldStyle, resize: 'vertical' }} />
            <button type="submit" style={primaryButtonStyle}><Flag size={16} /> Submit report</button>
          </form>
        </section>

        <section style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', color: 'var(--color-primary)' }}><UserRoundX size={22} /><h2 style={{ color: 'var(--color-text-primary)', fontSize: '17px' }}>Blocked profiles</h2></div>
          {!blockedProfiles.length && <p style={helperStyle}>Profiles you block will appear here.</p>}
          {relationshipsError && <p role="alert" style={{ color: 'var(--color-error)', fontSize: 13 }}>{relationshipsError}</p>}
          {blockedProfiles.map(block => (
            <div key={block.id} style={blockRowStyle}>
              <span>{block.user.display_name}</span>
              <button type="button" onClick={() => toggleBlock(block.user.id, false)} style={secondaryButtonStyle}>Unblock</button>
            </div>
          ))}
          {selectedUser && !blockedProfiles.some(block => block.user.id === selectedUser.id) && (
            <button type="button" onClick={() => toggleBlock(selectedUser.id, true)} style={secondaryButtonStyle}>Block {selectedUser.display_name}</button>
          )}
        </section>

        <section style={cardStyle}>
          <h2 style={{ fontSize: '17px', marginBottom: '10px' }}>Your reports</h2>
          {!reports.length && <p style={helperStyle}>No reports submitted.</p>}
          {reports.map(report => (
            <div key={report.id} style={{ padding: '10px 0', borderTop: '1px solid var(--color-border-light)' }}>
              <strong style={{ fontSize: '14px' }}>{report.reported_user?.display_name}</strong>
              <p style={helperStyle}>{reasons.find(([value]) => value === report.reason)?.[1] || report.reason} · {new Date(report.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </section>
        <p style={helperStyle}>For urgent or real-world danger, contact local emergency services. Blocked profiles are hidden from discovery and messaging.</p>
        <Link to="/settings" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>Back to settings</Link>
        {message && <p role="status" style={{ color: 'var(--color-success)', fontSize: '13px', marginTop: '10px' }}>{message}</p>}
        {error && <p role="alert" style={{ color: 'var(--color-error)', fontSize: '13px', marginTop: '10px' }}>{error}</p>}
      </div>
    </>
  )
}

const cardStyle = { padding: 'var(--space-lg)', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', marginBottom: 'var(--space-md)' }
const helperStyle = { fontSize: '13px', lineHeight: 1.5, color: 'var(--color-text-secondary)', margin: '4px 0 12px' }
const labelStyle = { display: 'block', margin: '12px 0 6px', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' }
const fieldStyle = { width: '100%', padding: '12px 14px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg)', color: 'var(--color-text-primary)', font: 'inherit' }
const primaryButtonStyle = { width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '14px', padding: '13px', border: 'none', borderRadius: 'var(--radius-lg)', background: 'var(--color-primary)', color: 'white', font: 'inherit', fontWeight: 700, cursor: 'pointer' }
const secondaryButtonStyle = { padding: '8px 13px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-full)', background: 'transparent', color: 'var(--color-text-secondary)', font: 'inherit', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }
const blockRowStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--color-border-light)' }
