import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import FeedFilter from '../components/feed/FeedFilter'
import FeedPost from '../components/feed/FeedPost'
import { useAppData } from '../context/AppDataContext'
import { useAuth } from '../context/AuthContext'

export default function FeedPage() {
  const [activeFilter, setActiveFilter] = useState('all')
  const { user } = useAuth()
  const { posts, togglePostLike, togglePostInterest, votePoll, isLoadingPosts, postsError } = useAppData()
  const visiblePosts = useMemo(() => {
    if (activeFilter === 'trending') {
      return [...posts].sort((a, b) => (b.engagement?.likes_count || 0) - (a.engagement?.likes_count || 0))
    }
    if (activeFilter === 'nearby') {
      const city = user?.location?.city?.toLowerCase()
      return city ? posts.filter(post => post.author?.location?.city?.toLowerCase() === city) : []
    }
    return posts
  }, [activeFilter, posts, user?.location?.city])

  return (
    <div style={{ padding: 'var(--space-md)' }}>
      <Link to="/create" style={{ display: 'block', padding: '16px', marginBottom: 'var(--space-md)', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', color: 'var(--color-text-secondary)', textDecoration: 'none', fontSize: '15px' }}>
        Share a moment, create a poll, or post an event...
      </Link>
      <FeedFilter activeFilter={activeFilter} onFilterChange={setActiveFilter} />
      <div style={{ marginTop: 'var(--space-md)' }}>
        {isLoadingPosts && <p role="status" style={emptyStyle}>Loading posts...</p>}
        {postsError && <p role="alert" style={{ ...emptyStyle, color: 'var(--color-error)' }}>{postsError}</p>}
        {!isLoadingPosts && !postsError && posts.length === 0 && <p style={emptyStyle}>No posts yet. Share the first moment.</p>}
        {visiblePosts.map(post => <FeedPost key={post.id} post={post} onLike={togglePostLike} onInterest={togglePostInterest} onPollVote={votePoll} />)}
      </div>
    </div>
  )
}

const emptyStyle = { padding: '24px', textAlign: 'center', color: 'var(--color-text-secondary)' }
