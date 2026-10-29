import { useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, Mail, Lock, User, Calendar, MapPin } from 'lucide-react'

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
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (step < 4) {
      setStep(step + 1)
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
      navigate('/')
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
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                marginBottom: '8px'
              }}>
                Email
              </label>
              <div style={{
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
                  type="email"
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
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                marginBottom: '8px'
              }}>
                Password
              </label>
              <div style={{
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
                  type={showPassword ? 'text' : 'password'}
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
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
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
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                marginBottom: '8px'
              }}>
                Display Name
              </label>
              <div style={{
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
                  type="text"
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
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                marginBottom: '8px'
              }}>
                Age
              </label>
              <div style={{
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
                  type="number"
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
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {[
                  { label: 'Woman', value: 'woman' },
                  { label: 'Man', value: 'man' },
                  { label: 'Non-binary', value: 'non_binary' }
                ].map(({ label, value }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleChange('gender', value)}
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
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                marginBottom: '8px'
              }}>
                Location (optional)
              </label>
              <div style={{
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
                  type="text"
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

            <div style={{
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
                A little about you (optional)
              </label>
              <textarea
                id="signup-bio"
                value={formData.bio}
                onChange={(e) => handleChange('bio', e.target.value)}
                placeholder="Share what you enjoy and who you hope to meet"
                maxLength={500}
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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: 'var(--space-xl)',
      background: 'linear-gradient(135deg, var(--color-primary-soft), var(--color-secondary-soft))'
    }}>
      <div style={{ maxWidth: '400px', width: '100%', margin: '0 auto' }}>
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

        <form onSubmit={handleSubmit} style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-xl)',
          boxShadow: 'var(--shadow-lg)'
        }}>
          {renderStep()}

          <div style={{ display: 'flex', gap: '12px' }}>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
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
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-sans)',
                opacity: isLoading ? 0.8 : 1
              }}
            >
              {isLoading ? 'Creating...' : step === 4 ? 'Create Account' : 'Continue'}
            </button>
            {error && <p role="alert" style={{ color: 'var(--color-error)', fontSize: '13px', marginTop: '12px' }}>{error}</p>}
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
