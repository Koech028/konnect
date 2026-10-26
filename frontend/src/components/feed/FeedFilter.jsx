import { TrendingUp, MapPin, Clock } from 'lucide-react'

const filters = [
  { id: 'all', label: 'All', icon: Clock },
  { id: 'trending', label: 'Trending', icon: TrendingUp },
  { id: 'nearby', label: 'Nearby', icon: MapPin }
]

export default function FeedFilter({ activeFilter, onFilterChange }) {
  return (
    <div style={{
      position: 'sticky',
      top: 'var(--header-height)',
      zIndex: 50,
      background: 'var(--color-bg)',
      padding: 'var(--space-sm) var(--space-md)',
      borderBottom: '1px solid var(--color-border-light)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}>
        <style>{`
          div::-webkit-scrollbar { display: none; }
        `}</style>

        {filters.map(filter => {
          const Icon = filter.icon
          const isActive = activeFilter === filter.id
          return (
            <button
              key={filter.id}
              onClick={() => onFilterChange(filter.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: 'var(--radius-full)',
                border: 'none',
                background: isActive ? 'var(--color-primary)' : 'var(--color-surface)',
                color: isActive ? 'white' : 'var(--color-text-secondary)',
                fontSize: '13px',
                fontWeight: 600,
                fontFamily: 'var(--font-sans)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all var(--transition-fast)',
                boxShadow: isActive ? 'var(--shadow-sm)' : 'none'
              }}
            >
              <Icon size={14} />
              {filter.label}
            </button>
          )
        })}

      </div>
    </div>
  )
}
