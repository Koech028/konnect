import { useState } from 'react'
import { Flag } from 'lucide-react'
import { api } from '../../utils/api'

const reasons = [
  ['inappropriate', 'Inappropriate content'],
  ['spam', 'Spam or scam'],
  ['harassment', 'Harassment or abuse'],
  ['other', 'Other'],
]

export default function ReportContentButton({ shortId, commentId }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('inappropriate')
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const submit = async event => {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      await api.post('/api/v1/safety/content-reports/', {
        ...(shortId ? { short: shortId } : { comment: commentId }),
        reason,
        details: details.trim(),
      })
      setSubmitted(true)
      setOpen(false)
      setMessage('Thanks. Our moderation team will review this report.')
    } catch (error) {
      setMessage(error.message || 'The report could not be submitted.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={wrapperStyle}>
      <button
        type="button"
        disabled={submitted}
        onClick={() => setOpen(value => !value)}
        style={buttonStyle}
      >
        <Flag size={15} /> {submitted ? 'Reported' : 'Report'}
      </button>
      {open && (
        <form onSubmit={submit} style={formStyle}>
          <label style={labelStyle}>
            Reason
            <select value={reason} onChange={event => setReason(event.target.value)} style={fieldStyle}>
              {reasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label style={labelStyle}>
            Details (optional)
            <textarea value={details} onChange={event => setDetails(event.target.value)} maxLength={1000} rows={2} style={fieldStyle} />
          </label>
          <div style={actionsStyle}>
            <button type="button" onClick={() => setOpen(false)} style={cancelStyle}>Cancel</button>
            <button type="submit" disabled={busy} style={submitStyle}>{busy ? 'Sending…' : 'Send report'}</button>
          </div>
        </form>
      )}
      {message && <p role={submitted ? 'status' : 'alert'} style={messageStyle}>{message}</p>}
    </div>
  )
}

const wrapperStyle = { position: 'relative' }
const buttonStyle = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: 5, border: 0, background: 'transparent', color: 'var(--color-text-secondary)', font: 'inherit', fontSize: 12, cursor: 'pointer' }
const formStyle = { position: 'absolute', right: 0, bottom: '100%', zIndex: 5, display: 'grid', gap: 9, width: 'min(280px, 80vw)', padding: 12, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-md)' }
const labelStyle = { display: 'grid', gap: 4, color: 'var(--color-text-secondary)', fontSize: 11 }
const fieldStyle = { width: '100%', padding: 8, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: 'var(--color-bg)', color: 'var(--color-text-primary)', font: 'inherit', fontSize: 12 }
const actionsStyle = { display: 'flex', justifyContent: 'flex-end', gap: 8 }
const cancelStyle = { padding: '7px 9px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: 'transparent', color: 'var(--color-text-primary)', font: 'inherit', fontSize: 12, cursor: 'pointer' }
const submitStyle = { padding: '7px 9px', border: 0, borderRadius: 'var(--radius-sm)', background: 'var(--color-primary)', color: '#fff', font: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
const messageStyle = { margin: '4px 0', maxWidth: 260, color: 'var(--color-text-secondary)', fontSize: 11 }
