import { useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, Mail, Lock, User, Calendar, MapPin } from 'lucide-react'

const countWords = value => value.trim().split(/\s+/).filter(Boolean).length

export default function SignupPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const referralCode = searchParams.get('ref') || ''
  const { signup } = useAuth()
  const [step, setStep] = useState(1)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    display_name: '',
    age: '',
    gender: '',
    location: { city: '' },
    bio: '',
    interests: ''
  })

  const handleChange = (field, value) => {
    setError('')
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (step < 4) {
      if (step === 2 && !formData.gender) {
        setError('Choose a gender to continue.')
        return
      }
      setError('')
      setStep(step + 1)
      return
    }
    if (step === 4 && countWords(formData.bio) > 100) {
      setError('Your bio must be 100 words or fewer.')
      return
    }
    setIsLoading(true)
    try {
      setError('')
      await signup(formData.email, formData.password, {
        ...formData,
        referral_code: referralCode,
        interests: formData.interests.split(',').map(item => item.trim()).filter(Boolean)
      })
      navigate(`/verify-email?email=${encodeURIComponent(formData.email.trim())}`)
    } catch (err) {
      setError(err.message || 'Unable to create your account. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <label htmlFor="signup-email" style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                marginBottom: '8px'
              }}>
                Email
              </label>
              <div className="auth-input-row" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--color-border)',
                background: 'var(--color-bg)'
              }}>
                <Mail size={18} color="var(--color-text-muted)" />
                <input
                  id="signup-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck="false"
                  inputMode="email"
                  maxLength={254}
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="you@example.com"
                  required
                  style={{
                    flex: 1,
                    border: 'none',
                    background: 'none',
                    outline: 'none',
                    fontSize: '15px',
                    fontFamily: 'var(--font-sans)',
                    color: 'var(--color-text-primary)'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <label htmlFor="signup-password" style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                marginBottom: '8px'
              }}>
                Password
              </label>
              <div className="auth-input-row" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--color-border)',
                background: 'var(--color-bg)'
              }}>
                <Lock size={18} color="var(--color-text-muted)" />
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  name="new-password"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    flex: 1,
                    border: 'none',
                    background: 'none',
                    outline: 'none',
                    fontSize: '15px',
                    fontFamily: 'var(--font-sans)',
                    color: 'var(--color-text-primary)'
                  }}
                />
                <button
                  className="auth-password-toggle"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--color-text-muted)',
                    padding: '4px'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </>
        )

      case 2:
        return (
          <>
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <label htmlFor="signup-display-name" style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                marginBottom: '8px'
              }}>
                Display Name
              </label>
              <div className="auth-input-row" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--color-border)',
                background: 'var(--color-bg)'
              }}>
                <User size={18} color="var(--color-text-muted)" />
                <input
                  id="signup-display-name"
                  type="text"
                  autoComplete="nickname"
                  maxLength={40}
                  value={formData.display_name}
                  onChange={(e) => handleChange('display_name', e.target.value)}
                  placeholder="What should we call you?"
                  required
                  style={{
                    flex: 1,
                    border: 'none',
                    background: 'none',
                    outline: 'none',
                    fontSize: '15px',
                    fontFamily: 'var(--font-sans)',
                    color: 'var(--color-text-primary)'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 'var(--space-md)' }}>
              <label htmlFor="signup-age" style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                marginBottom: '8px'
              }}>
                Age
              </label>
              <div className="auth-input-row" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--color-border)',
                background: 'var(--color-bg)'
              }}>
                <Calendar size={18} color="var(--color-text-muted)" />
                <input
                  id="signup-age"
                  type="number"
                  inputMode="numeric"
                  autoComplete="off"
                  value={formData.age}
                  onChange={(e) => handleChange('age', e.target.value)}
                  placeholder="25"
                  min={18}
                  max={100}
                  required
                  style={{
                    flex: 1,
                    border: 'none',
                    background: 'none',
                    outline: 'none',
                    fontSize: '15px',
                    fontFamily: 'var(--font-sans)',
                    color: 'var(--color-text-primary)'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                marginBottom: '8px'
              }}>
                Gender
              </label>
              <div role="group" aria-label="Gender" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {[
                  { label: 'Woman', value: 'woman' },
                  { label: 'Man', value: 'man' },
                  { label: 'Non-binary', value: 'non_binary' }
                ].map(({ label, value }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleChange('gender', value)}
                    aria-pressed={formData.gender === value}
                    style={{
                      padding: '10px 20px',
                      borderRadius: 'var(--radius-full)',
                      border: formData.gender === value
                        ? '2px solid var(--color-primary)'
                        : '1.5px solid var(--color-border)',
                      background: formData.gender === value
                        ? 'var(--color-primary-soft)'
                        : 'var(--color-surface)',
                      color: formData.gender === value
                        ? 'var(--color-primary)'
                        : 'var(--color-text-secondary)',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'var(--font-sans)'
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )

      case 3:
        return (
          <>
            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <label htmlFor="signup-city" style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                marginBottom: '8px'
              }}>
                Location (optional)
              </label>
              <div className="auth-input-row" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--color-border)',
                background: 'var(--color-bg)'
              }}>
                <MapPin size={18} color="var(--color-text-muted)" />
                <input
                  id="signup-city"
                  type="text"
                  autoComplete="address-level2"
                  maxLength={100}
                  value={formData.location.city}
                  onChange={(e) => handleChange('location', { ...formData.location, city: e.target.value })}
                  placeholder="City"
                  style={{
                    flex: 1,
                    border: 'none',
                    background: 'none',
                    outline: 'none',
                    fontSize: '15px',
                    fontFamily: 'var(--font-sans)',
                    color: 'var(--color-text-primary)'
                  }}
                />
              </div>
            </div>

            <div role="progressbar" aria-label="Signup progress" aria-valuemin={1} aria-valuemax={4} aria-valuenow={step} style={{
              padding: 'var(--space-lg)',
              background: 'var(--color-primary-soft)',
              borderRadius: 'var(--radius-lg)',
              marginBottom: 'var(--space-lg)'
            }}>
              <p style={{
                fontSize: '14px',
                color: 'var(--color-primary)',
                fontWeight: 600,
                textAlign: 'center'
              }}>
                You are almost there! 🎉
              </p>
              <p style={{
                fontSize: '13px',
                color: 'var(--color-text-secondary)',
                textAlign: 'center',
                marginTop: '4px'
              }}>
                Create your account to start meeting people. You can add your city later.
              </p>
            </div>
          </>
        )

      case 4:
        return (
          <>
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <label htmlFor="signup-bio" style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                marginBottom: '8px'
              }}>
                Bio (optional)
              </label>
              <textarea
                id="signup-bio"
                value={formData.bio}
                onChange={(e) => handleChange('bio', e.target.value)}
                placeholder="Write freely about yourself, your interests, or what you'd like others to know."
                rows={4}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--color-border)',
                  background: 'var(--color-bg)',
                  resize: 'vertical',
                  fontSize: '15px',
                  fontFamily: 'var(--font-sans)',
                  color: 'var(--color-text-primary)'
                }}
              />
              <p style={{ margin: '6px 0 0', textAlign: 'right', fontSize: 12, color: countWords(formData.bio) > 100 ? 'var(--color-error)' : 'var(--color-text-muted)' }}>
                {countWords(formData.bio)}/100 words
              </p>
            </div>
            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <label htmlFor="signup-interests" style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                marginBottom: '8px'
              }}>
                Interests (optional, comma separated)
              </label>
              <input
                id="signup-interests"
                type="text"
                value={formData.interests}
                onChange={(e) => handleChange('interests', e.target.value)}
                placeholder="Coffee, hiking, live music"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--color-border)',
                  background: 'var(--color-bg)',
                  fontSize: '15px',
                  fontFamily: 'var(--font-sans)',
                  color: 'var(--color-text-primary)'
                }}
              />
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)' }}>
              You can add photos and change these details later from Edit Profile.
            </p>
          </>
        )

      default:
        return null
    }
  }

  return (
    <div className="auth-page" style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--color-primary-soft), var(--color-secondary-soft))'
    }}>
      <div className="auth-shell">
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '36px',
            fontWeight: 700,
            color: 'var(--color-primary)',
            marginBottom: '8px'
          }}>
            LinkUp
          </h1>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '8px',
            marginTop: 'var(--space-md)'
          }}>
            {[1, 2, 3, 4].map(s => (
              <span
                key={s}
                style={{
                  width: '32px',
                  height: '4px',
                  borderRadius: '2px',
                  background: s <= step ? 'var(--color-primary)' : 'var(--color-border)',
                  transition: 'background var(--transition-base)'
                }}
              />
            ))}
          </div>
          <p style={{
            fontSize: '14px',
            color: 'var(--color-text-secondary)',
            marginTop: '8px'
          }}>
            Step {step} of 4
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-card" style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg)'
        }}>
          {renderStep()}

          {error && (
            <p role="alert" style={{
              marginBottom: 'var(--space-md)',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-primary-soft)',
              color: 'var(--color-primary-dark)',
              fontSize: '13px'
            }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            {step > 1 && (
              <button
                type="button"
                onClick={() => {
                  setError('')
                  setStep(step - 1)
                }}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: 'var(--radius-lg)',
                  border: '1.5px solid var(--color-border)',
                  background: 'transparent',
                  color: 'var(--color-text-secondary)',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)'
                }}
              >
                Back
              </button>
            )}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                flex: step > 1 ? 2 : 1,
                padding: '14px',
                borderRadius: 'var(--radius-lg)',
                border: 'none',
                background: 'var(--color-primary)',
                color: 'white',
                fontSize: '15px',
                fontWeight: 600,
                cursor: isLoading ? 'wait' : 'pointer',
                fontFamily: 'var(--font-sans)',
                opacity: isLoading ? 0.8 : 1
              }}
            >
              {isLoading ? 'Creating account…' : step === 4 ? 'Create account' : 'Continue'}
            </button>
          </div>

          <div style={{
            textAlign: 'center',
            marginTop: 'var(--space-lg)',
            paddingTop: 'var(--space-lg)',
            borderTop: '1px solid var(--color-border-light)'
          }}>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              Already have an account?{' '}
              <Link to="/login" style={{
                color: 'var(--color-primary)',
                fontWeight: 600,
                textDecoration: 'none'
              }}>
                Sign In
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
