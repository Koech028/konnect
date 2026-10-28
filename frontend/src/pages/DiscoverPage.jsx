import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, Search, SlidersHorizontal, X } from 'lucide-react'
import ProfileCard from '../components/profile/ProfileCard'
import DiscoverFilters from '../components/discover/DiscoverFilters'
import { useAppData } from '../context/AppDataContext'
import { useAuth } from '../context/AuthContext'

export default function DiscoverPage() {
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const { likedUserIds, toggleUserLike, searchProfiles } = useAppData()
  const [profiles, setProfiles] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [likingUserId, setLikingUserId] = useState(null)
  const [newMatch, setNewMatch] = useState(null)
  const [filters, setFilters] = useState({
    gender: 'Everyone',
    ageMin: 18,
    ageMax: 40,
    verifiedOnly: false,
    sharedInterestsOnly: false
  })

  useEffect(() => {
    let active = true
    const query = {
      q: searchQuery,
      gender: filters.gender,
      age_min: filters.ageMin,
      age_max: filters.ageMax,
      verified: filters.verifiedOnly ? 'true' : '',
      shared_interests: filters.sharedInterestsOnly ? 'true' : ''
    }
    setIsLoading(true)
    setError('')
    const timeout = window.setTimeout(() => {
      searchProfiles(query)
        .then(result => {
          if (active) setProfiles(result)
        })
        .catch(err => {
          if (active) setError(err.message || 'Profiles could not be loaded.')
        })
        .finally(() => {
          if (active) setIsLoading(false)
        })
    }, 250)
    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [searchQuery, filters, searchProfiles])

  const clearFilters = () => {
    setSearchQuery('')
    setFilters({
      gender: 'Everyone',
      ageMin: 18,
      ageMax: 70,
      verifiedOnly: false,
      sharedInterestsOnly: false
    })
  }

  const likeProfile = async profile => {
    if (likingUserId) return
    setLikingUserId(profile.id)
    setError('')
    try {
      const result = await toggleUserLike(profile.id)
      if (result.is_match && result.match) {
        const sharedInterests = (currentUser?.interests || []).filter(interest =>
          profile.interests?.some(item =>
            typeof item === 'string' && item.toLowerCase() === interest.toLowerCase()
          )
        )
        const starters = sharedInterests.length
          ? sharedInterests.slice(0, 3).map(interest => `I noticed we both enjoy ${interest}. What got you into it?`)
          : [
              `Hi ${profile.display_name}! What does a great weekend look like for you?`,
              'What is something you have been enjoying lately?',
              'If you could plan a relaxed first date, what would you choose?'
            ]
        setNewMatch({ match: result.match, starters })
      }
    } catch (err) {
      setError(err.message || 'Could not like this profile.')
    } finally {
      setLikingUserId(null)
    }
  }

  const openMatchChat = suggestedMessage => {
    if (!newMatch) return
    navigate(`/messages/${newMatch.match.id}`, {
      state: suggestedMessage ? { suggestedMessage } : undefined
    })
    setNewMatch(null)
  }

  return (
    <div>
      <div style={{
        padding: 'var(--space-md)',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border-light)',
        display: 'flex',
        gap: '10px',
        position: 'sticky',
        top: 'var(--header-height)',
        zIndex: 50
      }}>
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 16px',
          borderRadius: 'var(--radius-full)',
          background: 'var(--color-bg)',
          border: '1.5px solid var(--color-border)'
        }}>
          <Search size={18} color="var(--color-text-muted)" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or interest..."
            style={{
              flex: 1,
              border: 'none',
              background: 'none',
              outline: 'none',
              fontSize: '15px',
              fontFamily: 'var(--font-sans)',
              color: 'var(--color-text-primary)'
            }}
          />
        </div>
        <button
          type="button"
          aria-label="Open discovery filters"
          onClick={() => setShowFilters(true)}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            border: '1.5px solid var(--color-border)',
            background: 'var(--color-surface)',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <SlidersHorizontal size={20} />
        </button>
      </div>

      <div style={{
        padding: 'var(--space-md)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 'var(--space-md)'
      }}>
        {isLoading && <p role="status">Finding profiles...</p>}
        {error && <p role="alert" style={{ color: 'var(--color-error)' }}>{error}</p>}
        {!isLoading && !error && profiles.length === 0 && (
          <div style={emptyStateStyle}>
            <h2 style={{ margin: '0 0 8px', color: 'var(--color-text-primary)', fontSize: 18 }}>No profiles found</h2>
            <p style={{ margin: '0 auto 16px', maxWidth: 340 }}>
              Try a wider age range, turn off optional filters, or clear your search to see more people.
            </p>
            <button type="button" onClick={clearFilters} style={clearFiltersStyle}>Show more people</button>
          </div>
        )}
        {profiles.map(user => (
          <ProfileCard
            key={user.id}
            user={user}
            liked={likedUserIds.includes(user.id)}
            liking={likingUserId === user.id}
            onLike={() => likeProfile(user)}
          />
        ))}
      </div>

      {newMatch && (
        <div
          role="presentation"
          onClick={event => {
            if (event.target === event.currentTarget) setNewMatch(null)
          }}
          style={matchOverlayStyle}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="match-title" style={matchDialogStyle}>
            <button type="button" aria-label="Close match dialog" onClick={() => setNewMatch(null)} style={closeMatchStyle}>
              <X size={20} />
            </button>
            <div style={matchIconStyle}><Heart size={30} fill="currentColor" /></div>
            <h2 id="match-title" style={{ margin: '0 0 6px', fontSize: 24 }}>It’s a match!</h2>
            <p style={{ margin: '0 0 18px', color: 'var(--color-text-secondary)' }}>
              You and {newMatch.match.user.display_name} like each other. Start with a friendly hello.
            </p>
            <div style={{ display: 'grid', gap: 8 }}>
              {newMatch.starters.map(starter => (
                <button key={starter} type="button" onClick={() => openMatchChat(starter)} style={matchStarterStyle}>
                  {starter}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => openMatchChat()} style={matchChatStyle}>Open conversation</button>
            <p style={{ margin: '10px 0 0', color: 'var(--color-text-muted)', fontSize: 12 }}>
              Suggestions open as drafts. Review or edit before sending.
            </p>
          </section>
        </div>
      )}

      {showFilters && (
        <DiscoverFilters
          filters={filters}
          onChange={setFilters}
          onClose={() => setShowFilters(false)}
        />
      )}
    </div>
  )
}

