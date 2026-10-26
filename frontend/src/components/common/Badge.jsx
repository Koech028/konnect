export default function Badge({ children, variant = 'default', size = 'sm' }) {
  const variants = {
    default: {
      background: 'var(--color-primary-soft)',
      color: 'var(--color-primary)'
    },
    verified: {
      background: 'var(--color-accent-soft)',
      color: 'var(--color-accent)'
    },
    premium: {
      background: 'linear-gradient(135deg, #FFD700, #FFA500)',
      color: '#1a1a1a'
    },
    outline: {
      background: 'transparent',
      color: 'var(--color-text-tertiary)',
      border: '1px solid var(--color-border)'
    }
  }

  const sizes = {
    sm: { padding: '2px 8px', fontSize: '11px' },
    md: { padding: '4px 12px', fontSize: '12px' }
  }

  const v = variants[variant]
  const s = sizes[size]

  return (
    <span style={{
      ...v,
      ...s,
      borderRadius: 'var(--radius-full)',
      fontWeight: 600,
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      letterSpacing: '0.3px'
    }}>
      {children}
    </span>
  )
}
