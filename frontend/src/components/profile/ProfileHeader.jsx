import { MapPin, Edit3, Camera, Flag } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import Avatar from '../common/Avatar'
import Badge from '../common/Badge'

export default function ProfileHeader({ user, isOwnProfile = false, onEdit, onLike, liked = false, onSafety }) {
  const { user: currentUser } = useAuth()
  const navigate = useNavigate()
  const profileUser = user || currentUser

  if (!profileUser) return null

  return (
    <div style={{
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)',
      marginBottom: 'var(--space-md)'
    }}>
      {/* Cover */}
      <div style={{
        height: '160px',
        background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
        position: 'relative'
      }}>
        {profileUser.photos && profileUser.photos[0] && (
          <img
            src={profileUser.photos[0]}
            alt="Cover"
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.3 }}
          />
        )}
        {isOwnProfile && (
          <button onClick={() => navigate('/profile/edit')} aria-label="Edit profile photos" style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(10px)',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Camera size={18} />
          </button>
        )}
      </div>

      {/* Avatar & Actions */}
      <div style={{
        position: 'relative',
        padding: '0 var(--space-lg)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginTop: '-48px'
      }}>
        <div style={{
          borderRadius: '50%',
          padding: '4px',
          background: 'var(--color-surface)'
        }}>
          <Avatar src={profileUser.avatar} alt={profileUser.display_name} size="2xl" />
        </div>

        {isOwnProfile ? (
          <button
            onClick={onEdit}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 20px',
              borderRadius: 'var(--radius-full)',
              border: '1.5px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              marginBottom: '8px'
            }}
          >
            <Edit3 size={16} />
            Edit Profile
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <button onClick={onLike} style={{
              padding: '10px 20px',
              borderRadius: 'var(--radius-full)',
              border: 'none',
              background: liked ? 'var(--color-primary-soft)' : 'var(--color-primary)',
              color: liked ? 'var(--color-primary)' : 'white',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)'
            }}>
              {liked ? 'Liked' : 'Like Profile'}
            </button>
            <button onClick={onSafety} aria-label="Report or block this profile" style={{
              padding: '10px',
              borderRadius: '50%',
              border: '1.5px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Flag size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: 'var(--space-md) var(--space-lg) var(--space-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <h1 style={{
            fontSize: '22px',
            fontWeight: 700,
            color: 'var(--color-text-primary)'
          }}>
            {profileUser.display_name}, {profileUser.age}
          </h1>
          {profileUser.verification_status === 'verified' && (
            <Badge variant="verified" size="md">
              <span style={{ fontSize: '11px' }}>✓</span> Verified
            </Badge>
          )}
          {profileUser.subscription_tier === 'premium' && (
            <Badge variant="premium" size="md">✦ Premium</Badge>
          )}
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '14px',
          color: 'var(--color-text-tertiary)',
          marginBottom: '12px'
        }}>
          <MapPin size={14} />
          {profileUser.location?.city}, {profileUser.location?.country}
        </div>

        <p style={{
          fontSize: '15px',
          color: 'var(--color-text-secondary)',
          lineHeight: 1.6,
          marginBottom: '16px'
        }}>
          {profileUser.bio}
        </p>

        {profileUser.interests && profileUser.interests.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {profileUser.interests.map(interest => (
              <span key={interest} style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--color-primary-soft)',
                color: 'var(--color-primary)',
                fontSize: '13px',
                fontWeight: 600,
                textTransform: 'capitalize'
              }}>
                {interest}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
