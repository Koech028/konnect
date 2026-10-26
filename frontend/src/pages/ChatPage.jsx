import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import MessageThread from '../components/messages/MessageThread'
import { api } from '../utils/api'
import { useAuth } from '../context/AuthContext'

export default function ChatPage() {
  const { matchId } = useParams()
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [match, setMatch] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api.get('/api/v1/matches/'), api.get(`/api/v1/matches/${matchId}/messages/`)])
      .then(([matchResponse, messageResponse]) => {
        const matches = matchResponse.results || matchResponse
        setMatch(matches.find(item => item.id === matchId) || null)
        setMessages(messageResponse)
      })
      .catch(err => setError(err.message || 'Conversation could not be loaded.'))
  }, [matchId])

  const handleSendMessage = async (text) => {
    const message = await api.post(`/api/v1/matches/${matchId}/messages/`, { text })
    setMessages(current => [...current, message])
  }

  if (error) return <div role="alert" style={{ padding: 'var(--space-xl)' }}>{error}</div>
  if (!match) {
    return <div role="status" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>Loading conversation...</div>
  }

  return <MessageThread match={match} messages={messages} currentUserId={user?.id} onSendMessage={handleSendMessage} />
}
