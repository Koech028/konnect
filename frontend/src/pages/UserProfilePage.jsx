import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ProfileHeader from '../components/profile/ProfileHeader'
import FeedPost from '../components/feed/FeedPost'
import { useAppData } from '../context/AppDataContext'
import { api } from '../utils/api'

export default function UserProfilePage() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const {
    likedUserIds,
    toggleUserLike,
    togglePostLike,
    togglePostInterest,
    votePoll,
    getProfile,
    getPostsByAuthor
  } = useAppData()
  const [profile, setProfile] = useState(null)
  const [userPosts, setUserPosts] = useState([])
  const [match, setMatch] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const liked = likedUserIds.includes(userId)

  useEffect(() => {
    setProfile(null)
    setMatch(null)
    Promise.all([getProfile(userId), getPostsByAuthor(userId)])
      .then(async ([data, posts]) => {
        setProfile(data)
        setUserPosts(posts)
        const response = await api.get('/api/v1/matches/')
        const matches = response.results || response
        setMatch(matches.find(item => item.user.id === userId) || null)
      })
      .catch(err => setError(err.message || 'This profile is not available.'))
  }, [userId, getProfile, getPostsByAuthor])

  const likeProfile = async () => {
    try {
      const result = await toggleUserLike(userId)
      setMessage(result.is_match ? 'It is a match!' : liked ? 'Like removed.' : 'Like sent.')
    } catch (err) {
      setMessage(err.message || 'Could not update your like.')
    }
  }

  const openChat = () => {
    if (match) navigate(`/messages/${match.id}`)
    else setMessage('You can message this person after you match.')
  }

  if (error) {
    return (
      <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        {error}
        <div><Link to="/discover" style={{ color: 'var(--color-primary)' }}>Back to Discover</Link></div>
      </div>
    )
  }
  if (!profile) return <div role="status" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>Loading profile...</div>

  return (
    <div style={{ padding: 'var(--space-md)' }}>
      <ProfileHeader
        user={profile}
        liked={liked}
        onLike={likeProfile}
        onSafety={() => navigate(`/safety?userId=${encodeURIComponent(profile.id)}`)}
      />
      <button type="button" onClick={openChat} style={messageButtonStyle}>Message</button>
      {message && <p role="status" style={{ color: 'var(--color-text-secondary)', fontSize: '13px', margin: '10px 2px' }}>{message}</p>}
      <h2 style={{ fontSize: '18px', margin: '20px 2px 12px' }}>Recent posts</h2>
      {userPosts.length
        ? userPosts.map(post => (
            <FeedPost
              key={post.id}
              post={post}
              onLike={togglePostLike}
              onInterest={togglePostInterest}
              onPollVote={votePoll}
            />
          ))
        : <div style={emptyStyle}>No posts yet.</div>}
    </div>
  )
}

const messageButtonStyle = { width: '100%', padding: '13px', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-lg)', background: 'var(--color-primary-soft)', color: 'var(--color-primary)', font: 'inherit', fontWeight: 700, cursor: 'pointer' }
const emptyStyle = { padding: '24px', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', color: 'var(--color-text-secondary)', textAlign: 'center' }
