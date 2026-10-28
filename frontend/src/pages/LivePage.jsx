import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Radio, Video, Wallet } from 'lucide-react'
import Avatar from '../components/common/Avatar'
import { api } from '../utils/api'

export default function LivePage() {
  const navigate = useNavigate()
  const [streams, setStreams] = useState([])
  const [balance, setBalance] = useState(0)
  const [promotionalBalance, setPromotionalBalance] = useState(0)
  const [purchasedBalance, setPurchasedBalance] = useState(0)
  const [pendingCreatorEarnings, setPendingCreatorEarnings] = useState('0.00')
  const [title, setTitle] = useState('')
  const [entryPrice, setEntryPrice] = useState('0')
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')

  const loadStreams = useCallback(() => {
    setLoading(true)
    return api.get('/api/v1/live/')
      .then(response => {
        setStreams(response.results)
        setBalance(response.wallet_balance)
        setPromotionalBalance(response.promotional_balance)
        setPurchasedBalance(response.purchased_balance)
        setPendingCreatorEarnings(response.pending_creator_earnings_kes)
      })
      .catch(err => setError(err.message || 'Live streams could not be loaded.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadStreams()
  }, [loadStreams])

  const startStream = async event => {
    event.preventDefault()
    setError('')
    setStarting(true)
    try {
      const stream = await api.post('/api/v1/live/', {
        title: title.trim(),
        entry_price: Number(entryPrice)
      })
      navigate(`/live/${stream.id}`)
    } catch (err) {
      setError(err.message || 'Your live stream could not be started.')
    } finally {
      setStarting(false)
    }
  }

  return (
    <div style={{ padding: 'var(--space-md)' }}>
      <header style={{ marginBottom: 'var(--space-md)' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 22 }}>
          <Radio color="var(--color-primary)" /> Live
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
          Meet people face to face, or drop into a live conversation.
        </p>
      </header>

      <div style={walletStyle}>
        <Wallet size={19} color="var(--color-primary)" />
        <span><strong>{balance}</strong> virtual credits</span>
        <span style={{ marginLeft: 'auto', color: 'var(--color-text-tertiary)', fontSize: 12 }}>
          Bonus {promotionalBalance} · Purchased {purchasedBalance}
        </span>
      </div>
      <p style={{ ...helperStyle, marginTop: 6 }}>Credit purchases and withdrawals are not available yet.</p>
      {Number(pendingCreatorEarnings) > 0 && (
        <p style={{ ...helperStyle, marginTop: 0 }}>
          Estimated creator earnings pending review: KSh {pendingCreatorEarnings}. This is not payable or withdrawable yet.
        </p>
      )}

      <form onSubmit={startStream} style={cardStyle}>
        <h3 style={{ fontSize: 17, marginBottom: 8 }}>Start a live video</h3>
        <p style={helperStyle}>Your camera and microphone will be requested when you go live.</p>
        <input
          aria-label="Live stream title"
          maxLength={80}
          value={title}
          onChange={event => setTitle(event.target.value)}
          placeholder="Add a topic (optional)"
          style={inputStyle}
        />
        <label htmlFor="live-entry-price" style={entryLabelStyle}>Entry fee in credits</label>
        <input
          id="live-entry-price"
          type="number"
          min="0"
          max="100"
          step="1"
          value={entryPrice}
          onChange={event => setEntryPrice(event.target.value)}
          style={inputStyle}
        />
        <p style={helperStyle}>0 is free. Entry is charged once per viewer; reconnecting will not charge again. Maximum 100 credits.</p>
        <button type="submit" disabled={starting} style={buttonStyle}>
          <Video size={17} /> {starting ? 'Starting…' : 'Go live'}
        </button>
      </form>

      {error && <p role="alert" style={errorStyle}>{error}</p>}

      <h3 style={{ fontSize: 17, margin: '22px 0 12px' }}>Live now</h3>
      {loading && <p role="status" style={helperStyle}>Finding live streams…</p>}
      {!loading && !streams.length && <p style={helperStyle}>No one is live right now. Start a stream and be the first.</p>}
      <div style={{ display: 'grid', gap: 12 }}>
        {streams.map(stream => (
          <button
            key={stream.id}
            type="button"
            onClick={() => navigate(`/live/${stream.id}`)}
            style={streamCardStyle}
          >
            <Avatar src={stream.host_avatar_url} alt={stream.host_name} size="md" />
            <span style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
              <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stream.title}</strong>
              <span style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>{stream.host_name} · {stream.entry_price ? `${stream.entry_price} credits to join` : 'Free to join'}</span>
            </span>
            <span style={liveBadgeStyle}><span style={dotStyle} /> LIVE</span>
          </button>
        ))}
      </div>
    </div>
  )
}

const cardStyle = { padding: 'var(--space-lg)', marginTop: 16, borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-sm)' }
const helperStyle = { color: 'var(--color-text-secondary)', fontSize: 13, margin: '4px 0 12px' }
const inputStyle = { width: '100%', padding: '12px 14px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg)', color: 'var(--color-text-primary)', font: 'inherit' }
const entryLabelStyle = { display: 'block', margin: '14px 0 6px', fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }
const buttonStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', marginTop: 12, padding: 12, border: 0, borderRadius: 'var(--radius-md)', background: 'var(--color-primary)', color: '#fff', font: 'inherit', fontWeight: 700, cursor: 'pointer' }
const walletStyle = { display: 'flex', alignItems: 'center', gap: 9, padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-sm)' }
const streamCardStyle = { display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: 14, border: '1px solid var(--color-border-light)', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', color: 'var(--color-text-primary)', font: 'inherit', cursor: 'pointer' }
const liveBadgeStyle = { display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px', borderRadius: 'var(--radius-full)', background: 'var(--color-primary-soft)', color: 'var(--color-primary-dark)', fontSize: 11, fontWeight: 800 }
const dotStyle = { width: 7, height: 7, borderRadius: '50%', background: 'var(--color-primary)' }
const errorStyle = { marginTop: 10, color: 'var(--color-error)', fontSize: 13 }
