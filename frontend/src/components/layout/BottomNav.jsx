import { useLocation, useNavigate } from 'react-router-dom'
import { Home, Search, MessageCircle, User, PlusCircle, Video, Film } from 'lucide-react'

const navItems = [
  { path: '/', icon: Home, label: 'Feed' },
  { path: '/discover', icon: Search, label: 'Discover' },
  { path: '/shorts', icon: Film, label: 'Shorts' },
  { path: '/live', icon: Video, label: 'Live' },
  { path: '/create', icon: PlusCircle, label: 'Post' },
  { path: '/messages', icon: MessageCircle, label: 'Messages' },
  { path: '/profile', icon: User, label: 'Profile' }
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: 'var(--bottom-nav-height)',
      background: 'var(--color-surface)',
      borderTop: '1px solid var(--color-border-light)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      padding: '0 var(--space-md)',
      zIndex: 100,
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)'
    }}>
      {navItems.map(item => {
        const active = isActive(item.path)
        const Icon = item.icon
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              padding: '8px 4px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
              transition: 'color var(--transition-fast)',
              position: 'relative'
            }}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 1.5} />
            <span style={{
              fontSize: '9px',
              fontWeight: active ? 600 : 500,
              letterSpacing: 0
            }}>
              {item.label}
            </span>
            {active && (
              <span style={{
                position: 'absolute',
                top: '-2px',
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                background: 'var(--color-primary)'
              }} />
            )}
          </button>
        )
      })}
    </nav>
  )
}
