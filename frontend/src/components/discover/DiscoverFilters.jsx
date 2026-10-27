import { useState } from 'react'
import { X } from 'lucide-react'

export default function DiscoverFilters({ filters, onChange, onClose }) {
  const [localFilters, setLocalFilters] = useState(filters)

  const handleApply = () => {
    onChange?.(localFilters)
    onClose?.()
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      zIndex: 200,
      display: 'flex',
      alignItems: 'flex-end'
    }}>
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
        width: '100%',
        maxHeight: '85vh',
        overflow: 'auto'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-lg) var(--space-lg) var(--space-md)',
          borderBottom: '1px solid var(--color-border-light)',
          position: 'sticky',
          top: 0,
          background: 'var(--color-surface)'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--color-text-primary)'
          }}>
            Filters
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
              padding: '8px'
            }}
          >
            <X size={24} />
          </button>
        </div>

        <div style={{ padding: 'var(--space-lg)' }}>
          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <label style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
              display: 'block',
              marginBottom: '12px'
            }}>
              Interested In
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {['Women', 'Men', 'Non-binary', 'Everyone'].map(gender => (
                <button
                  key={gender}
                  onClick={() => setLocalFilters(prev => ({ ...prev, gender }))}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 'var(--radius-full)',
                    border: localFilters.gender === gender ? '2px solid var(--color-primary)' : '1.5px solid var(--color-border)',
                    background: localFilters.gender === gender ? 'var(--color-primary-soft)' : 'var(--color-surface)',
                    color: localFilters.gender === gender ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)'
                  }}
                >
                  {gender}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <label style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
              display: 'block',
              marginBottom: '12px'
            }}>
              Age Range: {localFilters.ageMin} - {localFilters.ageMax}
            </label>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <input
                type="range"
                min={18}
                max={70}
                value={localFilters.ageMin}
                onChange={(e) => setLocalFilters(prev => ({ ...prev, ageMin: parseInt(e.target.value) }))}
                style={{ flex: 1 }}
              />
              <input
                type="range"
                min={18}
                max={70}
                value={localFilters.ageMax}
                onChange={(e) => setLocalFilters(prev => ({ ...prev, ageMax: parseInt(e.target.value) }))}
                style={{ flex: 1 }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={localFilters.verifiedOnly}
                onChange={(e) => setLocalFilters(prev => ({ ...prev, verifiedOnly: e.target.checked }))}
                style={{ width: '20px', height: '20px', accentColor: 'var(--color-primary)' }}
              />
              <span style={{
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--color-text-primary)'
              }}>
                Verified profiles only
              </span>
            </label>
          </div>

          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={!!localFilters.sharedInterestsOnly}
                onChange={(e) => setLocalFilters(prev => ({ ...prev, sharedInterestsOnly: e.target.checked }))}
                style={{ width: '20px', height: '20px', accentColor: 'var(--color-primary)' }}
              />
              <span style={{
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--color-text-primary)'
              }}>
                Only show people who share my interests
              </span>
            </label>
          </div>
        </div>

        <div style={{
          padding: 'var(--space-md) var(--space-lg) calc(var(--space-lg) + env(safe-area-inset-bottom))',
          borderTop: '1px solid var(--color-border-light)'
        }}>
          <button
            onClick={handleApply}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 'var(--radius-lg)',
              border: 'none',
              background: 'var(--color-primary)',
              color: 'white',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)'
            }}
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  )
}
