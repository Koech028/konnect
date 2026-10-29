import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import FeedFilter from '../components/feed/FeedFilter'
import FeedPost from '../components/feed/FeedPost'
import DailyPromptCard from '../components/feed/DailyPromptCard'
import StoriesBar from '../components/feed/StoriesBar'
import { useAppData } from '../context/AppDataContext'
import { useAuth } from '../context/AuthContext'
import ProfileCompletionCard from '../components/profile/ProfileCompletionCard'

export default function FeedPage() {
  const [activeFilter, setActiveFilter] = useState('all')
  const { user } = useAuth()
  const { posts, likedUserIds, isLoadingRelationships, togglePostLike, togglePostInterest, votePoll, isLoadingPosts, postsError } = useAppData()
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
      <ProfileCompletionCard user={user} likedUserIds={likedUserIds} isLoadingRelationships={isLoadingRelationships} />
      <StoriesBar />
      <DailyPromptCard />
      <Link to="/shorts" style={shortsLinkStyle}>
        Explore quick video moments <span aria-hidden="true">→</span>
      </Link>
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
const shortsLinkStyle = { display: 'flex', justifyContent: 'space-between', padding: '14px 16px', marginBottom: 'var(--space-md)', borderRadius: 'var(--radius-lg)', background: 'var(--color-primary-soft)', color: 'var(--color-primary-dark)', textDecoration: 'none', fontSize: 14, fontWeight: 700 }
