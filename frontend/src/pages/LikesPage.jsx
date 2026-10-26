import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../utils/api'
import Avatar from '../components/common/Avatar'
import PageHeader from '../components/common/PageHeader'
import MatchList from '../components/messages/MatchList'
import { useAppData } from '../context/AppDataContext'

export default function LikesPage() {
  const [tab, setTab] = useState('received')
  const [people, setPeople] = useState([])
  const [matches, setMatches] = useState([])
  const [error, setError] = useState('')
  const { likedUserIds, toggleUserLike } = useAppData()

  useEffect(() => {
    const endpoints = {
      received: '/api/v1/likes/incoming/',
      sent: '/api/v1/likes/outgoing/',
      matches: '/api/v1/matches/'
    }
    api.get(endpoints[tab])
      .then(response => {
        const results = response.results || response
        if (tab === 'matches') setMatches(results)
        else setPeople(results)
        setError('')
      })
      .catch(err => setError(err.message || 'Likes could not be loaded.'))
  }, [tab])

  const toggleLike = async id => {
    try {
      await toggleUserLike(id)
      if (tab === 'sent') setPeople(current => current.filter(person => person.id !== id))
    } catch (err) {
      setError(err.message || 'Could not update the like.')
    }
  }

  return (
    <>
      <PageHeader title="Likes & matches" subtitle="Connect when the interest is mutual" />
      <div style={{ display: 'flex', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border-light)' }}>
        {[
          ['received', 'Liked you'],
          ['sent', 'You liked'],
          ['matches', 'Matches']
        ].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={tabStyle(tab === id)}>{label}</button>
        ))}
      </div>
      {error && <p role="alert" style={{ padding: 'var(--space-md)', color: 'var(--color-error)' }}>{error}</p>}
      {tab !== 'matches' && (
        <div style={{ padding: 'var(--space-md)' }}>
          {people.map(person => {
            const liked = likedUserIds.includes(person.id)
            return (
              <div key={person.id} style={personCardStyle}>
                <Link to={`/users/${person.id}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, color: 'inherit', textDecoration: 'none' }}>
                  <Avatar src={person.avatar} alt={person.display_name} size="md" />
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ display: 'block' }}>{person.display_name}, {person.age}</strong>
                    <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{person.location?.city}</span>
                  </div>
                </Link>
                <button type="button" onClick={() => toggleLike(person.id)} style={likeButtonStyle(tab === 'sent' || liked)}>
                  {tab === 'sent' ? 'Unlike' : liked ? 'Liked' : 'Like back'}
                </button>
              </div>
            )
          })}
          {!error && people.length === 0 && <div style={emptyStyle}>{tab === 'received' ? 'No likes to show right now.' : 'Profiles you like will appear here.'}</div>}
        </div>
      )}
      {tab === 'matches' && (
        <>
          <p style={{ ...helperStyle, padding: 'var(--space-md) var(--space-md) 0' }}>Your conversations with mutual matches.</p>
          {matches.length ? <MatchList matches={matches} /> : !error && <div style={emptyStyle}>Your matches will appear here.</div>}
        </>
      )}
    </>
  )
}

const tabStyle = active => ({ flex: 1, padding: '14px 6px', border: 'none', borderBottom: active ? '2px solid var(--color-primary)' : '2px solid transparent', background: 'transparent', color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)', font: 'inherit', fontSize: '13px', fontWeight: 700, cursor: 'pointer' })
const helperStyle = { color: 'var(--color-text-secondary)', fontSize: '13px', margin: '0 0 12px' }
const personCardStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '12px', marginBottom: '10px', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-sm)' }
const likeButtonStyle = liked => ({ flexShrink: 0, padding: '9px 13px', border: liked ? '1px solid var(--color-border)' : 'none', borderRadius: 'var(--radius-full)', background: liked ? 'transparent' : 'var(--color-primary)', color: liked ? 'var(--color-text-secondary)' : 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer' })
const emptyStyle = { padding: '24px', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', textAlign: 'center', color: 'var(--color-text-secondary)' }
