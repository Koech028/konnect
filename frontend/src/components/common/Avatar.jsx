import { getInitials } from '../../utils/helpers'
import ImagePreview from './ImagePreview'

export default function Avatar({ src, alt, size = 'md', className = '', preview = false }) {
  const sizeClasses = {
    xs: { width: '28px', height: '28px', fontSize: '10px' },
    sm: { width: '36px', height: '36px', fontSize: '12px' },
    md: { width: '44px', height: '44px', fontSize: '14px' },
    lg: { width: '56px', height: '56px', fontSize: '18px' },
    xl: { width: '72px', height: '72px', fontSize: '24px' },
    '2xl': { width: '96px', height: '96px', fontSize: '32px' }
  }

  const s = sizeClasses[size] || sizeClasses.md

  if (src) {
    const image = (
      <img
        src={src}
        alt={preview ? '' : alt || 'Avatar'}
        className={className}
        style={{
          width: s.width,
          height: s.height,
          borderRadius: '50%',
          objectFit: 'cover',
          border: '2px solid var(--color-surface)',
          boxShadow: 'var(--shadow-sm)',
          flexShrink: 0
        }}
        loading="lazy"
      />
    )
    return preview
      ? <ImagePreview src={src} alt={`${alt || 'Profile'} picture`} triggerStyle={{ borderRadius: '50%', flexShrink: 0 }}>{image}</ImagePreview>
      : image
  }

  return (
    <div
      className={className}
      style={{
        width: s.width,
        height: s.height,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 600,
        fontSize: s.fontSize,
        flexShrink: 0
      }}
    >
      {getInitials(alt)}
    </div>
  )
}
