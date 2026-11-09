import { useEffect, useRef, useState } from 'react'
import { Heart, MoreVertical, Share2, Trash2 } from 'lucide-react'
import { api } from '../../utils/api'

export default function ProfileShorts({ userId }) {
  const [shorts, setShorts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openMenuId, setOpenMenuId] = useState('')
  const menuRef = useRef(null)

  const loadShorts = async () => {
    try {
      const result = await api.get('/api/v1/shorts/')
      setShorts(result.filter(short => short.author_id === userId))
      setError('')
    } catch (err) {
      setError(err.message || 'Your videos could not be loaded.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadShorts()
  }, [userId])

  useEffect(() => {
    if (!openMenuId) return undefined
    const closeOnOutsideClick = event => {
      if (!menuRef.current?.contains(event.target)) setOpenMenuId('')
    }
    const closeOnEscape = event => {
      if (event.key === 'Escape') setOpenMenuId('')
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [openMenuId])

  const toggleLike = async short => {
    setError('')
    try {
      const result = await api.post(`/api/v1/shorts/${short.id}/like/`, {})
      setShorts(current => current.map(item => item.id === short.id
        ? { ...item, liked_by_me: result.liked, likes_count: result.likes_count }
        : item))
    } catch (err) {
      setError(err.message || 'Your reaction could not be saved.')
    }
  }

  const shareShort = async short => {
    const url = `${window.location.origin}/shorts`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'LinkUp Short', text: short.caption, url })
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
      } else {
        throw new Error('Sharing is not supported by this browser.')
      }
      setOpenMenuId('')
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message || 'This video could not be shared.')
    }
  }

  const deleteShort = async short => {
    setOpenMenuId('')
    if (!window.confirm('Delete this video? This cannot be undone.')) return
    setError('')
    try {
      await api.delete(`/api/v1/shorts/${short.id}/`)
      setShorts(current => current.filter(item => item.id !== short.id))
    } catch (err) {
      setError(err.message || 'This video could not be deleted.')
    }
  }

  if (loading) return <p role="status" style={messageStyle}>Loading your videos…</p>
  if (error && !shorts.length) return <p role="alert" style={errorStyle}>{error}</p>
  if (!shorts.length) return <p style={messageStyle}>Your videos will appear here.</p>

  return (
    <div>
      {error && <p role="alert" style={errorStyle}>{error}</p>}
      <div style={gridStyle}>
        {shorts.map(short => (
          <article key={short.id} style={cardStyle}>
            <video src={short.video_url} controls playsInline preload="metadata" style={videoStyle} />
            <div style={detailsStyle}>
              <p style={captionStyle}>{short.caption || 'Your video'}</p>
              <span style={viewsStyle}>{short.views_count} views</span>
            </div>
            <div ref={openMenuId === short.id ? menuRef : null} style={menuWrapStyle}>
              <button
                type="button"
                aria-label={`More actions for ${short.caption || 'your video'}`}
                aria-haspopup="menu"
                aria-expanded={openMenuId === short.id}
                onClick={() => setOpenMenuId(current => current === short.id ? '' : short.id)}
                style={menuTriggerStyle}
              >
                <MoreVertical size={19} />
              </button>
              {openMenuId === short.id && (
                <div role="menu" style={menuStyle}>
                  <button type="button" role="menuitem" onClick={() => shareShort(short)} style={menuItemStyle}>
                    <Share2 size={16} /> Share
                  </button>
                  <button type="button" role="menuitem" onClick={() => toggleLike(short)} style={menuItemStyle}>
                    <Heart size={16} fill={short.liked_by_me ? 'currentColor' : 'none'} />
                    {short.liked_by_me ? 'Unlike' : 'Like'} · {short.likes_count}
                  </button>
                  <button type="button" role="menuitem" onClick={() => deleteShort(short)} style={{ ...menuItemStyle, color: 'var(--color-error)' }}>
                    <Trash2 size={16} /> Delete video
                  </button>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 220px), 1fr))', gap: 12 }
const cardStyle = { position: 'relative', minWidth: 0, borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-sm)' }
const videoStyle = { display: 'block', width: '100%', maxHeight: 420, aspectRatio: '9 / 16', objectFit: 'cover', background: '#090909', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }
const detailsStyle = { padding: 12, paddingRight: 48, borderRadius: '0 0 var(--radius-lg) var(--radius-lg)' }
const captionStyle = { margin: '0 0 6px', overflow: 'hidden', color: 'var(--color-text-primary)', fontSize: 13, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
const viewsStyle = { color: 'var(--color-text-secondary)', fontSize: 11 }
const menuWrapStyle = { position: 'absolute', right: 8, bottom: 8 }
const menuTriggerStyle = { display: 'grid', placeItems: 'center', width: 40, height: 40, border: '1px solid var(--color-border-light)', borderRadius: '50%', background: 'var(--color-surface)', color: 'var(--color-text-primary)', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }
const menuStyle = { position: 'absolute', right: 0, bottom: 46, zIndex: 5, display: 'grid', minWidth: 170, padding: 5, border: '1px solid var(--color-border-light)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-lg)' }
const menuItemStyle = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: 0, borderRadius: 'var(--radius-sm)', background: 'transparent', color: 'var(--color-text-primary)', font: 'inherit', fontSize: 13, textAlign: 'left', cursor: 'pointer' }
const messageStyle = { padding: 24, borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', color: 'var(--color-text-secondary)', textAlign: 'center' }
const errorStyle = { padding: 12, color: 'var(--color-error)', fontSize: 13 }
