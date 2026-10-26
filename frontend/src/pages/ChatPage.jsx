import { useCallback, useEffect, useRef, useState } from 'react'
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
  const [otherUserTyping, setOtherUserTyping] = useState(false)
  const lastTypingUpdate = useRef(0)
  const typingTimeout = useRef(null)
  const latestMessageAt = useRef(null)
  const matchLoaded = useRef(false)
  const activeMatchId = useRef(matchId)

  const loadConversation = useCallback(async () => {
    if (activeMatchId.current !== matchId) {
      activeMatchId.current = matchId
      latestMessageAt.current = null
      matchLoaded.current = false
      setMessages([])
      setMatch(null)
    }
    const cursor = latestMessageAt.current
    const messagePath = `/api/v1/matches/${matchId}/messages/${cursor ? `?after=${encodeURIComponent(cursor)}` : ''}`
    const [matchResponse, messageResponse, activity] = await Promise.all([
      matchLoaded.current ? Promise.resolve(null) : api.get('/api/v1/matches/'),
      api.get(messagePath),
      api.get(`/api/v1/matches/${matchId}/messages/activity/`)
    ])
    if (matchResponse) {
      const matches = matchResponse.results || matchResponse
      setMatch(matches.find(item => item.id === matchId) || null)
      matchLoaded.current = true
    }
    for (const message of messageResponse) {
      if (!latestMessageAt.current || message.created_at > latestMessageAt.current) {
        latestMessageAt.current = message.created_at
      }
    }
    setMessages(current => {
      const updates = new Map(messageResponse.map(message => [message.id, message]))
      const knownIds = new Set(current.map(message => message.id))
      return [
        ...current.map(message => updates.get(message.id) || message),
        ...messageResponse.filter(message => !knownIds.has(message.id))
      ]
    })
    setOtherUserTyping(activity.other_user_typing)
  }, [matchId, user?.id])

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
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        load().catch(err => {
          if (active) setError(err.message || 'Conversation could not be refreshed.')
        })
      }
    }, 3000)
    return () => {
      active = false
      window.clearInterval(interval)
      window.clearTimeout(typingTimeout.current)
    }
  }, [loadConversation])

  const handleTyping = () => {
    const now = Date.now()
    if (now - lastTypingUpdate.current < 2000) return
    lastTypingUpdate.current = now
    api.post(`/api/v1/matches/${matchId}/messages/activity/`, { typing: true })
      .catch(err => console.error('Could not update typing status:', err))
    window.clearTimeout(typingTimeout.current)
    typingTimeout.current = window.setTimeout(() => {
      api.post(`/api/v1/matches/${matchId}/messages/activity/`, { typing: false })
        .catch(err => console.error('Could not clear typing status:', err))
    }, 2500)
  }

  const handleSendMessage = async text => {
    const message = await api.post(`/api/v1/matches/${matchId}/messages/`, { text })
    latestMessageAt.current = message.created_at
    setMessages(current => [...current, message])
    window.clearTimeout(typingTimeout.current)
    lastTypingUpdate.current = 0
    api.post(`/api/v1/matches/${matchId}/messages/activity/`, { typing: false })
      .catch(err => console.error('Could not clear typing status:', err))
  }

  if (error) return <div role="alert" style={{ padding: 'var(--space-xl)' }}>{error}</div>
  if (!match) {
    return <div role="status" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>Loading conversation...</div>
  }

  return (
    <MessageThread
      match={match}
      messages={messages}
      currentUserId={user?.id}
      otherUserTyping={otherUserTyping}
      onTyping={handleTyping}
      onSendMessage={handleSendMessage}
    />
  )
}
