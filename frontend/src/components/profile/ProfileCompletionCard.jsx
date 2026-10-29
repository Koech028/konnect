import { Check, Compass, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function ProfileCompletionCard({ user, likedUserIds = [], isLoadingRelationships = false }) {
  const steps = [
    { label: 'Add a profile picture', complete: Boolean(user?.avatar) },
    { label: 'Add a short bio', complete: Boolean(user?.bio?.trim()) },
    { label: 'Choose a few interests', complete: Boolean(user?.interests?.length) },
    { label: 'Add your city', complete: Boolean(user?.location?.city?.trim()) }
  ]
  const completed = steps.filter(step => step.complete).length
  const hasLikedSomeone = !isLoadingRelationships && likedUserIds.length > 0

  if (completed === steps.length && hasLikedSomeone) return null

  return (
    <section aria-labelledby="profile-setup-title" style={cardStyle}>
      <div style={headingStyle}>
        <div style={iconStyle}><UserRound size={20} /></div>
        <div>
          <h2 id="profile-setup-title" style={titleStyle}>Make your first connection</h2>
          <p style={descriptionStyle}>A few details can help people get to know you. Everything here is optional.</p>
        </div>
      </div>

      <div style={progressTrackStyle} role="progressbar" aria-label="Profile setup progress" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={completed}>
        <div style={{ ...progressStyle, width: `${(completed / steps.length) * 100}%` }} />
      </div>
      <p style={progressLabelStyle}>{completed} of {steps.length} profile suggestions complete</p>

      <ul style={listStyle}>
        {steps.map(step => (
          <li key={step.label} style={stepStyle}>
            <span style={step.complete ? completeIconStyle : pendingIconStyle}>
              {step.complete ? <Check size={13} /> : null}
            </span>
            <span style={{ ...stepLabelStyle, color: step.complete ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)' }}>
              {step.label}
            </span>
            {!step.complete && <Link to="/profile/edit" style={editLinkStyle}>Add</Link>}
          </li>
        ))}
      </ul>

      {!hasLikedSomeone && (
        <Link to="/discover" style={discoverButtonStyle}>
          <Compass size={17} /> Explore people
        </Link>
      )}
      {hasLikedSomeone && (
        <p style={successNoteStyle}>Nice start! Keep exploring and connect at your own pace.</p>
      )}
    </section>
  )
}

const cardStyle = { padding: 'var(--space-md)', marginBottom: 'var(--space-md)', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-sm)' }
const headingStyle = { display: 'flex', alignItems: 'center', gap: 12 }
const iconStyle = { display: 'grid', flex: '0 0 auto', placeItems: 'center', width: 42, height: 42, borderRadius: '50%', background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }
const titleStyle = { margin: 0, color: 'var(--color-text-primary)', fontSize: 16, fontWeight: 700 }
const descriptionStyle = { margin: '4px 0 0', color: 'var(--color-text-secondary)', fontSize: 12, lineHeight: 1.4 }
const progressTrackStyle = { height: 6, marginTop: 16, overflow: 'hidden', borderRadius: 'var(--radius-full)', background: 'var(--color-border-light)' }
const progressStyle = { height: '100%', borderRadius: 'inherit', background: 'var(--color-primary)', transition: 'width var(--transition-fast)' }
const progressLabelStyle = { margin: '6px 0 10px', textAlign: 'right', color: 'var(--color-text-tertiary)', fontSize: 11 }
const listStyle = { display: 'grid', gap: 8, margin: 0, padding: 0, listStyle: 'none' }
const stepStyle = { display: 'flex', alignItems: 'center', gap: 9, minHeight: 24 }
const completeIconStyle = { display: 'grid', placeItems: 'center', width: 18, height: 18, borderRadius: '50%', background: 'var(--color-success)', color: 'white' }
const pendingIconStyle = { width: 16, height: 16, border: '1px solid var(--color-border)', borderRadius: '50%' }
const stepLabelStyle = { flex: 1, fontSize: 13 }
const editLinkStyle = { color: 'var(--color-primary)', fontSize: 12, fontWeight: 700, textDecoration: 'none' }
const discoverButtonStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', boxSizing: 'border-box', marginTop: 14, padding: 11, borderRadius: 'var(--radius-md)', background: 'var(--color-primary)', color: 'white', fontSize: 13, fontWeight: 700, textDecoration: 'none' }
const successNoteStyle = { margin: '14px 0 0', color: 'var(--color-success)', fontSize: 12 }
