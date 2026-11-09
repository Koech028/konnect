import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Film, MapPin } from 'lucide-react'
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
      <section aria-label="Explore LinkUp" style={exploreGridStyle}>
        <ExploreCard
          to="/shorts"
          icon={Film}
          label="WATCH & DISCOVER"
          title="Quick video moments"
          description="See the latest moments from the community."
          accent="var(--color-primary)"
          tint="var(--color-primary-soft)"
        />
        <ExploreCard
          to="/offers"
          icon={MapPin}
          label="MAKE A PLAN"
          title="Hangouts & services"
          description="Find an activity or someone to meet."
          accent="#B85C24"
          tint="var(--color-secondary-soft)"
        />
      </section>
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

function ExploreCard({ to, icon: Icon, label, title, description, accent, tint }) {
  return (
    <Link
      to={to}
      style={{ ...exploreCardStyle, '--explore-accent': accent, '--explore-tint': tint }}
      onMouseEnter={event => {
        event.currentTarget.style.transform = 'translateY(-2px)'
        event.currentTarget.style.boxShadow = 'var(--shadow-md)'
      }}
      onMouseLeave={event => {
        event.currentTarget.style.transform = 'translateY(0)'
        event.currentTarget.style.boxShadow = 'var(--shadow-sm)'
      }}
    >
      <span style={exploreIconStyle}><Icon size={21} strokeWidth={2.2} /></span>
      <span style={exploreCopyStyle}>
        <span style={exploreLabelStyle}>{label}</span>
        <strong style={exploreTitleStyle}>{title}</strong>
        <span style={exploreDescriptionStyle}>{description}</span>
      </span>
      <span aria-hidden="true" style={exploreArrowStyle}><ArrowUpRight size={17} /></span>
    </Link>
  )
}

const emptyStyle = { padding: '24px', textAlign: 'center', color: 'var(--color-text-secondary)' }
const welcomeStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, padding: 'var(--space-lg)', marginBottom: 'var(--space-md)', borderRadius: 'var(--radius-lg)', background: 'linear-gradient(135deg, var(--color-primary-soft), var(--color-surface))' }
const welcomeHeadingStyle = { margin: 0, color: 'var(--color-text-primary)', fontSize: 21 }
const welcomeTextStyle = { margin: '5px 0 0', color: 'var(--color-text-secondary)', fontSize: 13, lineHeight: 1.5 }
const discoverButtonStyle = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '10px 14px', borderRadius: 'var(--radius-full)', background: 'var(--color-primary)', color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }
const exploreGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 12, marginBottom: 'var(--space-md)' }
const exploreCardStyle = { display: 'flex', alignItems: 'center', gap: 13, minWidth: 0, padding: '15px 14px', border: '1px solid var(--color-border-light)', borderRadius: 'var(--radius-lg)', background: 'linear-gradient(135deg, var(--explore-tint), var(--color-surface) 72%)', boxShadow: 'var(--shadow-sm)', color: 'var(--color-text-primary)', textDecoration: 'none', transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)' }
const exploreIconStyle = { display: 'grid', placeItems: 'center', width: 44, height: 44, flex: '0 0 auto', borderRadius: 14, background: 'var(--color-surface)', color: 'var(--explore-accent)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }
const exploreCopyStyle = { display: 'grid', gap: 3, minWidth: 0, flex: 1 }
const exploreLabelStyle = { color: 'var(--explore-accent)', fontSize: 9, fontWeight: 800, letterSpacing: '0.08em' }
const exploreTitleStyle = { overflow: 'hidden', color: 'var(--color-text-primary)', fontSize: 14, fontWeight: 750, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
const exploreDescriptionStyle = { color: 'var(--color-text-secondary)', fontSize: 11, lineHeight: 1.4 }
const exploreArrowStyle = { display: 'grid', placeItems: 'center', width: 30, height: 30, flex: '0 0 auto', borderRadius: '50%', background: 'var(--color-surface)', color: 'var(--explore-accent)' }
