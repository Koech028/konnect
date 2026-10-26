import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CalendarDays, MapPin } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../utils/api'
import Avatar from '../common/Avatar'

export default function TopHeader() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [hasUnread, setHasUnread] = useState(false)

  useEffect(() => {
    api.get('/api/v1/notifications/')
      .then(response => setHasUnread((response.results || response).some(notification => !notification.read)))
      .catch(error => console.error('Could not load unread notification status:', error))
  }, [])

  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: 'var(--header-height)',
      background: 'var(--color-surface)',
      borderBottom: '1px solid var(--color-border-light)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 var(--space-lg)',
      zIndex: 100,
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '22px',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          letterSpacing: '-0.5px'
        }}>
          LinkUp
        </h1>
        <span style={{
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
          fontSize: '12px',
          color: 'var(--color-text-muted)',
          fontWeight: 500
        }}>
          <MapPin size={13} />
          {user?.location?.city || 'Your city'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          type="button"
          aria-label="Events"
          onClick={() => navigate('/events')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: 'var(--color-text-secondary)' }}
        >
          <CalendarDays size={21} />
        </button>
        <button
          onClick={() => navigate('/notifications')}
          style={{
            position: 'relative',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '50%',
            color: 'var(--color-text-secondary)',
            transition: 'background var(--transition-fast)'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--color-border-light)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <Bell size={22} />
          {hasUnread && <span style={{
            position: 'absolute',
            top: '6px',
            right: '6px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'var(--color-primary)',
            border: '2px solid var(--color-surface)'
          }} />}
        </button>
        <button
          onClick={() => navigate('/profile')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <Avatar src={user?.avatar} alt={user?.display_name} size="sm" />
        </button>
      </div>
    </header>
  )
}
