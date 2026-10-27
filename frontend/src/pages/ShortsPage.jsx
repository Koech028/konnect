import { useCallback, useEffect, useRef, useState } from 'react'
import { Heart, MessageCircle, Plus, Send, Trash2, X } from 'lucide-react'
import Avatar from '../components/common/Avatar'
import ReportContentButton from '../components/feed/ReportContentButton'
import { useAuth } from '../context/AuthContext'
import { api } from '../utils/api'
import { getVideoDuration, uploadVideo } from '../utils/uploadImage'

export default function ShortsPage() {
  const { user } = useAuth()
  const [shorts, setShorts] = useState([])
  const [comments, setComments] = useState([])
  const [activeComments, setActiveComments] = useState('')
  const [caption, setCaption] = useState('')
  const [file, setFile] = useState(null)
  const [showComposer, setShowComposer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const watched = useRef(new Set())
  const feedRef = useRef(null)

  const loadShorts = useCallback(() => api.get('/api/v1/shorts/').then(setShorts), [])

  useEffect(() => {
    loadShorts()
      .catch(err => setError(err.message || 'Shorts could not be loaded.'))
      .finally(() => setLoading(false))
  }, [loadShorts])

  useEffect(() => {
    const container = feedRef.current
    if (!container || !('IntersectionObserver' in window)) return undefined
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const video = entry.target.querySelector('video')
        if (!video) return
        if (entry.isIntersecting && entry.intersectionRatio >= 0.65) {
          video.play().catch(() => {})
        } else {
          video.pause()
        }
      })
    }, { threshold: [0, 0.65, 1] })
    container.querySelectorAll('[data-short-card]').forEach(card => observer.observe(card))
    return () => observer.disconnect()
  }, [shorts])

  const recordWatch = shortId => {
    if (watched.current.has(shortId)) return
    watched.current.add(shortId)
    api.post(`/api/v1/shorts/${shortId}/watch/`, {}).then(result => {
      setShorts(current => current.map(short => short.id === shortId
        ? { ...short, views_count: result.views_count }
        : short))
    }).catch(err => setError(err.message || 'The view could not be recorded.'))
  }

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

  const deleteShort = async short => {
    if (!window.confirm('Delete this Short? This cannot be undone.')) return
    setError('')
    try {
      await api.delete(`/api/v1/shorts/${short.id}/`)
      setShorts(current => current.filter(item => item.id !== short.id))
    } catch (err) {
      setError(err.message || 'The Short could not be deleted.')
    }
  }

  const toggleComments = async shortId => {
    if (activeComments === shortId) {
      setActiveComments('')
      return
    }
    setActiveComments(shortId)
    setError('')
    try {
      setComments(await api.get(`/api/v1/shorts/${shortId}/comments/`))
    } catch (err) {
      setError(err.message || 'Comments could not be loaded.')
    }
  }

  const submitComment = async event => {
    event.preventDefault()
    const shortId = activeComments
    const form = event.currentTarget
    const text = new FormData(form).get('text')?.toString().trim()
    if (!shortId || !text) return
    setError('')
    try {
      const comment = await api.post(`/api/v1/shorts/${shortId}/comments/`, { text })
      setComments(current => [...current, comment])
      setShorts(current => current.map(short => short.id === shortId
        ? { ...short, comments_count: short.comments_count + 1 }
        : short))
      form.reset()
    } catch (err) {
      setError(err.message || 'Your comment could not be sent.')
    }
  }

  const createShort = async event => {
    event.preventDefault()
    if (!file) return
    setSaving(true)
    setError('')
    try {
      const duration_seconds = await getVideoDuration(file)
      const video_url = await uploadVideo(file)
      await api.post('/api/v1/shorts/', { caption: caption.trim(), video_url, duration_seconds })
      setCaption('')
      setFile(null)
      setShowComposer(false)
      await loadShorts()
    } catch (err) {
      setError(err.message || 'Your Short could not be posted.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={headingStyle}>Shorts</h1>
          <p style={subtitleStyle}>Quick moments, genuine connections.</p>
        </div>
        <button type="button" aria-label="Create a Short" onClick={() => setShowComposer(value => !value)} style={createButtonStyle}>
          {showComposer ? <X size={19} /> : <Plus size={19} />} {showComposer ? 'Close' : 'Create'}
        </button>
      </header>

      {showComposer && (
        <form onSubmit={createShort} style={composerStyle}>
          <label style={fieldLabelStyle}>
            Short video (MP4, WebM, or QuickTime; up to 60 seconds and 50 MB)
            <input required type="file" accept="video/mp4,video/webm,video/quicktime" onChange={event => setFile(event.target.files?.[0] || null)} style={{ display: 'block', marginTop: 8 }} />
          </label>
          <input value={caption} onChange={event => setCaption(event.target.value)} maxLength={300} placeholder="Add a caption…" aria-label="Short caption" style={inputStyle} />
          <button type="submit" disabled={saving || !file} style={submitStyle}>{saving ? 'Uploading…' : 'Post Short'}</button>
        </form>
      )}

      {error && <p role="alert" style={errorStyle}>{error}</p>}
      {loading && <p role="status" style={emptyStyle}>Loading Shorts…</p>}
      {!loading && shorts.length === 0 && <p style={emptyStyle}>No Shorts yet. Share a quick moment to start the feed.</p>}

      <div ref={feedRef} style={feedStyle}>
        {shorts.map(short => (
          <article key={short.id} data-short-card style={shortCardStyle}>
            <video
              src={short.video_url}
              controls
              muted
              loop
              playsInline
              preload="metadata"
              onPlay={() => recordWatch(short.id)}
              style={videoStyle}
            />
            <div style={detailsStyle}>
              <div style={authorStyle}>
                <Avatar src={short.author_avatar} alt={short.author_name} size="sm" />
                <strong>{short.author_name}</strong>
                <span style={counterStyle}>{short.views_count} views</span>
              </div>
              {short.caption && <p style={captionStyle}>{short.caption}</p>}
              <div style={actionRowStyle}>
                <button type="button" aria-label={short.liked_by_me ? 'Unlike Short' : 'Like Short'} onClick={() => toggleLike(short)} style={actionButtonStyle}>
                  <Heart size={19} fill={short.liked_by_me ? 'currentColor' : 'none'} color={short.liked_by_me ? 'var(--color-primary)' : 'currentColor'} />
                  {short.likes_count}
                </button>
                <button type="button" onClick={() => toggleComments(short.id)} style={actionButtonStyle}>
                  <MessageCircle size={19} /> {short.comments_count}
                </button>
                {short.author_id === user?.id && (
                  <button type="button" aria-label="Delete your Short" onClick={() => deleteShort(short)} style={actionButtonStyle}>
                    <Trash2 size={18} /> Delete
                  </button>
                )}
                {short.author_id !== user?.id && <ReportContentButton shortId={short.id} />}
              </div>
              {activeComments === short.id && (
                <section aria-label="Short comments" style={commentsPanelStyle}>
                  <div style={commentsHeaderStyle}>
                    <strong>Comments</strong>
                    <button type="button" aria-label="Close comments" onClick={() => setActiveComments('')} style={closeButtonStyle}><X size={17} /></button>
                  </div>
                  <div style={commentListStyle}>
                    {comments.map(comment => (
                      <div key={comment.id} style={commentRowStyle}>
                        <p style={commentStyle}><strong>{comment.author_name}</strong> {comment.text}</p>
                        {comment.author_id !== user?.id && <ReportContentButton commentId={comment.id} />}
                      </div>
                    ))}
                    {!comments.length && <p style={counterStyle}>Be the first to say something kind.</p>}
                  </div>
                  <form onSubmit={submitComment} style={commentFormStyle}>
                    <input name="text" required maxLength={500} placeholder="Write a comment…" aria-label="Write a comment" style={inputStyle} />
                    <button type="submit" aria-label="Send comment" style={sendButtonStyle}><Send size={17} /></button>
                  </form>
                </section>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

const pageStyle = { padding: 'var(--space-md)' }
const headerStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 'var(--space-md)' }
const headingStyle = { margin: 0, fontSize: 23 }
const subtitleStyle = { margin: '4px 0 0', color: 'var(--color-text-secondary)', fontSize: 13 }
const createButtonStyle = { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 13px', border: 0, borderRadius: 'var(--radius-full)', background: 'var(--color-primary)', color: '#fff', font: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer' }
const composerStyle = { display: 'grid', gap: 12, padding: 'var(--space-md)', marginBottom: 'var(--space-md)', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-sm)' }
const fieldLabelStyle = { color: 'var(--color-text-secondary)', fontSize: 12 }
const inputStyle = { minWidth: 0, width: '100%', padding: 10, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg)', color: 'var(--color-text-primary)', font: 'inherit', fontSize: 13 }
const submitStyle = { padding: 10, border: 0, borderRadius: 'var(--radius-md)', background: 'var(--color-primary)', color: '#fff', font: 'inherit', fontWeight: 700, cursor: 'pointer' }
const errorStyle = { padding: 10, color: 'var(--color-error)', fontSize: 13 }
const emptyStyle = { padding: 24, textAlign: 'center', color: 'var(--color-text-secondary)' }
const feedStyle = { display: 'grid', justifyItems: 'center', gap: 'var(--space-md)' }
const shortCardStyle = { position: 'relative', width: 'min(100%, 480px)', overflow: 'hidden', borderRadius: 'var(--radius-lg)', background: '#111', color: '#fff', boxShadow: 'var(--shadow-md)' }
const videoStyle = { display: 'block', width: '100%', maxHeight: 'min(75vh, 720px)', minHeight: 220, objectFit: 'contain', background: '#090909' }
const detailsStyle = { padding: '12px 14px', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }
const authorStyle = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }
const counterStyle = { color: 'var(--color-text-secondary)', fontSize: 12 }
const captionStyle = { margin: '9px 0', fontSize: 14, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }
const actionRowStyle = { display: 'flex', gap: 18 }
const actionButtonStyle = { display: 'flex', alignItems: 'center', gap: 6, padding: 5, border: 0, background: 'none', color: 'var(--color-text-primary)', font: 'inherit', fontSize: 13, cursor: 'pointer' }
const commentsPanelStyle = { paddingTop: 10, borderTop: '1px solid var(--color-border-light)' }
const commentsHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }
const closeButtonStyle = { display: 'grid', placeItems: 'center', width: 30, height: 30, border: 0, borderRadius: '50%', background: 'transparent', color: 'var(--color-text-primary)', cursor: 'pointer' }
const commentListStyle = { display: 'grid', gap: 6, maxHeight: 180, overflowY: 'auto', padding: '8px 0' }
const commentStyle = { margin: 0, fontSize: 13, overflowWrap: 'anywhere' }
const commentRowStyle = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }
const commentFormStyle = { display: 'flex', alignItems: 'center', gap: 8 }
const sendButtonStyle = { display: 'grid', placeItems: 'center', flex: '0 0 38px', height: 38, border: 0, borderRadius: '50%', background: 'var(--color-primary)', color: '#fff', cursor: 'pointer' }
