import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PageHeader from '../components/common/PageHeader'
import FeedPost from '../components/feed/FeedPost'
import Avatar from '../components/common/Avatar'
import { useAuth } from '../context/AuthContext'
import { useAppData } from '../context/AppDataContext'
import { formatRelativeTime } from '../utils/helpers'

export default function PostDetailPage() {
  const { postId } = useParams()
  const { user } = useAuth()
  const { posts, togglePostLike, togglePostInterest, votePoll, addComment, getComments, getPost } = useAppData()
  const [remotePost, setRemotePost] = useState(null)
  const [postComments, setPostComments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const post = posts.find(item => item.id === postId) || remotePost
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getComments(postId), getPost(postId)])
      .then(([loadedComments, loadedPost]) => {
        setPostComments(loadedComments)
        setRemotePost(loadedPost)
      })
      .catch(err => setError(err.message || 'Post comments could not be loaded.'))
      .finally(() => setIsLoading(false))
  }, [postId, getComments, getPost])

  const submitComment = async (event) => {
    event.preventDefault()
    if (!text.trim()) return
    try {
      const created = await addComment({
        post_id: postId,
        text: text.trim()
      })
      setPostComments(current => [...current, created])
      setText('')
      setError('')
    } catch (err) {
      setError(err.message || 'Your comment could not be saved.')
    }
  }

  if (isLoading && !post) {
    return <><PageHeader title="Post" /><div role="status" style={surfaceStyle}>Loading post...</div></>
  }
  if (!post) {
    return <><PageHeader title="Post" /><div style={surfaceStyle}>This post could not be found.</div></>
  }

  return (
    <>
      <PageHeader title="Post" action={post.author_id === user?.id && <Link to={`/posts/${post.id}/edit`} style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>Edit</Link>} />
      <div style={{ padding: 'var(--space-md)' }}>
        <FeedPost post={post} onLike={togglePostLike} onInterest={togglePostInterest} onPollVote={votePoll} />
        <section style={surfaceStyle}>
          <h2 style={{ fontSize: '17px', marginBottom: '16px' }}>Comments ({postComments.length})</h2>
          {postComments.length === 0 && <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '16px' }}>Be the first to start the conversation.</p>}
          {postComments.map(comment => (
            <div key={comment.id} style={{ display: 'flex', gap: '10px', padding: '12px 0', borderBottom: '1px solid var(--color-border-light)' }}>
              <Avatar src={comment.author?.avatar} alt={comment.author?.display_name} size="sm" />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                  <strong style={{ fontSize: '14px' }}>{comment.author?.display_name || 'Member'}</strong>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>{formatRelativeTime(comment.created_at)}</span>
                </div>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginTop: '3px', whiteSpace: 'pre-wrap' }}>{comment.text}</p>
              </div>
            </div>
          ))}
          <form onSubmit={submitComment} style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <input value={text} onChange={event => setText(event.target.value)} maxLength={500} placeholder="Write a comment..." aria-label="Write a comment" style={{ flex: 1, minWidth: 0, padding: '12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-full)', background: 'var(--color-bg)', color: 'var(--color-text-primary)', font: 'inherit' }} />
            <button type="submit" disabled={!text.trim()} style={sendButtonStyle}>Send</button>
          </form>
          {error && <p role="alert" style={{ color: 'var(--color-error)', fontSize: '13px', marginTop: '8px' }}>{error}</p>}
        </section>
      </div>
    </>
  )
}

const surfaceStyle = {
  background: 'var(--color-surface)',
  borderRadius: 'var(--radius-lg)',
  padding: 'var(--space-md)',
  boxShadow: 'var(--shadow-sm)'
}

const sendButtonStyle = {
  padding: '0 18px',
  border: 'none',
  borderRadius: 'var(--radius-full)',
  background: 'var(--color-primary)',
  color: 'white',
  fontWeight: 600,
  cursor: 'pointer'
}
