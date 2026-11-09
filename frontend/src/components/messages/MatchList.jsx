import { useNavigate } from 'react-router-dom'
import { formatRelativeTime } from '../../utils/helpers'
import Avatar from '../common/Avatar'

export default function MatchList({ matches }) {
  const navigate = useNavigate()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {matches.map(match => (
        <div key={match.id} style={rowStyle}>
          <div style={{ position: 'relative', flex: '0 0 auto' }}>
            <Avatar src={match.user.avatar} alt={match.user.display_name} size="lg" preview />
            {match.unread_count > 0 && <span style={unreadBadgeStyle}>{match.unread_count}</span>}
          </div>
          <button
            type="button"
            onClick={() => navigate(`/messages/${match.id}`)}
            style={conversationButtonStyle}
            onMouseEnter={event => { event.currentTarget.style.background = 'var(--color-border-light)' }}
            onMouseLeave={event => { event.currentTarget.style.background = 'transparent' }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px'
              }}>
                <h3 style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)'
                }}>
                  {match.user.display_name}
                </h3>
                <span style={{
                  fontSize: '12px',
                  color: 'var(--color-text-muted)',
                  flexShrink: 0
                }}>
                  {formatRelativeTime(match.last_message_at)}
                </span>
              </div>
              <p style={{
                fontSize: '14px',
                color: match.unread_count > 0 ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                fontWeight: match.unread_count > 0 ? 500 : 400,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {match.last_message?.text}
              </p>
            </div>
          </button>
        </div>
      ))}
    </div>
  )
}

const rowStyle = { display: 'flex', alignItems: 'center', gap: 14, padding: '10px var(--space-md)', borderBottom: '1px solid var(--color-border-light)', background: 'var(--color-surface)' }
const conversationButtonStyle = { display: 'flex', flex: 1, minWidth: 0, alignItems: 'center', padding: 8, border: 0, borderRadius: 'var(--radius-md)', background: 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'background var(--transition-fast)' }
const unreadBadgeStyle = { position: 'absolute', right: -2, bottom: -2, display: 'grid', placeItems: 'center', minWidth: 18, height: 18, padding: '0 4px', border: '2px solid var(--color-surface)', borderRadius: 10, background: 'var(--color-primary)', color: '#fff', fontSize: 10, fontWeight: 700 }
