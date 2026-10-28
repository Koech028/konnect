import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Camera, CameraOff, Mic, MicOff, Radio, VideoOff } from 'lucide-react'
import { Room, RoomEvent, Track } from 'livekit-client'
import { api } from '../utils/api'
import { useAuth } from '../context/AuthContext'

const giftEmojis = { rose: '🌹', heart: '💖', star: '⭐', wave: '🌊' }

function ParticipantTile({ participant, local = false }) {
  const videoRef = useRef(null)
  const audioRef = useRef(null)
  const videoTrack = participant.getTrackPublication(Track.Source.Camera)?.track
  const audioTrack = participant.getTrackPublication(Track.Source.Microphone)?.track

  useEffect(() => {
    if (videoRef.current && videoTrack) videoTrack.attach(videoRef.current)
    if (audioRef.current && audioTrack) audioTrack.attach(audioRef.current)
    return () => {
      if (videoRef.current && videoTrack) videoTrack.detach(videoRef.current)
      if (audioRef.current && audioTrack) audioTrack.detach(audioRef.current)
    }
  }, [videoTrack, audioTrack])

  return (
    <div style={tileStyle}>
      {videoTrack
        ? <video ref={videoRef} autoPlay playsInline muted={local} style={videoStyle} />
        : <div style={placeholderStyle}><VideoOff size={30} /><span>{participant.name || 'Guest'}</span></div>}
      <audio ref={audioRef} autoPlay />
      <span style={participantNameStyle}>{participant.name || 'Guest'}{local ? ' (you)' : ''}</span>
    </div>
  )
}

