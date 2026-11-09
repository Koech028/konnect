import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Flag, Send, UserRoundX } from 'lucide-react'
import Avatar from '../components/common/Avatar'
import MessageBubble from '../components/messages/MessageBubble'
import { useAuth } from '../context/AuthContext'
import { api } from '../utils/api'

export default function OfferConversationPage() {
  const { conversationId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [conversation, setConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const endRef = useRef(null)

  const loadConversation = useCallback(async () => {
    const [details, messageList] = await Promise.all([
      api.get(`/api/v1/offers/conversations/${conversationId}/`),
      api.get(`/api/v1/offers/conversations/${conversationId}/messages/`)
    ])
    setConversation(details)
    setMessages(messageList)
    setError('')
  }, [conversationId])

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        await loadConversation()
      } catch (err) {
        if (active) setError(err.message || 'Conversation could not be loaded.')
      }
    }
    load()
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') load()
    }, 4000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [loadConversation])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async event => {
    event.preventDefault()
    const messageText = text.trim()
    if (!messageText || sending) return
    setSending(true)
    try {
      const message = await api.post(`/api/v1/offers/conversations/${conversationId}/messages/`, { text: messageText })
      setMessages(current => [...current, message])
      setText('')
      setError('')
    } catch (err) {
      setError(err.message || 'Message could not be sent.')
    } finally {
      setSending(false)
    }
  }

  const blockUser = async () => {
    if (!conversation || !window.confirm(`Block ${conversation.other_user_name}? They will no longer be able to message you.`)) return
    try {
      await api.post('/api/v1/safety/blocks/', { user_id: conversation.other_user_id })
      navigate('/safety', { state: { safetyMessage: `${conversation.other_user_name} was blocked.` } })
    } catch (err) {
      setError(err.message || 'This profile could not be blocked.')
    }
  }

  if (!conversation && error) {
    return <div role="alert" style={{ padding: 24 }}>{error}<p><Link to="/messages">Back to messages</Link></p></div>
  }
  if (!conversation) return <p role="status" style={{ padding: 24 }}>Loading conversation…</p>

  return (
    <section style={pageStyle}>
      <header style={headerStyle}>
        <button type="button" aria-label="Back to messages" onClick={() => navigate('/messages')} style={iconButtonStyle}><ArrowLeft size={20} /></button>
        <Avatar src={conversation.other_user_avatar} alt={conversation.other_user_name} size="sm" preview />
        <div style={{ minWidth: 0, flex: 1 }}>
          <strong>{conversation.other_user_name}</strong>
          <p style={subheadingStyle}>About: {conversation.offer_title || 'an offer'}</p>
        </div>
        <Link to={`/safety?userId=${encodeURIComponent(conversation.other_user_id)}`} title="Report this profile" style={iconButtonStyle}><Flag size={17} /></Link>
        <button type="button" aria-label="Block this profile" onClick={blockUser} style={iconButtonStyle}><UserRoundX size={17} /></button>
      </header>
      {error && <p role="alert" style={errorStyle}>{error} Your loaded messages are still available.</p>}
      <div style={messagesStyle}>
        {!messages.length && <p style={emptyStyle}>Start a respectful conversation about this offer. Don’t send money, private documents, or verification codes.</p>}
        {messages.map(message => <MessageBubble key={message.id} message={message} isMe={message.sender_id === user?.id} />)}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} style={composerStyle}>
        <input aria-label="Message" value={text} onChange={event => setText(event.target.value)} maxLength={2000} placeholder="Type a message…" style={inputStyle} />
        <button type="submit" disabled={sending || !text.trim()} aria-label="Send message" style={sendButtonStyle}><Send size={18} /></button>
      </form>
    </section>
  )
}

const pageStyle = { display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--header-height) - var(--bottom-nav-height))', background: 'var(--color-bg)' }
const headerStyle = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px var(--space-md)', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border-light)' }
const iconButtonStyle = { display: 'grid', placeItems: 'center', padding: 8, color: 'var(--color-text-secondary)', background: 'none', border: 0, cursor: 'pointer', textDecoration: 'none' }
const subheadingStyle = { margin: '3px 0 0', color: 'var(--color-text-secondary)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
const messagesStyle = { flex: 1, overflowY: 'auto', padding: 'var(--space-md) 0' }
const emptyStyle = { maxWidth: 420, margin: '24px auto', padding: 16, textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13, lineHeight: 1.5 }
const composerStyle = { display: 'flex', gap: 8, padding: 12, background: 'var(--color-surface)', borderTop: '1px solid var(--color-border-light)' }
const inputStyle = { flex: 1, minWidth: 0, padding: '11px 16px', borderRadius: 'var(--radius-full)', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)', font: 'inherit' }
const sendButtonStyle = { display: 'grid', placeItems: 'center', width: 44, border: 0, borderRadius: '50%', color: '#fff', background: 'var(--color-primary)', cursor: 'pointer' }
const errorStyle = { margin: 0, padding: 8, color: 'var(--color-error)', fontSize: 13 }
