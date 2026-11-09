import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, Camera, Flag, MapPin, MessageCircle, Plus, Tag, Users } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import { useAuth } from '../context/AuthContext'
import { api } from '../utils/api'
import { uploadImage } from '../utils/uploadImage'

function localDateTime(date) {
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

const defaultStart = new Date(Date.now() + 60 * 60 * 1000)
defaultStart.setMinutes(0, 0, 0)
const defaultEnd = new Date(defaultStart.getTime() + 2 * 60 * 60 * 1000)

export default function OffersPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [offers, setOffers] = useState([])
  const [city, setCity] = useState(user?.location?.city || '')
  const [category, setCategory] = useState('')
  const [priceFilter, setPriceFilter] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [title, setTitle] = useState('')
  const [offerCategory, setOfferCategory] = useState('hangout')
  const [description, setDescription] = useState('')
  const [offerCity, setOfferCity] = useState(user?.location?.city || '')
  const [location, setLocation] = useState('')
  const [start, setStart] = useState(localDateTime(defaultStart))
  const [end, setEnd] = useState(localDateTime(defaultEnd))
  const [activities, setActivities] = useState('')
  const [boundaries, setBoundaries] = useState('')
  const [price, setPrice] = useState('0')
  const [lunchExpectation, setLunchExpectation] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showOfferForm, setShowOfferForm] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadOffers = async (filters = {}) => {
    const query = new URLSearchParams()
    const selectedCity = filters.city ?? city
    const selectedCategory = filters.category ?? category
    const selectedPrice = filters.priceFilter ?? priceFilter
    const selectedDateFilter = filters.selectedDate ?? selectedDate
    if (selectedCity.trim()) query.set('city', selectedCity.trim())
    if (selectedCategory) query.set('category', selectedCategory)
    if (selectedPrice) query.set('price', selectedPrice)
    if (selectedDateFilter) query.set('date', selectedDateFilter)
    let result
    try {
      result = await api.get(`/api/v1/offers/${query.size ? `?${query}` : ''}`)
    } catch (err) {
      if (err.status === 404) {
        throw new Error('Hangouts and services are not available right now.')
      }
      throw err
    }
    setOffers(result)
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    loadOffers()
      .catch(err => { if (active) setError(err.message || 'Offers could not be loaded.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [city, category, priceFilter, selectedDate])

  const createOffer = async event => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setNotice('')
    try {
      const image_url = imageFile ? await uploadImage(imageFile) : ''
      const createdOffer = await api.post('/api/v1/offers/', {
        category: offerCategory,
        title: title.trim(),
        description: description.trim(),
        city: offerCity.trim(),
        location: location.trim(),
        starts_at: new Date(start).toISOString(),
        ends_at: new Date(end).toISOString(),
        image_url,
        activities: activities.split(',').map(value => value.trim()).filter(Boolean),
        boundaries: boundaries.trim(),
        price_ksh: Number(price),
        lunch_expectation: lunchExpectation
      })
      setTitle('')
      setDescription('')
      setLocation('')
      setActivities('')
      setBoundaries('')
      setPrice('0')
      setLunchExpectation('')
      setImageFile(null)
      setNotice('Your offer is published.')
      setShowOfferForm(false)
      setOffers(current => [
        createdOffer,
        ...current.filter(offer => offer.id !== createdOffer.id)
      ])
      setCity(offerCity.trim())
      setCategory('')
      setPriceFilter('')
      setSelectedDate('')
      try {
        await loadOffers({
          city: offerCity.trim(),
          category: '',
          priceFilter: '',
          selectedDate: ''
        })
      } catch (err) {
        setError(err.message || 'Your offer was published, but the list could not be refreshed.')
      }
    } catch (err) {
      setError(err.message || 'Your offer could not be published.')
    } finally {
      setSubmitting(false)
    }
  }

  const startConversation = async (offer, event) => {
    event.preventDefault()
    setError('')
    try {
      const result = await api.post(`/api/v1/offers/${offer.id}/messages/`, {
        text: event.currentTarget.message.value.trim()
      })
      navigate(`/offer-conversations/${result.conversation.id}`)
    } catch (err) {
      setError(err.message || 'Your message could not be sent.')
    }
  }

  const deactivateOffer = async offer => {
    try {
      await api.delete(`/api/v1/offers/${offer.id}/`)
      setOffers(current => current.filter(item => item.id !== offer.id))
      setNotice('Your offer is no longer listed.')
    } catch (err) {
      setError(err.message || 'The offer could not be removed.')
    }
  }

  const reportOffer = async (offer, event) => {
    event.preventDefault()
    try {
      await api.post('/api/v1/safety/content-reports/', {
        offer: offer.id,
        reason: event.currentTarget.reason.value,
        details: event.currentTarget.details.value.trim()
      })
      setNotice('Thanks. The offer has been reported to our moderation team.')
      event.currentTarget.reset()
    } catch (err) {
      setError(err.message || 'The offer could not be reported.')
    }
  }

  const cityLabel = useMemo(() => city.trim() || 'all cities', [city])

  return (
    <>
      <PageHeader title="Hangouts & services" />
      <div style={{ padding: 'var(--space-md)' }}>
        {!showOfferForm && (
          <button
            type="button"
            style={primaryButtonStyle}
            onClick={() => {
              setOfferCategory('service')
              setShowOfferForm(true)
              setError('')
              setNotice('')
            }}
          >
            <Plus size={17} /> Add a service
          </button>
        )}
        {showOfferForm && <section style={cardStyle} aria-labelledby="offer-form-heading">
          <h2 id="offer-form-heading" style={headingStyle}>Post an offer</h2>
          <p style={helperStyle}>Share a specific hangout or a service you offer. Meet in a public place and never post home addresses or private contact details.</p>
          <form onSubmit={createOffer}>
            <label style={labelStyle}>Offer type
              <select value={offerCategory} onChange={event => setOfferCategory(event.target.value)} style={fieldStyle}>
                <option value="hangout">Hangout or activity</option>
                <option value="service">Service</option>
              </select>
            </label>
            <label style={labelStyle}>Title
              <input required maxLength={100} value={title} onChange={event => setTitle(event.target.value)} placeholder="Coffee and a walk at Garden City" style={fieldStyle} />
            </label>
            <label style={labelStyle}>City
              <input required maxLength={100} value={offerCity} onChange={event => setOfferCity(event.target.value)} placeholder="Nairobi" style={fieldStyle} />
            </label>
            <label style={labelStyle}>Public venue
              <input required maxLength={200} value={location} onChange={event => setLocation(event.target.value)} placeholder="A public cafe, mall, or business venue" style={fieldStyle} />
            </label>
            <label style={labelStyle}>About this offer
              <textarea maxLength={1000} rows={3} value={description} onChange={event => setDescription(event.target.value)} placeholder="Share the details people should know." style={{ ...fieldStyle, resize: 'vertical' }} />
            </label>
            <label style={labelStyle}>Activities or service details (comma-separated)
              <input required maxLength={600} value={activities} onChange={event => setActivities(event.target.value)} placeholder="Coffee, board games, conversation" style={fieldStyle} />
            </label>
            <label style={labelStyle}>Do's and don'ts / boundaries
              <textarea required maxLength={1000} rows={3} value={boundaries} onChange={event => setBoundaries(event.target.value)} placeholder="State expectations, limits, and anything guests should know." style={{ ...fieldStyle, resize: 'vertical' }} />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label style={labelStyle}>Available from
                <input required type="datetime-local" min={localDateTime(new Date())} value={start} onChange={event => setStart(event.target.value)} style={fieldStyle} />
              </label>
              <label style={labelStyle}>Available until
                <input required type="datetime-local" min={start || localDateTime(new Date())} value={end} onChange={event => setEnd(event.target.value)} style={fieldStyle} />
              </label>
            </div>
            <label style={labelStyle}>Optional advertised price (KSh; 0 means free)
              <input required type="number" min="0" max="1000000" step="1" value={price} onChange={event => setPrice(event.target.value)} style={fieldStyle} />
            </label>
            <p style={helperStyle}>Price is informational only. LinkUp does not collect or process payment.</p>
            <label style={labelStyle}>Lunch expectation
              <select required value={lunchExpectation} onChange={event => setLunchExpectation(event.target.value)} style={fieldStyle}>
                <option value="">Choose one</option>
                <option value="no_expectation">No lunch expectation</option>
                <option value="optional">Lunch is optional</option>
                <option value="guest_pays">Guest is expected to pay for lunch</option>
              </select>
            </label>
            <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <Camera size={17} /> {imageFile?.name || 'Add an optional photo'}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setImageFile(event.target.files?.[0] || null)} style={{ width: 1, height: 1, opacity: 0 }} />
            </label>
            <button type="submit" disabled={submitting} style={primaryButtonStyle}>
              {submitting ? 'Publishing…' : 'Publish offer'}
            </button>
            <button type="button" disabled={submitting} onClick={() => setShowOfferForm(false)} style={{ ...secondaryButtonStyle, marginLeft: 8 }}>
              Cancel
            </button>
          </form>
        </section>}

        <section style={cardStyle}>
          <h2 style={headingStyle}>Browse {cityLabel}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
            <label style={labelStyle}>City
              <input maxLength={100} value={city} onChange={event => setCity(event.target.value)} placeholder="All cities" style={fieldStyle} />
            </label>
            <label style={labelStyle}>Type
              <select value={category} onChange={event => setCategory(event.target.value)} style={fieldStyle}>
                <option value="">All offers</option><option value="hangout">Hangouts</option><option value="service">Services</option>
              </select>
            </label>
            <label style={labelStyle}>Price
              <select value={priceFilter} onChange={event => setPriceFilter(event.target.value)} style={fieldStyle}>
                <option value="">Any price</option><option value="free">Free</option><option value="paid">Paid</option>
              </select>
            </label>
            <label style={labelStyle}>Date
              <input type="date" value={selectedDate} onChange={event => setSelectedDate(event.target.value)} style={fieldStyle} />
            </label>
          </div>
        </section>

        {error && <p role="alert" style={errorStyle}>{error}</p>}
        {notice && <p role="status" style={noticeStyle}>{notice}</p>}
        {loading && <p role="status" style={helperStyle}>Loading offers…</p>}
        {!loading && !error && !offers.length && <p style={helperStyle}>No upcoming offers in {cityLabel} yet.</p>}
        <div style={{ display: 'grid', gap: 12 }}>
          {offers.map(offer => (
            <article key={offer.id} style={cardStyle}>
              {offer.image_url && <img src={offer.image_url} alt="" style={offerImageStyle} />}
              <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <span style={categoryStyle}>{offer.category === 'service' ? 'Service' : 'Hangout'}</span>
                  <h3 style={{ fontSize: 17, margin: '6px 0' }}>{offer.title}</h3>
                  <p style={helperStyle}>By {offer.host_name}{offer.host_verification_status === 'verified' ? ' · Verified profile' : ''}, age {offer.host_age}</p>
                </div>
                <strong style={priceStyle}>{offer.price_ksh ? `KSh ${offer.price_ksh}` : 'Free'}</strong>
              </div>
              {offer.description && <p style={bodyStyle}>{offer.description}</p>}
              <p style={detailStyle}><MapPin size={15} />{offer.location} · {offer.city}</p>
              <p style={detailStyle}><CalendarDays size={15} />{new Date(offer.starts_at).toLocaleString()} – {new Date(offer.ends_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
              {offer.activities.length > 0 && <p style={bodyStyle}><strong>Activities:</strong> {offer.activities.join(', ')}</p>}
              <p style={bodyStyle}><strong>Do's and don'ts:</strong> {offer.boundaries}</p>
              <p style={bodyStyle}><strong>Lunch:</strong> {offer.lunch_expectation === 'guest_pays' ? 'Guest is expected to pay' : offer.lunch_expectation === 'optional' ? 'Optional' : 'No expectation'}</p>
              {offer.price_ksh > 0 && <p style={helperStyle}>This is an advertised price only. Payment, if any, is arranged directly and is not handled by LinkUp.</p>}
              {offer.host_id === user?.id ? (
                <button type="button" onClick={() => deactivateOffer(offer)} style={secondaryButtonStyle}>Remove my offer</button>
              ) : (
                <form onSubmit={event => startConversation(offer, event)} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <input name="message" required maxLength={2000} placeholder={`Message ${offer.host_name}`} style={{ ...fieldStyle, marginTop: 0 }} />
                  <button type="submit" aria-label="Message host" style={primaryButtonStyle}><MessageCircle size={16} /> Message</button>
                </form>
              )}
              {offer.host_id !== user?.id && (
                <details style={{ marginTop: 10 }}>
                  <summary style={{ cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: 13 }}><Flag size={13} /> Report offer</summary>
                  <form onSubmit={event => reportOffer(offer, event)}>
                    <select name="reason" style={fieldStyle}><option value="inappropriate">Inappropriate</option><option value="spam">Spam or scam</option><option value="harassment">Harassment or abuse</option><option value="other">Other</option></select>
                    <textarea name="details" maxLength={1000} rows={2} placeholder="Details (optional)" style={fieldStyle} />
                    <button type="submit" style={secondaryButtonStyle}>Submit report</button>
                  </form>
                </details>
              )}
            </article>
          ))}
        </div>
        <p style={helperStyle}><Tag size={14} /> Meet in public, tell someone you trust, keep personal details private, and never send advance money or verification codes.</p>
      </div>
    </>
  )
}

const cardStyle = { padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-sm)', marginBottom: 'var(--space-md)' }
const headingStyle = { fontSize: 18, marginBottom: 7 }
const helperStyle = { display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, lineHeight: 1.5, color: 'var(--color-text-secondary)', margin: '4px 0 12px' }
const labelStyle = { display: 'block', margin: '12px 0', fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }
const fieldStyle = { display: 'block', width: '100%', marginTop: 6, padding: '11px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg)', color: 'var(--color-text-primary)', font: 'inherit', fontSize: 14 }
const primaryButtonStyle = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 14px', border: 0, borderRadius: 'var(--radius-md)', background: 'var(--color-primary)', color: '#fff', font: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }
const secondaryButtonStyle = { ...primaryButtonStyle, background: 'var(--color-border)', color: 'var(--color-text-primary)' }
const categoryStyle = { padding: '4px 8px', borderRadius: 'var(--radius-full)', background: 'var(--color-primary-soft)', color: 'var(--color-primary-dark)', fontSize: 11, fontWeight: 700 }
const priceStyle = { color: 'var(--color-primary)', fontSize: 14, whiteSpace: 'nowrap' }
const bodyStyle = { margin: '10px 0', fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }
const detailStyle = { display: 'flex', alignItems: 'center', gap: 7, color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 8 }
const offerImageStyle = { width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: 'var(--radius-md)', marginBottom: 12 }
const errorStyle = { margin: '10px 0', color: 'var(--color-error)', fontSize: 13 }
const noticeStyle = { margin: '10px 0', color: 'var(--color-success)', fontSize: 13 }
