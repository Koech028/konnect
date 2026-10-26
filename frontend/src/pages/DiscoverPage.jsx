import { useEffect, useState } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import ProfileCard from '../components/profile/ProfileCard'
import DiscoverFilters from '../components/discover/DiscoverFilters'
import { useAppData } from '../context/AppDataContext'

export default function DiscoverPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const { likedUserIds, toggleUserLike, searchProfiles } = useAppData()
  const [profiles, setProfiles] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({
    gender: 'Everyone',
    ageMin: 18,
    ageMax: 40,
    verifiedOnly: false
  })

  useEffect(() => {
    const query = {
      q: searchQuery,
      gender: filters.gender === 'Everyone' ? '' : filters.gender,
      age_min: filters.ageMin,
      age_max: filters.ageMax,
      verified: filters.verifiedOnly ? 'true' : ''
    }
    searchProfiles(query)
      .then(setProfiles)
      .catch(err => setError(err.message || 'Profiles could not be loaded.'))
      .finally(() => setIsLoading(false))
  }, [searchQuery, filters, searchProfiles])

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
        {!isLoading && !error && profiles.length === 0 && <p>No profiles match those filters.</p>}
        {profiles.map(user => (
          <ProfileCard
            key={user.id}
            user={user}
            liked={likedUserIds.includes(user.id)}
            onLike={userId => toggleUserLike(userId).catch(err => setError(err.message))}
          />
        ))}
      </div>

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
