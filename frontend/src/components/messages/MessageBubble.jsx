import { formatTime } from '../../utils/helpers'

export default function MessageBubble({ message, isMe }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: isMe ? 'flex-end' : 'flex-start',
      marginBottom: '12px',
      padding: '0 var(--space-md)'
    }}>
      <div style={{
        maxWidth: '75%',
        padding: '12px 16px',
        borderRadius: isMe
          ? 'var(--radius-lg) var(--radius-lg) 4px var(--radius-lg)'
          : 'var(--radius-lg) var(--radius-lg) var(--radius-lg) 4px',
        background: isMe ? 'var(--color-primary)' : 'var(--color-border-light)',
        color: isMe ? 'white' : 'var(--color-text-primary)',
        fontSize: '15px',
        lineHeight: 1.5,
        wordBreak: 'break-word'
      }}>
        <p>{message.text}</p>
        <span style={{
          display: 'block',
          fontSize: '11px',
          marginTop: '4px',
          opacity: 0.7,
          textAlign: 'right'
        }}>
          {formatTime(message.created_at)}
          {isMe && message.read_at && <span aria-label="Read"> · Read</span>}
        </span>
      </div>
    </div>
  )
}
