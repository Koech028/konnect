import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Bell, Heart, MessageCircle, UserPlus, ThumbsUp, MessageSquare } from 'lucide-react'
import { formatRelativeTime } from '../utils/helpers'
import { api } from '../utils/api'

const iconMap = {
  match: UserPlus,
  message: MessageCircle,
  interest: Heart,
  post_interaction: ThumbsUp,
  comment: MessageSquare
}

const colorMap = {
  match: 'var(--color-primary)',
  message: 'var(--color-accent)',
  interest: 'var(--color-secondary)',
  post_interaction: 'var(--color-primary)',
  comment: 'var(--color-info)'
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/api/v1/notifications/')
      .then(response => setNotifications(response.results || response))
      .catch(err => setError(err.message || 'Notifications could not be loaded.'))
  }, [])

  const markRead = async notification => {
    if (notification.read) {
      if (notification.target_type === 'match') navigate(`/messages/${notification.target_id}`)
      if (notification.target_type === 'post') navigate(`/posts/${notification.target_id}`)
      if (notification.target_type === 'profile') navigate(`/users/${notification.target_id}`)
      return
    }
    try {
      const updated = await api.post(`/api/v1/notifications/${notification.id}/read/`, {})
      setNotifications(current => current.map(item => item.id === updated.id ? updated : item))
      if (updated.target_type === 'match') navigate(`/messages/${updated.target_id}`)
      if (updated.target_type === 'post') navigate(`/posts/${updated.target_id}`)
      if (updated.target_type === 'profile') navigate(`/users/${updated.target_id}`)
    } catch (err) {
      setError(err.message || 'Could not update notification.')
    }
  }

  const markAllRead = async () => {
    try {
      await api.post('/api/v1/notifications/read-all/', {})
      setNotifications(current => current.map(item => ({ ...item, read: true })))
      setError('')
    } catch (err) {
      setError(err.message || 'Could not mark notifications as read.')
    }
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: 'var(--space-md)',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border-light)',
        position: 'sticky',
        top: 'var(--header-height)',
        zIndex: 50
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-text-secondary)',
            padding: '8px'
          }}
        >
          <ArrowLeft size={22} />
        </button>
        <h1 style={{
          fontSize: '20px',
          fontWeight: 700,
          color: 'var(--color-text-primary)'
        }}>
          Notifications
        </h1>
        <button type="button" onClick={markAllRead} style={{ marginLeft: 'auto', border: 0, background: 'none', color: 'var(--color-primary)', font: 'inherit', fontSize: 13, fontWeight: 600 }}>Mark all read</button>
      </div>

      <div>
        {error && <p role="alert" style={{ padding: 'var(--space-md)', color: 'var(--color-error)' }}>{error}</p>}
        {!error && notifications.length === 0 && <p style={{ padding: 'var(--space-md)', color: 'var(--color-text-secondary)' }}>You are all caught up.</p>}
        {notifications.map(notif => {
          const Icon = iconMap[notif.type] || Bell
          const color = colorMap[notif.type] || 'var(--color-primary)'

          return (
            <div
              key={notif.id}
              onClick={() => markRead(notif)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
                padding: 'var(--space-md)',
                background: notif.read ? 'var(--color-surface)' : 'var(--color-primary-soft)',
                borderBottom: '1px solid var(--color-border-light)',
                cursor: 'pointer',
                transition: 'background var(--transition-fast)'
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: color + '20',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: color,
                flexShrink: 0
              }}>
                <Icon size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{
                  fontSize: '15px',
                  color: 'var(--color-text-primary)',
                  fontWeight: notif.read ? 400 : 600,
                  lineHeight: 1.4,
                  marginBottom: '4px'
                }}>
                  {notif.body}
                </p>
                <span style={{
                  fontSize: '12px',
                  color: 'var(--color-text-muted)'
                }}>
                  {formatRelativeTime(notif.created_at)}
                </span>
              </div>
              {!notif.read && (
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'var(--color-primary)',
                  flexShrink: 0,
                  marginTop: '6px'
                }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
