import { MapPin, Heart } from 'lucide-react'
import Avatar from '../common/Avatar'
import Badge from '../common/Badge'
import { useNavigate } from 'react-router-dom'

export default function ProfileCard({ user, onLike, liked }) {
  const navigate = useNavigate()

  return (
    <div style={{
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)',
      position: 'relative',
      cursor: 'pointer',
      transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)'
    }}
    onClick={() => navigate(`/users/${user.id}`)}
    onMouseEnter={e => {
      e.currentTarget.style.transform = 'translateY(-4px)'
      e.currentTarget.style.boxShadow = 'var(--shadow-md)'
    }}
    onMouseLeave={e => {
      e.currentTarget.style.transform = 'translateY(0)'
      e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
    }}
    >
      {/* Cover Photo */}
      <div style={{
        height: '140px',
        background: 'linear-gradient(135deg, var(--color-primary-soft), var(--color-secondary-soft))',
        position: 'relative'
      }}>
        <img
          src={user.photos[0]}
          alt={user.display_name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
          loading="lazy"
        />
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '60px',
          background: 'linear-gradient(transparent, rgba(0,0,0,0.4))'
        }} />
      </div>

      {/* Avatar */}
      <div style={{
        position: 'relative',
        marginTop: '-32px',
        padding: '0 var(--space-md)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end'
      }}>
        <div style={{
          borderRadius: '50%',
          padding: '3px',
          background: 'var(--color-surface)'
        }}>
          <Avatar src={user.avatar} alt={user.display_name} size="lg" />
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onLike?.(user.id)
          }}
          aria-label={liked ? `Unlike ${user.display_name}` : `Like ${user.display_name}`}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: 'none',
            background: liked ? 'var(--color-primary)' : 'var(--color-border-light)',
            color: liked ? 'white' : 'var(--color-text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all var(--transition-fast)',
            marginBottom: '8px'
          }}
        >
          <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Info */}
      <div style={{ padding: 'var(--space-sm) var(--space-md) var(--space-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <h3 style={{
            fontSize: '17px',
            fontWeight: 700,
            color: 'var(--color-text-primary)'
          }}>
            {user.display_name}, {user.age}
          </h3>
          {user.verification_status === 'verified' && (
            <Badge variant="verified" size="sm">
              <span style={{ fontSize: '10px' }}>✓</span> Verified
            </Badge>
          )}
          {user.subscription_tier === 'premium' && <Badge variant="premium" size="sm">✦ Premium</Badge>}
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '13px',
          color: 'var(--color-text-tertiary)',
          marginBottom: '8px'
        }}>
          <MapPin size={13} />
          {user.location.city}
        </div>

        <p style={{
          fontSize: '14px',
          color: 'var(--color-text-secondary)',
          lineHeight: 1.5,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {user.bio}
        </p>

        {user.interests && user.interests.length > 0 && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            marginTop: '12px'
          }}>
            {user.interests.slice(0, 3).map(interest => (
              <span key={interest} style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--color-border-light)',
                color: 'var(--color-text-secondary)',
                fontSize: '12px',
                fontWeight: 500,
                textTransform: 'capitalize'
              }}>
                {interest}
              </span>
            ))}
            {user.interests.length > 3 && (
              <span style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--color-border-light)',
                color: 'var(--color-text-muted)',
                fontSize: '12px',
                fontWeight: 500
              }}>
                +{user.interests.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