export default function LiveRoomPage() {
  const { streamId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [stream, setStream] = useState(null)
  const [credentials, setCredentials] = useState(null)
  const [room, setRoom] = useState(null)
  const [, setRefreshCount] = useState(0)
  const [balance, setBalance] = useState(0)
  const [promotionalBalance, setPromotionalBalance] = useState(0)
  const [purchasedBalance, setPurchasedBalance] = useState(0)
  const [giftCatalog, setGiftCatalog] = useState([])
  const [giftEvents, setGiftEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [entryConfirmationRequired, setEntryConfirmationRequired] = useState(false)
  const [joining, setJoining] = useState(false)
  const [sendingGift, setSendingGift] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [cameraEnabled, setCameraEnabled] = useState(false)
  const [microphoneEnabled, setMicrophoneEnabled] = useState(false)
  const [cameraBusy, setCameraBusy] = useState(false)
  const [microphoneBusy, setMicrophoneBusy] = useState(false)
  const roomRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [streamData, walletData] = await Promise.all([
          api.get(`/api/v1/live/${streamId}/`),
          api.get('/api/v1/live/wallet/')
        ])
        if (cancelled) return
        setStream(streamData)
        setBalance(walletData.balance)
        setPromotionalBalance(walletData.promotional_balance)
        setPurchasedBalance(walletData.purchased_balance)
        setGiftCatalog(walletData.gift_catalog)
        const requiresConfirmation = (
          streamData.host_id !== user?.id
          && streamData.entry_price > 0
          && !streamData.has_access
        )
        setEntryConfirmationRequired(requiresConfirmation)
        if (!requiresConfirmation) {
          const joinData = await api.post(`/api/v1/live/${streamId}/join/`, {})
          if (!cancelled) {
            setCredentials(joinData)
            if (joinData.wallet_balance !== null) setBalance(joinData.wallet_balance)
            if (joinData.promotional_balance !== null) setPromotionalBalance(joinData.promotional_balance)
            if (joinData.purchased_balance !== null) setPurchasedBalance(joinData.purchased_balance)
          }
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'This live stream could not be joined.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [streamId, user?.id])

  const confirmPaidEntry = async () => {
    if (joining) return
    setJoining(true)
    setError('')
    try {
      const joinData = await api.post(`/api/v1/live/${streamId}/join/`, {})
      setCredentials(joinData)
      if (joinData.wallet_balance !== null) setBalance(joinData.wallet_balance)
      if (joinData.promotional_balance !== null) setPromotionalBalance(joinData.promotional_balance)
      if (joinData.purchased_balance !== null) setPurchasedBalance(joinData.purchased_balance)
      setEntryConfirmationRequired(false)
    } catch (err) {
      setError(err.message || 'This live stream could not be joined.')
    } finally {
      setJoining(false)
    }
  }

  useEffect(() => {
    if (!credentials || !stream) return undefined
    let cancelled = false
    const liveRoom = new Room({ adaptiveStream: true, dynacast: true })
    roomRef.current = liveRoom
    const refreshParticipants = () => setRefreshCount(count => count + 1)
    const handleData = (payload, participant) => {
      try {
        const event = JSON.parse(new TextDecoder().decode(payload))
        if (event.type === 'gift' && event.gift && participant?.identity === event.gift.sender_id) {
          setGiftEvents(events => [event.gift, ...events].slice(0, 5))
        }
        if (event.type === 'stream-ended' && participant?.identity === stream.host_id) {
          setMessage('The host ended this live stream.')
          setTimeout(() => navigate('/live'), 1500)
        }
      } catch (err) {
        console.error('Could not read a live room event:', err)
      }
    }

    liveRoom.on(RoomEvent.TrackSubscribed, refreshParticipants)
    liveRoom.on(RoomEvent.TrackUnsubscribed, refreshParticipants)
    liveRoom.on(RoomEvent.TrackPublished, refreshParticipants)
    liveRoom.on(RoomEvent.TrackUnpublished, refreshParticipants)
    liveRoom.on(RoomEvent.LocalTrackPublished, refreshParticipants)
    liveRoom.on(RoomEvent.LocalTrackUnpublished, refreshParticipants)
    liveRoom.on(RoomEvent.ParticipantConnected, refreshParticipants)
    liveRoom.on(RoomEvent.ParticipantDisconnected, refreshParticipants)
    liveRoom.on(RoomEvent.DataReceived, handleData)
    liveRoom.on(RoomEvent.Disconnected, () => setIsConnected(false))

    const connect = async () => {
      try {
        await liveRoom.connect(credentials.server_url, credentials.token)
        if (cancelled) {
          await liveRoom.disconnect()
          return
        }
        if (!cancelled) {
          setRoom(liveRoom)
          setIsConnected(true)
          refreshParticipants()
        }
        if (stream.host_id === user?.id) {
          if (!window.isSecureContext) {
            setError('Camera and microphone require HTTPS, or localhost during development.')
            return
          }
          const permissionErrors = []
          try {
            await liveRoom.localParticipant.setCameraEnabled(true)
            if (!cancelled) setCameraEnabled(true)
          } catch (err) {
            permissionErrors.push(`Camera: ${err.message || 'permission was not granted'}`)
          }
          try {
            await liveRoom.localParticipant.setMicrophoneEnabled(true)
            if (!cancelled) setMicrophoneEnabled(true)
          } catch (err) {
            permissionErrors.push(`Microphone: ${err.message || 'permission was not granted'}`)
          }
          if (!cancelled && permissionErrors.length) {
            setError(`${permissionErrors.join('. ')}. Check browser permissions and use the controls below to retry.`)
          }
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not connect to the live video room.')
      }
    }
    connect()
    return () => {
      cancelled = true
      liveRoom.removeAllListeners()
      liveRoom.disconnect()
      roomRef.current = null
      setRoom(null)
      setIsConnected(false)
      setCameraEnabled(false)
      setMicrophoneEnabled(false)
    }
  }, [credentials, navigate, stream, user?.id])

  const isHost = stream?.host_id === user?.id
  const remoteParticipants = room ? Array.from(room.remoteParticipants.values()) : []
  const localParticipant = room?.localParticipant

  const toggleCamera = async () => {
    if (!roomRef.current || !isConnected || cameraBusy) return
    setCameraBusy(true)
    setError('')
    try {
      await roomRef.current.localParticipant.setCameraEnabled(!cameraEnabled)
      setCameraEnabled(value => !value)
    } catch (err) {
      setError(`Camera could not be ${cameraEnabled ? 'turned off' : 'enabled'}: ${err.message || 'check browser camera permissions.'}`)
    } finally {
      setCameraBusy(false)
    }
  }

  const toggleMicrophone = async () => {
    if (!roomRef.current || !isConnected || microphoneBusy) return
    setMicrophoneBusy(true)
    setError('')
    try {
      await roomRef.current.localParticipant.setMicrophoneEnabled(!microphoneEnabled)
      setMicrophoneEnabled(value => !value)
    } catch (err) {
      setError(`Microphone could not be ${microphoneEnabled ? 'muted' : 'enabled'}: ${err.message || 'check browser microphone permissions.'}`)
    } finally {
      setMicrophoneBusy(false)
    }
  }

  const sendGift = async gift => {
    if (!roomRef.current || sendingGift) return
    setSendingGift(true)
    setError('')
    setMessage('')
    try {
      const result = await api.post(`/api/v1/live/${streamId}/gifts/`, { gift_type: gift.type })
      setBalance(result.wallet_balance)
      setPromotionalBalance(result.promotional_balance)
      setPurchasedBalance(result.purchased_balance)
      try {
        await roomRef.current.localParticipant.publishData(
          new TextEncoder().encode(JSON.stringify({ type: 'gift', gift: result.gift })),
          { reliable: true }
        )
        setMessage(`You sent ${gift.name} to ${stream.host_name}.`)
      } catch (err) {
        setMessage(`Your ${gift.name} was sent, but the room could not show the live notification.`)
        console.error('Gift was recorded but the live notification failed:', err)
      }
    } catch (err) {
      setError(err.message || 'Your gift could not be sent.')
    } finally {
      setSendingGift(false)
    }
  }

  const endStream = async () => {
    setError('')
    try {
      await api.post(`/api/v1/live/${streamId}/end/`, {})
      try {
        await roomRef.current?.localParticipant.publishData(
          new TextEncoder().encode(JSON.stringify({ type: 'stream-ended' })),
          { reliable: true }
        )
      } catch (err) {
        console.error('The stream ended, but the end notification could not be delivered:', err)
      }
      await roomRef.current?.disconnect()
      navigate('/live')
    } catch (err) {
      setError(err.message || 'The live stream could not be ended.')
    }
  }

  if (loading) return <p role="status" style={{ padding: 24 }}>Joining live stream…</p>
  if (!stream && error) return <div style={{ padding: 24 }}><p role="alert" style={errorStyle}>{error}</p><button type="button" onClick={() => navigate('/live')} style={secondaryButtonStyle}>Back to live streams</button></div>
  if (stream && entryConfirmationRequired && !credentials) {
    const canAffordEntry = balance >= stream.entry_price
    return (
      <div style={entryGateStyle}>
        <section style={entryGateCardStyle}>
          <h2 style={{ margin: '0 0 8px', fontSize: 22 }}>Join {stream.host_name}’s live?</h2>
          <p style={{ margin: '0 0 16px', color: 'var(--color-text-secondary)' }}>{stream.title}</p>
          <p style={entryCostStyle}>{stream.entry_price} credits</p>
          <p style={{ margin: '0 0 18px', color: 'var(--color-text-secondary)', fontSize: 14 }}>
            Your balance: {balance} credits (bonus {promotionalBalance}, purchased {purchasedBalance}). This entry fee is charged once; reconnecting will not charge again.
          </p>
          {!canAffordEntry && <p role="alert" style={errorStyle}>You need {stream.entry_price - balance} more credits to join.</p>}
          {error && canAffordEntry && <p role="alert" style={errorStyle}>{error}</p>}
          <button type="button" disabled={!canAffordEntry || joining} onClick={confirmPaidEntry} style={joinPaidButtonStyle}>
            {joining ? 'Joining…' : `Join for ${stream.entry_price} credits`}
          </button>
          <button type="button" onClick={() => navigate('/live')} style={backToLiveButtonStyle}>Not now</button>
        </section>
      </div>
    )
  }

  return (
    <div style={{ padding: 'var(--space-md)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <button type="button" aria-label="Back to live streams" onClick={() => navigate('/live')} style={backButtonStyle}><ArrowLeft size={19} /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 18 }}>{stream?.title}</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>{stream?.host_name} · {isConnected ? 'Connected' : 'Connecting…'}</p>
        </div>
        <span style={liveBadgeStyle}><Radio size={14} /> LIVE</span>
      </div>

      {error && <p role="alert" style={errorStyle}>{error}</p>}
      {message && <p role="status" style={messageStyle}>{message}</p>}

      <section aria-label="Live video" style={stageStyle}>
        {localParticipant && isHost && <ParticipantTile participant={localParticipant} local />}
        {remoteParticipants.map(participant => <ParticipantTile key={participant.identity} participant={participant} />)}
        {!isConnected && <div style={connectingStyle}>Connecting to the live video service…</div>}
        {isConnected && !isHost && remoteParticipants.length === 0 && <div style={connectingStyle}>Waiting for the host to connect…</div>}
      </section>

      {giftEvents.length > 0 && (
        <div aria-live="polite" style={{ marginTop: 10 }}>
          {giftEvents.map((gift, index) => <p key={`${gift.id}-${index}`} style={giftEventStyle}>🎁 {gift.sender_name} sent a {gift.gift_name} · {gift.credits} credits</p>)}
        </div>
      )}

      <section style={controlsStyle}>
        {isHost
          ? <>
            <div style={deviceControlsStyle}>
              <button type="button" onClick={toggleCamera} disabled={!isConnected || cameraBusy} aria-pressed={cameraEnabled} style={deviceButtonStyle}>
                {cameraEnabled ? <Camera size={18} /> : <CameraOff size={18} />}
                {cameraBusy ? 'Updating camera…' : cameraEnabled ? 'Turn camera off' : 'Turn camera on'}
              </button>
              <button type="button" onClick={toggleMicrophone} disabled={!isConnected || microphoneBusy} aria-pressed={microphoneEnabled} style={deviceButtonStyle}>
                {microphoneEnabled ? <Mic size={18} /> : <MicOff size={18} />}
                {microphoneBusy ? 'Updating microphone…' : microphoneEnabled ? 'Mute microphone' : 'Enable microphone'}
              </button>
            </div>
            <p style={deviceHelpStyle}>Allow camera and microphone access in your browser. Live video requires HTTPS or localhost.</p>
            <button type="button" onClick={endStream} style={endButtonStyle}>End live stream</button>
          </>
          : <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <strong style={{ fontSize: 14 }}>Send a gift</strong>
              <span style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>{balance} credits</span>
            </div>
            <p style={{ margin: '0 0 10px', color: 'var(--color-text-tertiary)', fontSize: 11 }}>
              Bonus: {promotionalBalance} · Purchased: {purchasedBalance}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
              {giftCatalog.map(gift => (
                <button
                  key={gift.type}
                  type="button"
                  disabled={sendingGift || !isConnected}
                  onClick={() => sendGift(gift)}
                  style={giftButtonStyle}
                >
                  <span style={{ fontSize: 23 }}>{giftEmojis[gift.type]}</span>
                  <span>{gift.name}</span>
                  <small>{gift.credits ? `${gift.credits} credits` : 'Free'}</small>
                </button>
              ))}
            </div>
          </>}
      </section>
      {!isHost && stream && (
        <p style={reportStyle}><Link to={`/safety?userId=${stream.host_id}`} style={{ color: 'inherit' }}>Report this host</Link></p>
      )}
    </div>
  )
}

const tileStyle = { position: 'relative', minHeight: 220, overflow: 'hidden', borderRadius: 'var(--radius-lg)', background: '#171717' }
const videoStyle = { width: '100%', height: '100%', minHeight: 220, objectFit: 'cover' }
const placeholderStyle = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 220, color: '#fff' }
const participantNameStyle = { position: 'absolute', left: 10, bottom: 8, padding: '3px 8px', borderRadius: 14, background: 'rgba(0,0,0,.6)', color: '#fff', fontSize: 12 }
const stageStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, minHeight: 260, padding: 8, borderRadius: 'var(--radius-lg)', background: '#111' }
const connectingStyle = { gridColumn: '1 / -1', alignSelf: 'center', textAlign: 'center', color: '#fff', padding: 16 }
const controlsStyle = { marginTop: 14, padding: 14, borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-sm)' }
const entryGateStyle = { minHeight: 'calc(100vh - var(--header-height) - var(--bottom-nav-height))', display: 'grid', placeItems: 'center', padding: 'var(--space-md)' }
const entryGateCardStyle = { width: 'min(100%, 440px)', padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-md)', textAlign: 'center' }
const entryCostStyle = { margin: '0 0 8px', color: 'var(--color-primary)', fontSize: 28, fontWeight: 800 }
const joinPaidButtonStyle = { width: '100%', padding: 13, border: 0, borderRadius: 'var(--radius-md)', background: 'var(--color-primary)', color: '#fff', font: 'inherit', fontWeight: 700, cursor: 'pointer' }
const backToLiveButtonStyle = { width: '100%', marginTop: 8, padding: 12, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'transparent', color: 'var(--color-text-secondary)', font: 'inherit', cursor: 'pointer' }
const deviceControlsStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginBottom: 8 }
const deviceButtonStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: 11, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg)', color: 'var(--color-text-primary)', font: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const deviceHelpStyle = { margin: '4px 0 12px', color: 'var(--color-text-secondary)', fontSize: 12 }
const backButtonStyle = { display: 'grid', placeItems: 'center', width: 38, height: 38, border: '1px solid var(--color-border)', borderRadius: '50%', background: 'var(--color-surface)', color: 'var(--color-text-primary)', cursor: 'pointer' }
const liveBadgeStyle = { display: 'flex', alignItems: 'center', gap: 5, color: 'var(--color-primary-dark)', background: 'var(--color-primary-soft)', borderRadius: 20, padding: '5px 9px', fontSize: 11, fontWeight: 800 }
const errorStyle = { color: 'var(--color-error)', padding: '8px 0', fontSize: 13 }
const messageStyle = { color: 'var(--color-success)', padding: '8px 0', fontSize: 13 }
const giftEventStyle = { padding: '7px 10px', marginBottom: 5, borderRadius: 'var(--radius-full)', background: 'var(--color-secondary-soft)', fontSize: 13, animation: 'fadeInUp var(--transition-base)' }
const giftButtonStyle = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '10px 4px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg)', color: 'var(--color-text-primary)', font: 'inherit', fontSize: 13, cursor: 'pointer' }
const endButtonStyle = { width: '100%', padding: 12, border: 0, borderRadius: 'var(--radius-md)', background: 'var(--color-error)', color: '#fff', font: 'inherit', fontWeight: 700, cursor: 'pointer' }
const secondaryButtonStyle = { marginTop: 12, padding: 10, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', color: 'var(--color-text-primary)', font: 'inherit', cursor: 'pointer' }
const reportStyle = { margin: '12px 0', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13 }
