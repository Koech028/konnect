import { useState, useRef, useEffect } from 'react'
import { Send, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import MessageBubble from './MessageBubble'
import Avatar from '../common/Avatar'

export default function MessageThread({ match, messages, currentUserId, currentUserInterests = [], otherUserTyping, onTyping, onSendMessage }) {
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef(null)
  const navigate = useNavigate()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const [error, setError] = useState('')
  const otherInterests = new Set((match.user.interests || [])
    .filter(interest => typeof interest === 'string')
    .map(interest => interest.toLowerCase()))
  const sharedInterests = currentUserInterests.filter(interest =>
    typeof interest === 'string' && otherInterests.has(interest.toLowerCase())
  )
  const icebreakers = sharedInterests.length
    ? sharedInterests.slice(0, 3).map(interest => `I noticed we both enjoy ${interest}. What got you into it?`)
    : [
        `Hi ${match.user.display_name}! What does a great weekend look like for you?`,
        'What is something you have been enjoying lately?',
        'If you could plan a relaxed first date, what would you choose?'
      ]
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return
    try {
      await onSendMessage?.(newMessage.trim())
      setNewMessage('')
      setError('')
    } catch (err) {
      setError(err.message || 'Message could not be sent.')
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - var(--header-height))'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px var(--space-md)',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border-light)',
        position: 'sticky',
        top: 0
      }}>
        <button
          onClick={() => navigate('/messages')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-text-secondary)',
            padding: '8px'
          }}
        >
          <ArrowLeft size={22} />
        </button>
        <Avatar src={match.user.avatar} alt={match.user.display_name} size="sm" />
        <div>
          <h3 style={{
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--color-text-primary)'
          }}>
            {match.user.display_name}
          </h3>
          <span style={{
            fontSize: '12px',
            color: 'var(--color-accent)'
          }}>
            Matched
          </span>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: 'var(--space-md) 0',
        background: 'var(--color-bg)'
      }}>
        {messages.length === 0 && (
          <section aria-label="Conversation starters" style={starterSectionStyle}>
            <p style={starterTitleStyle}>Want an easy way to say hello?</p>
            <div style={starterListStyle}>
              {icebreakers.map(starter => (
                <button key={starter} type="button" onClick={() => setNewMessage(starter)} style={starterButtonStyle}>
                  {starter}
                </button>
              ))}
            </div>
            <p style={starterPrivacyStyle}>Choose one to edit it before sending. Nothing is sent automatically.</p>
          </section>
        )}
        {messages?.map(message => (
          <MessageBubble
            key={message.id}
            message={message}
            isMe={message.sender_id === currentUserId}
          />
        ))}
        {otherUserTyping && <p role="status" style={{ padding: '0 var(--space-md)', color: 'var(--color-text-secondary)', fontSize: 13 }}>Typing…</p>}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px var(--space-md)',
          background: 'var(--color-surface)',
          borderTop: '1px solid var(--color-border-light)'
        }}
      >
        <input
          type="text"
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value)
            if (e.target.value.trim()) onTyping?.()
          }}
          placeholder="Type a message..."
          style={{
            flex: 1,
            padding: '12px 18px',
            borderRadius: 'var(--radius-full)',
            border: '1.5px solid var(--color-border)',
            background: 'var(--color-bg)',
            fontSize: '15px',
            fontFamily: 'var(--font-sans)',
            outline: 'none',
            color: 'var(--color-text-primary)'
          }}
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            border: 'none',
            background: newMessage.trim() ? 'var(--color-primary)' : 'var(--color-border)',
            color: 'white',
            cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all var(--transition-fast)'
          }}
        >
          <Send size={18} />
        </button>
      </form>
      {error && <p role="alert" style={{ padding: '0 16px 8px', color: 'var(--color-error)', fontSize: 13 }}>{error}</p>}
    </div>
  )
}

const starterSectionStyle = { padding: 'var(--space-md)', margin: '0 var(--space-md) var(--space-md)', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-sm)' }
const starterTitleStyle = { margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }
const starterListStyle = { display: 'flex', flexWrap: 'wrap', gap: 8 }
const starterButtonStyle = { maxWidth: '100%', padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg)', color: 'var(--color-text-primary)', font: 'inherit', fontSize: 12, textAlign: 'left', cursor: 'pointer' }
const starterPrivacyStyle = { margin: '8px 0 0', color: 'var(--color-text-secondary)', fontSize: 11 }
