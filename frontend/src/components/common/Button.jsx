import { classNames } from '../../utils/helpers'

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  className = '',
  ...props
}) {
  const variants = {
    primary: {
      background: 'var(--color-primary)',
      color: 'white',
      border: 'none'
    },
    secondary: {
      background: 'var(--color-primary-soft)',
      color: 'var(--color-primary)',
      border: 'none'
    },
    outline: {
      background: 'transparent',
      color: 'var(--color-primary)',
      border: '1.5px solid var(--color-primary)'
    },
    ghost: {
      background: 'transparent',
      color: 'var(--color-text-secondary)',
      border: 'none'
    },
    danger: {
      background: 'var(--color-error)',
      color: 'white',
      border: 'none'
    }
  }

  const sizes = {
    sm: { padding: '8px 14px', fontSize: '13px', borderRadius: 'var(--radius-sm)' },
    md: { padding: '12px 20px', fontSize: '14px', borderRadius: 'var(--radius-md)' },
    lg: { padding: '14px 28px', fontSize: '15px', borderRadius: 'var(--radius-lg)' }
  }

  const v = variants[variant]
  const s = sizes[size]

  return (
    <button
      className={classNames(className)}
      disabled={disabled || loading}
      style={{
        ...v,
        ...s,
        width: fullWidth ? '100%' : 'auto',
        fontFamily: 'var(--font-sans)',
        fontWeight: 600,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : loading ? 0.8 : 1,
        transition: 'all var(--transition-fast)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        position: 'relative',
        overflow: 'hidden'
      }}
      {...props}
    >
      {loading && (
        <span style={{
          width: '16px',
          height: '16px',
          border: '2px solid currentColor',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          display: 'inline-block'
        }} />
      )}
      {children}
    </button>
  )
}
