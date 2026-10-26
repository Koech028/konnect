import { useState } from 'react'

export default function PhotoGrid({ photos, onPhotoClick }) {
  const [selectedPhoto, setSelectedPhoto] = useState(null)

  if (!photos || photos.length === 0) {
    return (
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-2xl)',
        textAlign: 'center',
        color: 'var(--color-text-muted)'
      }}>
        <p style={{ fontSize: '15px' }}>No photos yet</p>
      </div>
    )
  }

  return (
    <>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '4px',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden'
      }}>
        {photos.map((photo, index) => (
          <button
            key={index}
            onClick={() => setSelectedPhoto(photo)}
            style={{
              aspectRatio: '1',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              background: 'var(--color-border-light)',
              overflow: 'hidden'
            }}
          >
            <img
              src={photo}
              alt={`Photo ${index + 1}`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transition: 'transform var(--transition-base)'
              }}
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--space-lg)'
          }}
        >
          <img
            src={selectedPhoto}
            alt="Full size"
            style={{
              maxWidth: '100%',
              maxHeight: '90vh',
              borderRadius: 'var(--radius-lg)',
              objectFit: 'contain'
            }}
          />
        </div>
      )}
    </>
  )
}
