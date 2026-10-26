import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, Sparkles } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import Badge from '../components/common/Badge'
import { api } from '../utils/api'
import { useAuth } from '../context/AuthContext'

export default function PremiumPage() {
  const { user } = useAuth()
  const [status, setStatus] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/api/v1/premium/')
      .then(setStatus)
      .catch(err => setError(err.message || 'Premium status could not be loaded.'))
  }, [])

  return (
    <>
      <PageHeader title="LinkUp Premium" />
      <div style={{ padding: 'var(--space-md)' }}>
        <section style={cardStyle}>
          <div style={{ display: 'grid', placeItems: 'center', width: 58, height: 58, margin: '0 auto 12px', borderRadius: '50%', background: 'var(--color-secondary-soft)', color: 'var(--color-secondary)' }}><Sparkles size={27} /></div>
          <h2 style={{ textAlign: 'center', fontSize: 22 }}>A little more LinkUp</h2>
          <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginTop: 8 }}>
            Premium entitlements are being prepared. Premium status is granted by an administrator during this beta.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', margin: '18px 0' }}>
            <Badge variant={user?.subscription_tier === 'premium' ? 'premium' : 'outline'} size="md">
              {user?.subscription_tier === 'premium' ? '✦ Premium member' : 'Free plan'}
            </Badge>
          </div>
          <h3 style={{ fontSize: 15, marginBottom: 8 }}>Available premium benefit</h3>
          <ul style={{ paddingLeft: 22, color: 'var(--color-text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
            {(status?.benefits || ['Premium profile badge']).map(benefit => <li key={benefit}>{benefit}</li>)}
          </ul>
          <p style={noteStyle}>Payments, subscriptions, and automatic upgrades are not enabled. No charges will be made.</p>
          {user?.subscription_tier === 'premium' && <p style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, color: 'var(--color-success)', fontSize: 13 }}><BadgeCheck size={16} /> Premium is active on your account.</p>}
          <Link to="/settings" style={linkStyle}>Back to settings</Link>
        </section>
        {error && <p role="alert" style={{ color: 'var(--color-error)', fontSize: 13 }}>{error}</p>}
      </div>
    </>
  )
}

const cardStyle = { maxWidth: 520, margin: '0 auto', padding: 'var(--space-xl)', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-sm)' }
const noteStyle = { margin: '18px 0', padding: 12, borderRadius: 'var(--radius-md)', background: 'var(--color-bg)', color: 'var(--color-text-tertiary)', fontSize: 12, lineHeight: 1.5, textAlign: 'center' }
const linkStyle = { display: 'block', marginTop: 18, color: 'var(--color-primary)', textAlign: 'center', fontSize: 14, fontWeight: 600, textDecoration: 'none' }
