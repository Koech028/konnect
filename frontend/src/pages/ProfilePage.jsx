import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import ProfileHeader from '../components/profile/ProfileHeader'
import PhotoGrid from '../components/profile/PhotoGrid'
import FeedPost from '../components/feed/FeedPost'
import { useAppData } from '../context/AppDataContext'

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { togglePostLike, togglePostInterest, votePoll, getPostsByAuthor } = useAppData()
  const [userPosts, setUserPosts] = useState([])
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('posts')

  useEffect(() => {
    if (!user?.id) return
    getPostsByAuthor(user.id)
      .then(setUserPosts)
      .catch(err => setError(err.message || 'Your posts could not be loaded.'))
  }, [user?.id, getPostsByAuthor])

  const tabs = [
    { id: 'posts', label: 'Posts' },
    { id: 'photos', label: 'Photos' },
    { id: 'about', label: 'About' }
  ]

  return (
    <div style={{ paddingBottom: 'var(--space-xl)' }}>
      <ProfileHeader isOwnProfile onEdit={() => navigate('/profile/edit')} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', padding: '0 var(--space-md) var(--space-md)' }}>
        <ProfileAction to="/likes" label="Likes & matches" />
        <ProfileAction to="/settings" label="Settings" />
      </div>
      <Link to="/referrals" style={inviteLinkStyle}>
        <UserPlus size={19} />
        <span><strong>Invite friends</strong><small style={{ display: 'block', marginTop: 3, color: 'var(--color-text-secondary)', fontSize: 12 }}>Share your link and see who joins</small></span>
      </Link>

      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--color-border-light)',
        background: 'var(--color-surface)',
        marginBottom: 'var(--space-md)'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '14px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              borderBottom: activeTab === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent',
              transition: 'all var(--transition-fast)'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '0 var(--space-md)' }}>
        {activeTab === 'posts' && (
          <div>
            {error && <p role="alert" style={{ color: 'var(--color-error)' }}>{error}</p>}
            {!error && !userPosts.length && <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-secondary)', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)' }}>Your posts will appear here.</div>}
            {userPosts.map(post => (
              <FeedPost key={post.id} post={post} onLike={togglePostLike} onInterest={togglePostInterest} onPollVote={votePoll} />
            ))}
          </div>
        )}

        {activeTab === 'photos' && (
          <PhotoGrid photos={user?.photos || []} />
        )}

        {activeTab === 'about' && (
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-lg)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: 700,
              marginBottom: 'var(--space-md)',
              color: 'var(--color-text-primary)'
            }}>
              About Me
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div>
                <label style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'block',
                  marginBottom: '4px'
                }}>
                  Bio
                </label>
                <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                  {user?.bio || 'No bio yet'}
                </p>
              </div>
              <div>
                <label style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'block',
                  marginBottom: '4px'
                }}>
                  Location
                </label>
                <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)' }}>
                  {user?.location?.city}, {user?.location?.country}
                </p>
              </div>
              <div>
                <label style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'block',
                  marginBottom: '4px'
                }}>
                  Looking For
                </label>
                <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)' }}>
                  {user?.preferences?.interested_in?.join(', ')} · Ages {user?.preferences?.age_min}-{user?.preferences?.age_max}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                logout()
                navigate('/login')
              }}
              style={{
                width: '100%',
                marginTop: 'var(--space-xl)',
                padding: '14px',
                borderRadius: 'var(--radius-lg)',
                border: '1.5px solid var(--color-error)',
                background: 'transparent',
                color: 'var(--color-error)',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)'
              }}
            >
              Log Out
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ProfileAction({ to, label }) {
  return <Link to={to} style={{ padding: '12px', textAlign: 'center', textDecoration: 'none', color: 'var(--color-primary)', fontSize: '14px', fontWeight: 600, background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }}>{label}</Link>
}

const inviteLinkStyle = { display: 'flex', alignItems: 'center', gap: 12, margin: '0 var(--space-md) var(--space-md)', padding: 14, borderRadius: 'var(--radius-lg)', background: 'var(--color-primary-soft)', color: 'var(--color-primary)', textDecoration: 'none' }
