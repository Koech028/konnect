import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, X } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import { useAuth } from '../context/AuthContext'
import { uploadImage } from '../utils/uploadImage'
import { api } from '../utils/api'

const fieldStyle = {
  width: '100%',
  padding: '12px 14px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-bg)',
  color: 'var(--color-text-primary)',
  font: 'inherit'
}

export default function EditProfilePage() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    display_name: user?.display_name || '',
    age: user?.age || '',
    bio: user?.bio || '',
    city: user?.location?.city || '',
    country: user?.location?.country || '',
    interests: (user?.interests || []).join(', ')
  })
  const [photos, setPhotos] = useState(user?.photos || [])
  const [photoRecords, setPhotoRecords] = useState([])
  const [photoRecordsLoaded, setPhotoRecordsLoaded] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/api/v1/profiles/me/photos/')
      .then(response => setPhotoRecords(response.results || response))
      .catch(err => setError(err.message || 'Your photos could not be loaded.'))
      .finally(() => setPhotoRecordsLoaded(true))
  }, [])

  const change = (field, value) => setForm(current => ({ ...current, [field]: value }))

  const addPhoto = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      if (photos.length >= 6) {
        setError('You can add up to 6 profile photos.')
      } else {
        const uploadedUrl = await uploadImage(file)
        setPhotos(current => [...current, uploadedUrl])
        setError('')
      }
    } catch (err) {
      setError(err.message)
    }
    event.target.value = ''
  }

  const save = async (event) => {
    event.preventDefault()
    if (!form.display_name.trim()) {
      setError('Please enter a display name.')
      return
    }
    const age = Number(form.age)
    if (!Number.isInteger(age) || age < 18 || age > 100) {
      setError('Enter a valid age (18 or older).')
      return
    }

    setIsSaving(true)
    try {
      await updateUser({
        display_name: form.display_name.trim(),
        age,
        bio: form.bio.trim(),
        location: { city: form.city.trim(), country: form.country.trim() },
        interests: form.interests.split(',').map(item => item.trim()).filter(Boolean),
      })
      const retainedUrls = new Set(photos)
      const removed = photoRecords.filter(photo => !retainedUrls.has(photo.url))
      for (const photo of removed) {
        await api.delete(`/api/v1/profiles/me/photos/${photo.id}/`)
      }

      const remaining = photoRecords.filter(photo => retainedUrls.has(photo.url))
      const remainingUrls = new Set(remaining.map(photo => photo.url))
      let nextPosition = Math.max(-1, ...remaining.map(photo => photo.position)) + 1
      for (const [index, url] of photos.entries()) {
        if (!remainingUrls.has(url)) {
          await api.post('/api/v1/profiles/me/photos/', {
            url,
            position: nextPosition++,
            is_primary: remaining.length === 0 && index === 0
          })
        }
      }
      const primary = photos[0]
      const primaryRecord = remaining.find(photo => photo.url === primary)
      if (primaryRecord && !primaryRecord.is_primary) {
        await api.patch(`/api/v1/profiles/me/photos/${primaryRecord.id}/`, { is_primary: true })
      }
      setError('')
      navigate('/profile')
    } catch (err) {
      setError(err.message || 'Your profile could not be saved.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <PageHeader title="Edit profile" />
      <form onSubmit={save} style={{ padding: 'var(--space-md)' }}>
        <section style={cardStyle}>
          <h2 style={sectionTitleStyle}>Your photos</h2>
          <p style={helperStyle}>Your first photo is used as your profile picture. Up to 6 photos, 5 MB each before resizing.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px', marginTop: '14px' }}>
            {photos.map((photo, index) => (
              <div key={`${index}-${photo.slice(0, 24)}`} style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--color-border-light)' }}>
                <img src={photo} alt={`Profile photo ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {index === 0 && <span style={{ position: 'absolute', bottom: '5px', left: '5px', background: 'rgba(0,0,0,.6)', color: 'white', borderRadius: 'var(--radius-full)', padding: '3px 7px', fontSize: '10px' }}>Main</span>}
                <button type="button" onClick={() => setPhotos(current => current.filter((_, photoIndex) => photoIndex !== index))} aria-label={`Remove photo ${index + 1}`} style={removeButtonStyle}><X size={15} /></button>
              </div>
            ))}
            {photos.length < 6 && (
              <label style={addPhotoStyle}>
                <Camera size={22} />
                <span>Add photo</span>
                <input type="file" accept="image/*" onChange={addPhoto} style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} />
              </label>
            )}
          </div>
        </section>

        <section style={cardStyle}>
          <h2 style={sectionTitleStyle}>About you</h2>
          <Field label="Display name" value={form.display_name} onChange={value => change('display_name', value)} maxLength={40} required />
          <Field label="Age" value={form.age} onChange={value => change('age', value)} type="number" min="18" max="100" required />
          <label style={labelStyle} htmlFor="profile-bio">Bio</label>
          <textarea id="profile-bio" value={form.bio} onChange={event => change('bio', event.target.value)} rows={4} maxLength={500} placeholder="Tell people a little about yourself" style={{ ...fieldStyle, resize: 'vertical' }} />
          <p style={{ ...helperStyle, textAlign: 'right' }}>{form.bio.length}/500</p>
          <Field label="Interests (comma separated)" value={form.interests} onChange={value => change('interests', value)} placeholder="Coffee, hiking, live music" />
        </section>

        <section style={cardStyle}>
          <h2 style={sectionTitleStyle}>Location</h2>
          <Field label="City" value={form.city} onChange={value => change('city', value)} required />
          <Field label="Country" value={form.country} onChange={value => change('country', value)} required />
        </section>

        {error && <p role="alert" style={{ color: 'var(--color-error)', margin: '0 4px 12px', fontSize: '14px' }}>{error}</p>}
        <button type="submit" disabled={isSaving || !photoRecordsLoaded} style={{ ...saveButtonStyle, opacity: isSaving || !photoRecordsLoaded ? 0.7 : 1 }}>{isSaving ? 'Saving...' : 'Save profile'}</button>
      </form>
    </>
  )
}

function Field({ label, value, onChange, type = 'text', ...props }) {
  const id = `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  return (
    <div style={{ marginBottom: '14px' }}>
      <label htmlFor={id} style={labelStyle}>{label}</label>
      <input id={id} type={type} value={value} onChange={event => onChange(event.target.value)} style={fieldStyle} {...props} />
    </div>
  )
}

const cardStyle = { background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-lg)', boxShadow: 'var(--shadow-sm)', marginBottom: 'var(--space-md)' }
const sectionTitleStyle = { fontSize: '17px', fontWeight: 700, marginBottom: '6px' }
const helperStyle = { fontSize: '13px', color: 'var(--color-text-secondary)' }
const labelStyle = { display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', margin: '12px 0 6px' }
const saveButtonStyle = { width: '100%', padding: '14px', border: 'none', borderRadius: 'var(--radius-lg)', background: 'var(--color-primary)', color: 'white', font: 'inherit', fontWeight: 700, cursor: 'pointer' }
const removeButtonStyle = { position: 'absolute', top: '5px', right: '5px', width: '28px', height: '28px', display: 'grid', placeItems: 'center', border: 'none', borderRadius: '50%', background: 'rgba(0,0,0,.65)', color: 'white', cursor: 'pointer' }
const addPhotoStyle = { aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', position: 'relative', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-primary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }
