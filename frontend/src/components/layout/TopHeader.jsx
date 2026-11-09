import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CalendarDays, MapPin, Users, UserRound } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../utils/api'
import Avatar from '../common/Avatar'

export default function TopHeader() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [notificationCount, setNotificationCount] = useState(0)

  useEffect(() => {
    const loadNotificationCount = () => {
      api.get('/api/v1/notifications/unread-count/')
        .then(response => setNotificationCount(response.count || 0))
        .catch(error => console.error('Could not load notification count:', error))
    }
    loadNotificationCount()
    window.addEventListener('notifications:updated', loadNotificationCount)
    return () => window.removeEventListener('notifications:updated', loadNotificationCount)
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
          type="button"
          aria-label="Hangouts and services"
          onClick={() => navigate('/offers')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: 'var(--color-text-secondary)' }}
        >
          <Users size={21} />
        </button>
        <button
          type="button"
          aria-label={notificationCount ? `Notifications, ${notificationCount} total` : 'Notifications'}
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
          {notificationCount > 0 && <span style={{
            position: 'absolute',
            top: '1px',
            right: '0',
            minWidth: '18px',
            height: '18px',
            padding: '0 4px',
            boxSizing: 'border-box',
            borderRadius: '9px',
            background: 'var(--color-primary)',
            border: '2px solid var(--color-surface)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            fontWeight: 700,
            lineHeight: 1
          }}>{notificationCount}</span>}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar src={user?.avatar} alt={user?.display_name} size="sm" preview />
          <button
            type="button"
            aria-label="Open your profile"
            title="Open your profile"
            onClick={() => navigate('/profile')}
            style={{ display: 'grid', placeItems: 'center', width: 28, height: 32, padding: 0, border: 0, borderRadius: 'var(--radius-full)', background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
          >
            <UserRound size={17} />
          </button>
        </div>
      </div>
    </header>
  )
}
