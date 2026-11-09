import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import FeedFilter from '../components/feed/FeedFilter'
import FeedPost from '../components/feed/FeedPost'
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
      <section style={welcomeStyle}>
        <div>
          <h1 style={welcomeHeadingStyle}>Your feed</h1>
          <p style={welcomeTextStyle}>See what your community is sharing, then discover someone new.</p>
        </div>
        <Link to="/discover" style={discoverButtonStyle}>Discover people</Link>
      </section>
      <ProfileCompletionCard user={user} likedUserIds={likedUserIds} isLoadingRelationships={isLoadingRelationships} />
      <StoriesBar />
      <Link to="/shorts" style={shortsLinkStyle}>
        Explore quick video moments <span aria-hidden="true">→</span>
      </Link>
      <Link to="/offers" style={offersLinkStyle}>
        Browse hangouts and services <span aria-hidden="true">→</span>
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
const welcomeStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, padding: 'var(--space-lg)', marginBottom: 'var(--space-md)', borderRadius: 'var(--radius-lg)', background: 'linear-gradient(135deg, var(--color-primary-soft), var(--color-surface))' }
const welcomeHeadingStyle = { margin: 0, color: 'var(--color-text-primary)', fontSize: 21 }
const welcomeTextStyle = { margin: '5px 0 0', color: 'var(--color-text-secondary)', fontSize: 13, lineHeight: 1.5 }
const discoverButtonStyle = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '10px 14px', borderRadius: 'var(--radius-full)', background: 'var(--color-primary)', color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }
const shortsLinkStyle = { display: 'flex', justifyContent: 'space-between', padding: '14px 16px', marginBottom: 'var(--space-md)', borderRadius: 'var(--radius-lg)', background: 'var(--color-primary-soft)', color: 'var(--color-primary-dark)', textDecoration: 'none', fontSize: 14, fontWeight: 700 }
const offersLinkStyle = { ...shortsLinkStyle, background: 'var(--color-surface)', boxShadow: 'var(--shadow-sm)', color: 'var(--color-primary)' }
