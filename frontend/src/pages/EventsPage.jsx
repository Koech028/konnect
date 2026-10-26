import { useEffect, useState } from 'react'
import { CalendarDays, MapPin, Users } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import { api } from '../utils/api'
import { useAuth } from '../context/AuthContext'

function localDateTime(date) {
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export default function EventsPage() {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [capacity, setCapacity] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)

  const loadEvents = () => api.get('/api/v1/events/').then(setEvents)

  useEffect(() => {
    loadEvents()
      .catch(err => setError(err.message || 'Events could not be loaded.'))
      .finally(() => setLoading(false))
  }, [])

  const createEvent = async event => {
    event.preventDefault()
    setError('')
    setNotice('')
    try {
      await api.post('/api/v1/events/', {
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
        capacity: capacity ? Number(capacity) : null
      })
      setTitle('')
      setDescription('')
      setLocation('')
      setStartsAt('')
      setEndsAt('')
      setCapacity('')
      setNotice('Your event is published.')
      await loadEvents()
    } catch (err) {
      setError(err.message || 'Your event could not be created.')
    }
  }

  const toggleRsvp = async event => {
    try {
      const result = await api.post(`/api/v1/events/${event.id}/`, {})
      setEvents(current => current.map(item => item.id === event.id
        ? { ...item, attending: result.attending, attendee_count: result.attendee_count }
        : item))
      setError('')
    } catch (err) {
      setError(err.message || 'Your RSVP could not be saved.')
    }
  }

  return (
    <>
      <PageHeader title="Meet up" />
      <div style={{ padding: 'var(--space-md)' }}>
        <section style={cardStyle}>
          <h2 style={headingStyle}>Plan a real-world date</h2>
          <p style={helperStyle}>Choose a public place. Never post private contact or home-address details.</p>
          <form onSubmit={createEvent}>
            <label style={labelStyle}>Event name<input required maxLength={100} value={title} onChange={event => setTitle(event.target.value)} placeholder="Coffee and conversation" style={fieldStyle} /></label>
            <label style={labelStyle}>Public meeting place<input required maxLength={200} value={location} onChange={event => setLocation(event.target.value)} placeholder="Cafe or public venue" style={fieldStyle} /></label>
            <label style={labelStyle}>About the event<textarea maxLength={1000} rows={3} value={description} onChange={event => setDescription(event.target.value)} style={{ ...fieldStyle, resize: 'vertical' }} /></label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label style={labelStyle}>Starts<input required type="datetime-local" min={localDateTime(new Date())} value={startsAt} onChange={event => setStartsAt(event.target.value)} style={fieldStyle} /></label>
              <label style={labelStyle}>Ends<input required type="datetime-local" min={startsAt || localDateTime(new Date())} value={endsAt} onChange={event => setEndsAt(event.target.value)} style={fieldStyle} /></label>
            </div>
            <label style={labelStyle}>Attendee limit (optional)<input type="number" min="2" max="500" value={capacity} onChange={event => setCapacity(event.target.value)} placeholder="No limit" style={fieldStyle} /></label>
            <button type="submit" style={primaryButtonStyle}><CalendarDays size={17} /> Publish event</button>
          </form>
        </section>

        {error && <p role="alert" style={errorStyle}>{error}</p>}
        {notice && <p role="status" style={noticeStyle}>{notice}</p>}
        <h2 style={{ ...headingStyle, margin: '22px 2px 12px' }}>Upcoming events</h2>
        {loading && <p role="status" style={helperStyle}>Loading events…</p>}
        {!loading && events.length === 0 && <p style={helperStyle}>There are no upcoming events yet. Create one to get started.</p>}
        <div style={{ display: 'grid', gap: 12 }}>
          {events.map(event => (
            <article key={event.id} style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <h3 style={{ fontSize: 17 }}>{event.title}</h3>
                  <p style={helperStyle}>Hosted by {event.host_name}</p>
                </div>
                <span style={dateBadgeStyle}>{new Date(event.starts_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
              </div>
              {event.description && <p style={{ margin: '10px 0', fontSize: 14, lineHeight: 1.5 }}>{event.description}</p>}
              <p style={detailStyle}><MapPin size={15} />{event.location}</p>
              <p style={detailStyle}><CalendarDays size={15} />{new Date(event.starts_at).toLocaleString()} – {new Date(event.ends_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                <span style={detailStyle}><Users size={15} />{event.attendee_count}{event.capacity ? ` / ${event.capacity}` : ''} attending</span>
                <button type="button" disabled={event.host_id === user?.id} onClick={() => toggleRsvp(event)} style={event.host_id === user?.id ? hostButtonStyle : primaryButtonStyle}>
                  {event.host_id === user?.id ? 'You are hosting' : event.attending ? 'Cancel RSVP' : 'I’m interested'}
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </>
  )
}

const cardStyle = { padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-sm)', marginBottom: 'var(--space-md)' }
const headingStyle = { fontSize: 18, marginBottom: 7 }
const helperStyle = { fontSize: 13, lineHeight: 1.5, color: 'var(--color-text-secondary)', margin: '4px 0 12px' }
const labelStyle = { display: 'block', margin: '12px 0', fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }
const fieldStyle = { display: 'block', width: '100%', marginTop: 6, padding: '11px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg)', color: 'var(--color-text-primary)', font: 'inherit', fontSize: 14 }
const primaryButtonStyle = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 14px', border: 0, borderRadius: 'var(--radius-md)', background: 'var(--color-primary)', color: '#fff', font: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer' }
const hostButtonStyle = { ...primaryButtonStyle, background: 'var(--color-border)', color: 'var(--color-text-secondary)', cursor: 'default' }
const dateBadgeStyle = { padding: '5px 9px', borderRadius: 'var(--radius-full)', background: 'var(--color-primary-soft)', color: 'var(--color-primary-dark)', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }
const detailStyle = { display: 'flex', alignItems: 'center', gap: 7, color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 8 }
const errorStyle = { margin: '10px 0', color: 'var(--color-error)', fontSize: 13 }
const noticeStyle = { margin: '10px 0', color: 'var(--color-success)', fontSize: 13 }
