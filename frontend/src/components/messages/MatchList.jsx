import { useNavigate } from 'react-router-dom'
import { formatRelativeTime } from '../../utils/helpers'
import Avatar from '../common/Avatar'

export default function MatchList({ matches }) {
  const navigate = useNavigate()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {matches.map(match => (
        <button
          key={match.id}
          onClick={() => navigate(`/messages/${match.id}`)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '14px var(--space-md)',
            background: 'var(--color-surface)',
            border: 'none',
            borderBottom: '1px solid var(--color-border-light)',
            cursor: 'pointer',
            textAlign: 'left',
            width: '100%',
            transition: 'background var(--transition-fast)'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--color-border-light)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--color-surface)'}
        >
          <div style={{ position: 'relative' }}>
            <Avatar src={match.user.avatar} alt={match.user.display_name} size="lg" />
            {match.unread_count > 0 && (
              <span style={{
                position: 'absolute',
                bottom: '-2px',
                right: '-2px',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: 'var(--color-primary)',
                color: 'white',
                fontSize: '10px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid var(--color-surface)'
              }}>
                {match.unread_count}
              </span>
            )}
          </div>

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
      ))}
    </div>
  )
}
