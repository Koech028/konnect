import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../utils/api'
import MatchList from '../components/messages/MatchList'

export default function MessagesPage() {
  const [matches, setMatches] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/api/v1/matches/')
      .then(response => setMatches(response.results || response))
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
          {matches.length} {matches.length === 1 ? 'conversation' : 'conversations'}
        </p>
      </div>
      {error && <p role="alert" style={{ padding: 'var(--space-md)', color: 'var(--color-error)' }}>{error}</p>}
      {!error && matches.length === 0 && (
        <div style={{ padding: 'var(--space-md)', color: 'var(--color-text-secondary)' }}>
          <p style={{ margin: '0 0 12px' }}>Your mutual matches will appear here.</p>
          <Link to="/discover" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>Start matching</Link>
        </div>
      )}
      <MatchList matches={matches} />
    </div>
  )
}
