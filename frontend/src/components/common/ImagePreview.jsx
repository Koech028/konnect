import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export default function ImagePreview({ src, alt, children, triggerStyle = {} }) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) return undefined
    const closeOnEscape = event => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isOpen])

  return (
    <>
      <button
        type="button"
        aria-label={`View ${alt || 'image'}`}
        onClick={event => {
          event.stopPropagation()
          setIsOpen(true)
        }}
        style={{
          display: 'block',
          border: 0,
          padding: 0,
          margin: 0,
          background: 'none',
          cursor: 'zoom-in',
          ...triggerStyle
        }}
      >
        {children || <img src={src} alt={alt || ''} style={{ display: 'block', maxWidth: '100%' }} />}
      </button>
      {isOpen && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Image preview: ${alt || 'image'}`}
          onClick={event => {
            event.stopPropagation()
            setIsOpen(false)
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: 'rgba(0, 0, 0, 0.9)'
          }}
        >
          <button
            type="button"
            autoFocus
            aria-label="Close image preview"
            onClick={event => {
              event.stopPropagation()
              setIsOpen(false)
            }}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              width: 44,
              height: 44,
              display: 'grid',
              placeItems: 'center',
              border: 0,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            <X size={22} />
          </button>
          <img
            src={src}
            alt={alt || ''}
            onClick={event => event.stopPropagation()}
            style={{
              maxWidth: 'min(100%, 1100px)',
              maxHeight: '90vh',
              objectFit: 'contain',
              borderRadius: 'var(--radius-md)'
            }}
          />
        </div>,
        document.body
      )}
    </>
  )
}
