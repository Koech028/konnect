import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function PageHeader({ title, subtitle, action, backTo }) {
  const navigate = useNavigate()

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: 'var(--space-md)',
      background: 'var(--color-surface)',
      borderBottom: '1px solid var(--color-border-light)',
      position: 'sticky',
      top: 'var(--header-height)',
      zIndex: 40
    }}>
      <button
        type="button"
        onClick={() => backTo ? navigate(backTo) : navigate(-1)}
        aria-label="Go back"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: '8px' }}
      >
        <ArrowLeft size={22} />
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{title}</h1>
        {subtitle && <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
