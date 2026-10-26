export default function Skeleton({ width, height, circle = false, className = '' }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width: width || '100%',
        height: height || '16px',
        borderRadius: circle ? '50%' : 'var(--radius-sm)'
      }}
    />
  )
}