const emptyStateStyle = { gridColumn: '1 / -1', padding: '30px 18px', textAlign: 'center', color: 'var(--color-text-secondary)' }
const clearFiltersStyle = { padding: '11px 18px', border: 0, borderRadius: 'var(--radius-full)', background: 'var(--color-primary)', color: '#fff', font: 'inherit', fontWeight: 700, cursor: 'pointer' }
const matchOverlayStyle = { position: 'fixed', inset: 0, zIndex: 300, display: 'grid', placeItems: 'center', padding: 20, background: 'rgba(0,0,0,.55)' }
const matchDialogStyle = { position: 'relative', width: 'min(100%, 440px)', padding: '28px 22px 22px', borderRadius: 'var(--radius-xl)', background: 'var(--color-surface)', textAlign: 'center', boxShadow: 'var(--shadow-xl)' }
const closeMatchStyle = { position: 'absolute', top: 12, right: 12, display: 'grid', placeItems: 'center', width: 36, height: 36, border: 0, borderRadius: '50%', background: 'var(--color-bg)', color: 'var(--color-text-secondary)', cursor: 'pointer' }
const matchIconStyle = { display: 'grid', placeItems: 'center', width: 62, height: 62, margin: '0 auto 14px', borderRadius: '50%', background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }
const matchStarterStyle = { padding: '12px 14px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg)', color: 'var(--color-text-primary)', font: 'inherit', fontSize: 14, textAlign: 'left', cursor: 'pointer' }
const matchChatStyle = { width: '100%', marginTop: 14, padding: 13, border: 0, borderRadius: 'var(--radius-md)', background: 'var(--color-primary)', color: '#fff', font: 'inherit', fontWeight: 700, cursor: 'pointer' }
