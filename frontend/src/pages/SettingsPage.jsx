import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, Shield, BadgeCheck, LockKeyhole, LogOut, Moon, Sun, ChevronRight, UserRound, Sparkles } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { api } from '../utils/api'
import { disablePushNotifications, enablePushNotifications, getPushState } from '../utils/pushNotifications'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user, updateUser, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [notifications, setNotifications] = useState({ messages: true, likes: true, posts: true })
  const [hidden, setHidden] = useState(user?.profile_status === 'hidden')
  const [preferences, setPreferences] = useState({
    interested_in: user?.preferences?.interested_in || [],
    age_min: user?.preferences?.age_min || 18,
    age_max: user?.preferences?.age_max || 40,
    max_distance_km: user?.preferences?.max_distance_km || 50
  })
  const [saved, setSaved] = useState('')
  const [error, setError] = useState('')
  const [pushState, setPushState] = useState({ supported: false, subscribed: false, permission: 'default' })
  const [pushBusy, setPushBusy] = useState(false)

  useEffect(() => {
    api.get('/api/v1/settings/notifications/')
      .then(setNotifications)
      .catch(err => setError(err.message || 'Notification preferences could not be loaded.'))
    getPushState()
      .then(setPushState)
      .catch(err => setError(err.message || 'Push notification status could not be loaded.'))
  }, [])

  const saveNotifications = async (key, checked) => {
    try {
      const savedPreferences = await api.patch('/api/v1/settings/notifications/', { [key]: checked })
      setNotifications(savedPreferences)
      setSaved('Notification preferences saved.')
      setError('')
    } catch (err) {
      setError(err.message || 'Could not save notification preferences.')
    }

    const togglePush = async () => {
      setPushBusy(true)
      try {
        if (pushState.subscribed) {
          await disablePushNotifications()
          setPushState(current => ({ ...current, subscribed: false }))
          setSaved('Browser push notifications disabled.')
        } else {
          await enablePushNotifications()
          setPushState(current => ({ ...current, subscribed: true, permission: 'granted' }))
          setSaved('Browser push notifications enabled.')
        }
        setError('')
      } catch (err) {
        setError(err.message || 'Push notification settings could not be updated.')
      } finally {
        setPushBusy(false)
      }
    }
  }

  const changeVisibility = async (checked) => {
    try {
      await updateUser({ profile_status: checked ? 'hidden' : 'active' })
      setHidden(checked)
      setSaved('Profile visibility updated.')
      setError('')
    } catch (err) {
      setError(err.message || 'Could not update profile visibility.')
    }
  }

  const savePreferences = async (event) => {
    event.preventDefault()
    const ageMin = Number(preferences.age_min)
    const ageMax = Number(preferences.age_max)
    const distance = Number(preferences.max_distance_km)
    if (!Number.isInteger(ageMin) || ageMin < 18 || ageMin > 100 || !Number.isInteger(ageMax) || ageMax < ageMin || ageMax > 100) {
      setError('Choose a valid age range between 18 and 100.')
      return
    }
    if (!Number.isInteger(distance) || distance < 5 || distance > 500) {
      setError('Choose a distance between 5 and 500 km.')
      return
    }
    try {
      await updateUser({
        preferences: {
          ...user?.preferences,
          interested_in: preferences.interested_in,
          age_min: ageMin,
          age_max: ageMax,
          max_distance_km: distance
        }
      })
      setPreferences(current => ({ ...current, age_min: ageMin, age_max: ageMax, max_distance_km: distance }))
      setSaved('Discovery preferences saved.')
      setError('')
    } catch (err) {
      setError(err.message || 'Could not save discovery preferences.')
    }
  }

  const signOut = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      <PageHeader title="Settings" />
      <div style={{ padding: 'var(--space-md)' }}>
        <section style={cardStyle}>
          <h2 style={titleStyle}>Your account</h2>
          <SettingLink to="/profile/edit" icon={<UserRound size={18} />} title="Edit profile" description="Update your details and photos" />
          <SettingLink to="/verification" icon={<BadgeCheck size={18} />} title="Profile verification" description="Request a verification review" />
          <SettingLink to="/premium" icon={<Sparkles size={18} />} title="LinkUp Premium" description="View your plan and available benefits" />
          <SettingLink to="/safety" icon={<Shield size={18} />} title="Safety center" description="Manage reports and blocked profiles" />
          <SettingLink to="/forgot-password" icon={<LockKeyhole size={18} />} title="Password help" description="Request a password reset email" />
        </section>

        <section style={cardStyle}>
          <h2 style={titleStyle}>Preferences</h2>
          <SettingRow icon={theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />} title="Dark appearance" description="Change the app theme">
            <input type="checkbox" checked={theme === 'dark'} onChange={toggleTheme} aria-label="Enable dark appearance" style={switchStyle} />
          </SettingRow>
          <SettingRow icon={<Shield size={18} />} title="Hide my profile" description="Pause showing your profile to new people">
            <input type="checkbox" checked={hidden} onChange={event => changeVisibility(event.target.checked)} aria-label="Hide my profile" style={switchStyle} />
          </SettingRow>
        </section>

        <section style={cardStyle}>
          <h2 style={titleStyle}>Discovery preferences</h2>
          <form onSubmit={savePreferences}>
            <fieldset style={{ border: 0, padding: 0, margin: '10px 4px 14px' }}>
              <legend style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Interested in</legend>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {[
                  ['women', 'Women'],
                  ['men', 'Men'],
                  ['non_binary', 'Non-binary']
                ].map(([value, label]) => (
                  <label key={value} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                    <input
                      type="checkbox"
                      checked={preferences.interested_in.includes(value)}
                      onChange={event => setPreferences(current => ({
                        ...current,
                        interested_in: event.target.checked
                          ? [...current.interested_in, value]
                          : current.interested_in.filter(item => item !== value)
                      }))}
                      style={{ accentColor: 'var(--color-primary)' }}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <label style={fieldLabelStyle}>Minimum age
                <input type="number" min="18" max="100" value={preferences.age_min} onChange={event => setPreferences(current => ({ ...current, age_min: event.target.value }))} style={numberInputStyle} />
              </label>
              <label style={fieldLabelStyle}>Maximum age
                <input type="number" min="18" max="100" value={preferences.age_max} onChange={event => setPreferences(current => ({ ...current, age_max: event.target.value }))} style={numberInputStyle} />
              </label>
            </div>
            <label style={fieldLabelStyle}>Maximum distance (km)
              <input type="number" min="5" max="500" value={preferences.max_distance_km} onChange={event => setPreferences(current => ({ ...current, max_distance_km: event.target.value }))} style={numberInputStyle} />
            </label>
            <button type="submit" style={saveButtonStyle}>Save discovery preferences</button>
          </form>
          <p style={helperStyle}>Age and gender preferences are used by discovery. Distance is stored for future location-based matching.</p>
        </section>

        <section style={cardStyle}>
          <h2 style={titleStyle}>Notifications</h2>
          <SettingRow icon={<Bell size={18} />} title="Messages" description="New message notifications">
            <input type="checkbox" checked={notifications.messages} onChange={event => saveNotifications('messages', event.target.checked)} aria-label="Message notifications" style={switchStyle} />
          </SettingRow>
          <SettingRow icon={<Bell size={18} />} title="Likes and matches" description="When someone likes your profile">
            <input type="checkbox" checked={notifications.likes} onChange={event => saveNotifications('likes', event.target.checked)} aria-label="Like notifications" style={switchStyle} />
          </SettingRow>
          <SettingRow icon={<Bell size={18} />} title="Post activity" description="Comments and reactions">
            <input type="checkbox" checked={notifications.posts} onChange={event => saveNotifications('posts', event.target.checked)} aria-label="Post activity notifications" style={switchStyle} />
          </SettingRow>
          <SettingRow icon={<Bell size={18} />} title="Browser push" description={pushState.supported ? 'Get alerts when LinkUp is closed' : 'Push is not supported in this browser'}>
            <button type="button" disabled={!pushState.supported || pushBusy} onClick={togglePush} style={pushButtonStyle}>
              {pushBusy ? '…' : pushState.subscribed ? 'Disable' : 'Enable'}
            </button>
          </SettingRow>
          <SettingRow icon={<Bell size={18} />} title="Push preference" description="Allow activity notifications to reach this browser">
            <input type="checkbox" checked={notifications.push_enabled ?? true} onChange={event => saveNotifications('push_enabled', event.target.checked)} aria-label="Push notification preference" style={switchStyle} />
          </SettingRow>
          <p style={helperStyle}>Push delivery also requires the browser permission and server-side VAPID configuration.</p>
        </section>

        {error && <p role="alert" style={errorStyle}>{error}</p>}
        {saved && <p role="status" style={successStyle}>{saved}</p>}
        <button type="button" onClick={signOut} style={logoutStyle}><LogOut size={18} /> Log out</button>
        <p style={{ ...helperStyle, textAlign: 'center', margin: '18px 10px' }}>Account deletion and password changes are not currently available in settings.</p>
      </div>
    </>
  )
}

function SettingRow({ icon, title, description, children }) {
  return (
    <div style={rowStyle}>
      <span style={iconStyle}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong style={{ display: 'block', fontSize: '14px' }}>{title}</strong>
        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{description}</span>
      </div>
      {children}
    </div>
  )
}

function SettingLink({ to, icon, title, description }) {
  return (
    <Link to={to} style={{ ...rowStyle, color: 'inherit', textDecoration: 'none' }}>
      <span style={iconStyle}>{icon}</span>
      <div style={{ flex: 1 }}>
        <strong style={{ display: 'block', fontSize: '14px' }}>{title}</strong>
        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{description}</span>
      </div>
      <ChevronRight size={18} color="var(--color-text-muted)" />
    </Link>
  )
}

const cardStyle = { background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-md)', marginBottom: 'var(--space-md)', boxShadow: 'var(--shadow-sm)' }
const titleStyle = { fontSize: '16px', fontWeight: 700, margin: '4px 4px 8px' }
const rowStyle = { minHeight: '64px', display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 4px', borderBottom: '1px solid var(--color-border-light)' }
const iconStyle = { width: '36px', height: '36px', display: 'grid', placeItems: 'center', borderRadius: '50%', background: 'var(--color-primary-soft)', color: 'var(--color-primary)', flexShrink: 0 }
const switchStyle = { width: '20px', height: '20px', accentColor: 'var(--color-primary)' }
const fieldLabelStyle = { display: 'block', margin: '10px 4px', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' }
const numberInputStyle = { display: 'block', width: '100%', padding: '10px', marginTop: '5px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg)', color: 'var(--color-text-primary)', font: 'inherit' }
const saveButtonStyle = { width: '100%', padding: '12px', marginTop: '6px', border: 'none', borderRadius: 'var(--radius-md)', background: 'var(--color-primary)', color: 'white', font: 'inherit', fontWeight: 600, cursor: 'pointer' }
const helperStyle = { fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.5, margin: '10px 4px 4px' }
const errorStyle = { color: 'var(--color-error)', fontSize: '14px', margin: '0 0 12px' }
const successStyle = { color: 'var(--color-success)', fontSize: '14px', margin: '0 0 12px' }
const logoutStyle = { width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '14px', border: '1px solid var(--color-error)', borderRadius: 'var(--radius-lg)', background: 'transparent', color: 'var(--color-error)', font: 'inherit', fontWeight: 600, cursor: 'pointer' }
const pushButtonStyle = { padding: '7px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-full)', background: 'var(--color-surface)', color: 'var(--color-primary)', font: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
