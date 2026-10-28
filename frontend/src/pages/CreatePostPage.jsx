import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Image, X, CalendarDays, Video, BarChart3, Type } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import { useAuth } from '../context/AuthContext'
import { useAppData } from '../context/AppDataContext'
import { getVideoDuration, uploadImage, uploadVideo } from '../utils/uploadImage'

const cardStyle = {
  background: 'var(--color-surface)',
  borderRadius: 'var(--radius-lg)',
  padding: 'var(--space-lg)',
  boxShadow: 'var(--shadow-sm)',
  margin: 'var(--space-md)'
}

const fieldStyle = {
  width: '100%',
  padding: '12px 14px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-bg)',
  color: 'var(--color-text-primary)',
  font: 'inherit'
}

export default function CreatePostPage() {
  const { postId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { posts, createPost, updatePost, getPost } = useAppData()
  const [remotePost, setRemotePost] = useState(null)
  const [isLoadingPost, setIsLoadingPost] = useState(Boolean(postId))
  const existingPost = postId ? posts.find(post => post.id === postId) || remotePost : null
  const canEdit = existingPost && existingPost.author_id === user?.id
  const [type, setType] = useState(existingPost?.type || 'status')
  const [text, setText] = useState(existingPost?.content?.text || '')
  const [media, setMedia] = useState(existingPost?.content?.media?.[0] || '')
  const [options, setOptions] = useState(existingPost?.content?.poll_options || ['', ''])
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingMedia, setIsUploadingMedia] = useState(false)

  useEffect(() => {
    if (!postId) return
    getPost(postId)
      .then(setRemotePost)
      .catch(err => setError(err.message || 'This post could not be loaded.'))
      .finally(() => setIsLoadingPost(false))
  }, [postId, getPost])

  useEffect(() => {
    if (!existingPost) return
    setType(existingPost.type)
    setText(existingPost.content.text)
    setMedia(existingPost.content.media?.[0] || '')
    setOptions(existingPost.content.poll_options || ['', ''])
  }, [existingPost])

  if (isLoadingPost) {
    return <><PageHeader title="Edit post" /><div style={cardStyle}>Loading post...</div></>
  }
  if (postId && !canEdit) {
    return (
      <>
        <PageHeader title="Edit post" />
        <div style={cardStyle}>This post is unavailable or you do not have permission to edit it.</div>
      </>
    )
  }

  const handleImage = async (event) => {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return
    setIsUploadingMedia(true)
    setError('')
    try {
      setMedia(await uploadImage(file))
    } catch (err) {
      setError(err.message)
    } finally {
      setIsUploadingMedia(false)
      input.value = ''
    }
  }

  const handleVideo = async event => {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return
    setIsUploadingMedia(true)
    setError('')
    try {
      await getVideoDuration(file)
      setMedia(await uploadVideo(file))
    } catch (err) {
      setError(err.message || 'The video could not be uploaded.')
    } finally {
      setIsUploadingMedia(false)
      input.value = ''
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const cleanText = text.trim()
    const pollOptions = options.map(option => option.trim()).filter(Boolean)
    if (!cleanText) {
      setError('Add some text before publishing.')
      return
    }
    if (type === 'poll' && pollOptions.length < 2) {
      setError('A poll needs at least two options.')
      return
    }
    if (type === 'video' && !media) {
      setError('Choose a video to include in your post.')
      return
    }

    setIsSaving(true)
    setError('')
    const content = {
      text: cleanText,
      ...(media ? { media: [media] } : {}),
      ...(type === 'poll' ? {
        poll_options: pollOptions,
        poll_votes: JSON.stringify(pollOptions) === JSON.stringify(existingPost?.content?.poll_options)
          ? existingPost?.content?.poll_votes || pollOptions.map(() => 0)
          : pollOptions.map(() => 0)
      } : {})
    }
    try {
      if (existingPost) {
        await updatePost(existingPost.id, { type, content })
        navigate(`/posts/${existingPost.id}`)
      } else {
        const created = await createPost({
          type,
          content
        })
        navigate(`/posts/${created.id}`)
      }
    } catch (err) {
      setError(err.message || 'Your post could not be saved. Please try again.')
      setIsSaving(false)
    }
  }

  return (
    <>
      <PageHeader title={existingPost ? 'Edit post' : 'Create a post'} />
      <form onSubmit={handleSubmit} style={cardStyle}>
        <fieldset disabled={isUploadingMedia} style={{ border: 0, padding: 0, margin: '0 0 18px' }}>
          <legend style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px' }}>{existingPost ? 'Post format' : 'Add to your post'}</legend>
          <div style={suggestionsStyle}>
            {[
              { id: 'status', label: 'Text', icon: Type },
              { id: 'photo', label: 'Photo', icon: Image },
              { id: 'video', label: 'Video', icon: Video },
              { id: 'poll', label: 'Poll', icon: BarChart3 },
              { id: 'event', label: 'Event', icon: CalendarDays }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-pressed={type === id}
                onClick={() => {
                  if (type !== id) setMedia('')
                  setType(id)
                  setError('')
                }}
                style={{
                  ...suggestionButtonStyle,
                  borderColor: type === id ? 'var(--color-primary)' : 'var(--color-border)',
                  background: type === id ? 'var(--color-primary-soft)' : 'var(--color-bg)',
                  color: type === id ? 'var(--color-primary-dark)' : 'var(--color-text-secondary)'
                }}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <label htmlFor="post-text" style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
          {type === 'event' ? 'Event details' : 'What would you like to share?'}
        </label>
        <textarea
          id="post-text"
          value={text}
          onChange={event => setText(event.target.value)}
          rows={5}
          maxLength={2000}
          required
          placeholder={type === 'poll' ? 'Ask a question...' : type === 'event' ? 'Share event details...' : "What's on your mind?"}
          style={{ ...fieldStyle, resize: 'vertical', lineHeight: 1.5 }}
        />
        <p style={{ textAlign: 'right', fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{text.length}/2000</p>

        {type === 'poll' && (
          <div style={{ marginTop: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Poll options</label>
            {options.map((option, index) => (
              <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  value={option}
                  onChange={event => setOptions(current => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))}
                  placeholder={`Option ${index + 1}`}
                  maxLength={100}
                  style={fieldStyle}
                />
                {options.length > 2 && (
                  <button type="button" onClick={() => setOptions(current => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove option ${index + 1}`} style={{ ...iconButtonStyle, color: 'var(--color-error)' }}>
                    <X size={18} />
                  </button>
                )}
              </div>
            ))}
            {options.length < 4 && <button type="button" onClick={() => setOptions(current => [...current, ''])} style={textButtonStyle}>+ Add option</button>}
          </div>
        )}

        {(type === 'photo' || type === 'event') && (
          <div style={{ marginTop: '16px' }}>
            <label htmlFor="post-image" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
              {type === 'event' ? <CalendarDays size={18} /> : <Image size={18} />} Add an image (optional)
            </label>
            <input id="post-image" type="file" accept="image/*" onChange={handleImage} />
            {media && (
              <div style={{ position: 'relative', marginTop: '12px' }}>
                <img src={media} alt="Post preview" style={{ display: 'block', width: '100%', maxHeight: '320px', objectFit: 'cover', borderRadius: 'var(--radius-md)' }} />
                <button type="button" onClick={() => setMedia('')} aria-label="Remove image" style={{ ...iconButtonStyle, position: 'absolute', top: '8px', right: '8px', background: 'var(--color-surface)' }}><X size={18} /></button>
              </div>
            )}
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px' }}>Images are securely uploaded to cloud storage. Maximum source file size: 5 MB.</p>
          </div>
        )}

        {type === 'video' && (
          <div style={{ marginTop: '16px' }}>
            <label htmlFor="post-video" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
              <Video size={18} /> Add a short video
            </label>
            <input id="post-video" type="file" accept="video/mp4,video/webm,video/quicktime" onChange={handleVideo} />
            {media && (
              <div style={{ position: 'relative', marginTop: '12px' }}>
                <video src={media} controls playsInline preload="metadata" style={{ display: 'block', width: '100%', maxHeight: '400px', borderRadius: 'var(--radius-md)', background: '#111' }} />
                <button type="button" onClick={() => setMedia('')} aria-label="Remove video" style={{ ...iconButtonStyle, position: 'absolute', top: '8px', right: '8px', background: 'var(--color-surface)' }}><X size={18} /></button>
              </div>
            )}
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px' }}>MP4, WebM, or QuickTime; up to 60 seconds and 50 MB.</p>
          </div>
        )}

        {error && <p role="alert" style={{ color: 'var(--color-error)', marginTop: '12px', fontSize: '14px' }}>{error}</p>}
        <button type="submit" disabled={isSaving || isUploadingMedia} style={primaryButtonStyle}>
          {isUploadingMedia ? 'Uploading media...' : isSaving ? 'Saving...' : existingPost ? 'Save changes' : 'Publish post'}
        </button>
      </form>
    </>
  )
}

const primaryButtonStyle = {
  width: '100%',
  marginTop: '20px',
  padding: '14px',
  border: 'none',
  borderRadius: 'var(--radius-lg)',
  background: 'var(--color-primary)',
  color: 'white',
  font: 'inherit',
  fontWeight: 700,
  cursor: 'pointer'
}
const suggestionsStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(88px, 1fr))', gap: 8 }
const suggestionButtonStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, minHeight: 42, padding: '8px 10px', border: '1px solid', borderRadius: 'var(--radius-md)', font: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }

const iconButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '42px',
  minWidth: '42px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'transparent',
  cursor: 'pointer'
}

const textButtonStyle = {
  padding: '8px 0',
  border: 'none',
  background: 'transparent',
  color: 'var(--color-primary)',
  font: 'inherit',
  fontWeight: 600,
  cursor: 'pointer'
}
