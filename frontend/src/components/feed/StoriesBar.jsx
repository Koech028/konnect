import { useEffect, useState } from 'react'
import { ImagePlus, Video, X } from 'lucide-react'
import { api } from '../../utils/api'
import { getVideoDuration, uploadImage, uploadVideo } from '../../utils/uploadImage'

export default function StoriesBar() {
  const [stories, setStories] = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [text, setText] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadStories = () => api.get('/api/v1/stories/').then(setStories)

  useEffect(() => {
    loadStories().catch(err => setError(err.message || 'Stories could not be loaded.'))
  }, [])

  const groups = Object.values(stories.reduce((result, story) => {
    if (!result[story.author_id]) result[story.author_id] = { author: story.author_name, stories: [] }
    result[story.author_id].stories.push(story)
    return result
  }, {}))
  const selected = selectedGroup?.stories[selectedIndex]

  const createStory = async event => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      let image_url = ''
      let video_url = ''
      let video_duration_seconds
      if (file?.type.startsWith('image/')) image_url = await uploadImage(file)
      if (file?.type.startsWith('video/')) {
        video_duration_seconds = await getVideoDuration(file)
        video_url = await uploadVideo(file)
      }
      await api.post('/api/v1/stories/', {
        text: text.trim(),
        image_url,
        video_url,
        ...(video_duration_seconds ? { video_duration_seconds } : {})
      })
      setText('')
      setFile(null)
      await loadStories()
    } catch (err) {
      setError(err.message || 'Your story could not be posted.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section aria-label="Stories" style={{ marginBottom: 'var(--space-md)', padding: '14px 12px', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-sm)' }}>
      <form onSubmit={createStory} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <input value={text} onChange={event => setText(event.target.value)} maxLength={300} placeholder="Share a 24-hour story…" aria-label="Story text" style={inputStyle} />
        <label title="Add a photo or short video" style={photoButtonStyle}>
          {file?.type.startsWith('video/') ? <Video size={18} /> : <ImagePlus size={18} />}
          <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" onChange={event => setFile(event.target.files?.[0] || null)} style={{ display: 'none' }} />
        </label>
        <button type="submit" disabled={loading || (!text.trim() && !file)} style={postButtonStyle}>{loading ? '…' : 'Post'}</button>
      </form>
      {file && <p style={helperStyle}>{file.name} · {file.type.startsWith('video/') ? 'up to 60 sec / 50 MB' : 'image'}</p>}
      {error && <p role="alert" style={errorStyle}>{error}</p>}
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
        {groups.map(group => (
          <button key={group.stories[0].author_id} type="button" onClick={() => { setSelectedGroup(group); setSelectedIndex(0) }} style={storyButtonStyle}>
            <span style={storyRingStyle}>
              {group.stories[0].video_url
                ? <Video size={21} color="var(--color-primary)" />
                : group.stories[0].image_url
                ? <img src={group.stories[0].image_url} alt="" style={storyImageStyle} />
                : <span style={storyTextStyle}>{group.stories[0].text.slice(0, 1) || '•'}</span>}
            </span>
            <span style={nameStyle}>{group.author}</span>
          </button>
        ))}
        {!groups.length && <span style={helperStyle}>Stories disappear after 24 hours.</span>}
      </div>

      {selected && (
        <div role="dialog" aria-modal="true" aria-label={`${selected.author_name}'s story`} onClick={() => setSelectedGroup(null)} style={overlayStyle}>
          <div onClick={event => event.stopPropagation()} style={viewerStyle}>
            <button type="button" aria-label="Close story" onClick={() => setSelectedGroup(null)} style={closeButtonStyle}><X size={20} /></button>
            {selected.image_url && <img src={selected.image_url} alt="" style={viewerImageStyle} />}
            {selected.video_url && <video src={selected.video_url} controls autoPlay playsInline style={viewerVideoStyle} />}
            {selected.text && <p style={viewerTextStyle}>{selected.text}</p>}
            <p style={viewerBylineStyle}>{selected.author_name} · expires {new Date(selected.expires_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
            {selectedGroup.stories.length > 1 && (
              <button type="button" onClick={() => setSelectedIndex(index => (index + 1) % selectedGroup.stories.length)} style={nextButtonStyle}>
                Next story
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

const inputStyle = { flex: 1, minWidth: 0, padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-full)', background: 'var(--color-bg)', color: 'var(--color-text-primary)', font: 'inherit', fontSize: 13 }
const photoButtonStyle = { display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: '50%', background: 'var(--color-primary-soft)', color: 'var(--color-primary)', cursor: 'pointer' }
const postButtonStyle = { padding: '9px 13px', border: 0, borderRadius: 'var(--radius-full)', background: 'var(--color-primary)', color: '#fff', font: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer' }
const storyButtonStyle = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, width: 62, flex: '0 0 62px', border: 0, background: 'none', color: 'var(--color-text-primary)', cursor: 'pointer' }
const storyRingStyle = { display: 'grid', placeItems: 'center', width: 54, height: 54, padding: 3, border: '2px solid var(--color-primary)', borderRadius: '50%' }
const storyImageStyle = { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }
const storyTextStyle = { display: 'grid', placeItems: 'center', width: '100%', height: '100%', borderRadius: '50%', background: 'var(--color-secondary-soft)', fontSize: 24, fontWeight: 700 }
const nameStyle = { width: 62, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }
const helperStyle = { color: 'var(--color-text-muted)', fontSize: 12 }
const errorStyle = { marginBottom: 8, color: 'var(--color-error)', fontSize: 12 }
const overlayStyle = { position: 'fixed', inset: 0, zIndex: 300, display: 'grid', placeItems: 'center', padding: 20, background: 'rgba(0,0,0,.82)' }
const viewerStyle = { position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12, width: 'min(100%, 440px)', minHeight: 320, maxHeight: '85vh', overflow: 'hidden', padding: 20, borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }
const closeButtonStyle = { position: 'absolute', top: 10, right: 10, zIndex: 1, display: 'grid', placeItems: 'center', width: 34, height: 34, border: 0, borderRadius: '50%', background: 'rgba(0,0,0,.55)', color: '#fff', cursor: 'pointer' }
const viewerImageStyle = { maxHeight: '65vh', maxWidth: '100%', objectFit: 'contain', alignSelf: 'center' }
const viewerVideoStyle = { maxHeight: '65vh', maxWidth: '100%', borderRadius: 'var(--radius-md)', alignSelf: 'center' }
const viewerTextStyle = { fontSize: 22, textAlign: 'center', overflowWrap: 'anywhere' }
const viewerBylineStyle = { color: 'var(--color-text-secondary)', fontSize: 12, textAlign: 'center' }
const nextButtonStyle = { alignSelf: 'center', padding: '8px 14px', border: 0, borderRadius: 'var(--radius-full)', background: 'var(--color-primary)', color: '#fff', font: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer' }
