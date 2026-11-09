import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { UserRound, X } from 'lucide-react'

export default function ProfileCompletionCard({ user }) {
  const [dismissed, setDismissed] = useState(() => (
    Boolean(user?.id && sessionStorage.getItem(`profile-setup-dismissed-${user.id}`))
  ))
  const steps = [
    Boolean(user?.avatar),
    Boolean(user?.bio?.trim()),
    Boolean(user?.interests?.length),
    Boolean(user?.location?.city?.trim())
  ]
  const completed = steps.filter(Boolean).length

  useEffect(() => {
    if (user?.id) {
      setDismissed(Boolean(sessionStorage.getItem(`profile-setup-dismissed-${user.id}`)))
    }
  }, [user?.id])

  useEffect(() => {
    if (dismissed) return undefined
    const closeOnEscape = event => {
      if (event.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [dismissed, user?.id])

  const dismiss = () => {
    if (user?.id) sessionStorage.setItem(`profile-setup-dismissed-${user.id}`, 'true')
    setDismissed(true)
  }

  if (dismissed || completed === steps.length) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-setup-title"
      onClick={dismiss}
      style={overlayStyle}
    >
      <section onClick={event => event.stopPropagation()} style={dialogStyle}>
        <button type="button" aria-label="Close setup reminder" onClick={dismiss} style={closeButtonStyle}>
          <X size={20} />
        </button>
        <div style={iconStyle}><UserRound size={25} /></div>
        <p style={eyebrowStyle}>PROFILE SETUP · {completed}/{steps.length}</p>
        <h2 id="profile-setup-title" style={titleStyle}>Complete your account setup</h2>
        <p style={descriptionStyle}>
          Add a few details to help people get to know you and make your experience more personal. You can finish setting up whenever you’re ready.
        </p>
        <div style={actionsStyle}>
          <Link to="/profile/edit" onClick={dismiss} style={primaryButtonStyle}>
            Complete account setup
          </Link>
          <button type="button" onClick={dismiss} style={laterButtonStyle}>Maybe later</button>
        </div>
        <p style={optionalStyle}>Adding profile details is optional.</p>
      </section>
    </div>,
    document.body
  )
}

const overlayStyle = { position: 'fixed', inset: 0, zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(17, 24, 39, 0.58)', backdropFilter: 'blur(4px)' }
const dialogStyle = { position: 'relative', width: '100%', maxWidth: 420, padding: '32px 24px 24px', borderRadius: 'var(--radius-xl, 20px)', background: 'var(--color-surface)', boxShadow: '0 24px 70px rgba(0,0,0,0.25)', textAlign: 'center' }
const closeButtonStyle = { position: 'absolute', top: 12, right: 12, width: 40, height: 40, display: 'grid', placeItems: 'center', border: 0, borderRadius: '50%', background: 'var(--color-bg)', color: 'var(--color-text-secondary)', cursor: 'pointer' }
const iconStyle = { width: 56, height: 56, margin: '0 auto 14px', display: 'grid', placeItems: 'center', borderRadius: '50%', background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }
const eyebrowStyle = { margin: '0 0 8px', color: 'var(--color-primary)', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em' }
const titleStyle = { margin: '0 0 10px', color: 'var(--color-text-primary)', fontSize: 22, lineHeight: 1.25 }
const descriptionStyle = { maxWidth: 340, margin: '0 auto 22px', color: 'var(--color-text-secondary)', fontSize: 14, lineHeight: 1.6 }
const actionsStyle = { display: 'grid', gap: 8 }
const primaryButtonStyle = { display: 'block', padding: '13px 16px', borderRadius: 'var(--radius-md)', background: 'var(--color-primary)', color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none' }
const laterButtonStyle = { padding: 12, border: 0, background: 'transparent', color: 'var(--color-text-secondary)', font: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const optionalStyle = { margin: '10px 0 0', color: 'var(--color-text-muted)', fontSize: 11 }
