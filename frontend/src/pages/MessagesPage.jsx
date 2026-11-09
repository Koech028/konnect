import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../utils/api'
import MatchList from '../components/messages/MatchList'

export default function MessagesPage() {
  const [matches, setMatches] = useState([])
  const [offerConversations, setOfferConversations] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/api/v1/matches/'),
      api.get('/api/v1/offers/conversations/')
    ])
      .then(([matchResponse, offerResponse]) => {
        setMatches(matchResponse.results || matchResponse)
        setOfferConversations(offerResponse)
      })
      .catch(err => setError(err.message || 'Conversations could not be loaded.'))
  }, [])

  return (
    <div>
      <div style={{
        padding: 'var(--space-lg) var(--space-md) var(--space-md)',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border-light)'
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 700,
          color: 'var(--color-text-primary)'
        }}>
          Messages
        </h1>
        <p style={{
          fontSize: '14px',
          color: 'var(--color-text-secondary)',
          marginTop: '4px'
        }}>
          {matches.length + offerConversations.length} {matches.length + offerConversations.length === 1 ? 'conversation' : 'conversations'}
        </p>
      </div>
      {error && <p role="alert" style={{ padding: 'var(--space-md)', color: 'var(--color-error)' }}>{error}</p>}
      {!error && matches.length === 0 && offerConversations.length === 0 && (
        <div style={{ padding: 'var(--space-md)', color: 'var(--color-text-secondary)' }}>
          <p style={{ margin: '0 0 12px' }}>Your match and offer conversations will appear here.</p>
          <Link to="/discover" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>Start matching</Link>
        </div>
      )}
      {offerConversations.length > 0 && (
        <section style={{ padding: 'var(--space-md)' }}>
          <h2 style={{ margin: '0 0 10px', fontSize: 16 }}>Offer conversations</h2>
          <div style={{ display: 'grid', gap: 8 }}>
            {offerConversations.map(conversation => (
              <Link key={conversation.id} to={`/offer-conversations/${conversation.id}`} style={conversationStyle}>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <strong>{conversation.other_user_name}</strong>
                  <span style={conversationSecondaryStyle}>{conversation.offer_title || 'Offer'} · {conversation.last_message}</span>
                </span>
                {conversation.unread_count > 0 && <span aria-label={`${conversation.unread_count} unread`} style={unreadStyle}>{conversation.unread_count}</span>}
              </Link>
            ))}
          </div>
        </section>
      )}
      <MatchList matches={matches} />
    </div>
  )
}

const conversationStyle = { display: 'flex', alignItems: 'center', gap: 10, padding: 14, borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-sm)', color: 'var(--color-text-primary)', textDecoration: 'none' }
const conversationSecondaryStyle = { display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 4, color: 'var(--color-text-secondary)', fontSize: 13 }
const unreadStyle = { display: 'grid', placeItems: 'center', minWidth: 22, height: 22, padding: '0 6px', borderRadius: 'var(--radius-full)', background: 'var(--color-primary)', color: '#fff', fontSize: 11, fontWeight: 700 }
