import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, Compass, Heart, MapPin, MessageCircle, Pause, Play, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import './LandingPage.css'

const profiles = [
  {
    image: '/images/sample-profile-1.webp',
    interests: ['Live music', 'Weekend walks', 'Good coffee']
  },
  {
    image: '/images/sample-profile-2.webp',
    interests: ['Afrobeat', 'Art markets', 'Street food']
  },
  {
    image: '/images/sample-profile-3.webp',
    interests: ['Bookshops', 'Brunch', 'Photography']
  },
  {
    image: '/images/sample-profile-4.webp',
    interests: ['Hiking', 'Football', 'Live shows']
  }
]

const features = [
  {
    icon: Compass,
    title: 'Meet beyond the swipe',
    description: 'Discover people, browse profiles, and find the interests you have in common.',
    tone: 'coral'
  },
  {
    icon: MessageCircle,
    title: 'Start with something real',
    description: 'When you match, make the first message your own with a little inspiration.',
    tone: 'teal'
  },
  {
    icon: ShieldCheck,
    title: 'Feel in control',
    description: 'Choose what you share. Block or report members whenever you need to.',
    tone: 'gold'
  }
]

function ProfilePreview() {
  const [activeProfileIndex, setActiveProfileIndex] = useState(() => Math.floor(Math.random() * profiles.length))
  const [isPaused, setIsPaused] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [exitDirection, setExitDirection] = useState(null)
  const pointerStart = useRef(null)
  const transitionTimeout = useRef(null)
  const autoDirection = useRef(0)

  const dismissProfile = (direction, step = direction === 'right' ? -1 : 1) => {
    if (transitionTimeout.current !== null || pointerStart.current) return

    setDragOffset({ x: 0, y: 0 })
    setExitDirection(direction)
    transitionTimeout.current = window.setTimeout(() => {
      setActiveProfileIndex(currentIndex => (currentIndex + step + profiles.length) % profiles.length)
      setDragOffset({ x: 0, y: 0 })
      setExitDirection(null)
      transitionTimeout.current = null
    }, 360)
  }

  useEffect(() => {
    if (isPaused) return undefined

    const intervalId = window.setInterval(() => {
      const directions = ['left', 'right', 'up']
      const direction = directions[autoDirection.current % directions.length]
      autoDirection.current += 1
      dismissProfile(direction, 1)
    }, 5500)

    return () => window.clearInterval(intervalId)
  }, [isPaused])

  useEffect(() => () => {
    if (transitionTimeout.current !== null) window.clearTimeout(transitionTimeout.current)
  }, [])

  const handlePointerDown = event => {
    if (event.button !== 0 || event.target.closest('button') || exitDirection) return
    pointerStart.current = { x: event.clientX, y: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = event => {
    if (!pointerStart.current) return
    setDragOffset({
      x: event.clientX - pointerStart.current.x,
      y: event.clientY - pointerStart.current.y
    })
  }

  const handlePointerUp = event => {
    if (!pointerStart.current) return
    const deltaX = event.clientX - pointerStart.current.x
    const deltaY = event.clientY - pointerStart.current.y
    pointerStart.current = null

    if (deltaX < -85) dismissProfile('left')
    else if (deltaX > 85) dismissProfile('right')
    else if (deltaY < -75) dismissProfile('up', 1)
    else setDragOffset({ x: 0, y: 0 })
  }

  const handlePointerCancel = () => {
    pointerStart.current = null
    setDragOffset({ x: 0, y: 0 })
  }

  return (
    <div
      className="landing-preview"
      role="group"
      aria-label="Example LinkUp profiles. Swipe a card left, right, or up to explore."
    >
      <div className="landing-preview-orbit landing-preview-orbit-one" />
      <div className="landing-preview-orbit landing-preview-orbit-two" />
      <div className="landing-profile-stack">
        {profiles.map((stackProfile, stackIndex) => {
          const isTopCard = stackIndex === 0
          const profileIndex = (activeProfileIndex + stackIndex) % profiles.length
          const currentProfile = profiles[profileIndex]
          const cardClasses = [
            'landing-profile-card',
            isTopCard && 'is-top-card',
            isTopCard && (dragOffset.x !== 0 || dragOffset.y !== 0) && 'is-dragging',
            isTopCard && exitDirection && `is-exiting is-exiting-${exitDirection}`
          ].filter(Boolean).join(' ')

          return (
            <article
              key={currentProfile.image}
              className={cardClasses}
              aria-hidden={!isTopCard}
              style={{
                '--stack-index': stackIndex,
                '--gesture-x': isTopCard ? `${dragOffset.x}px` : '0px',
                '--gesture-y': isTopCard ? `${dragOffset.y}px` : '0px',
                '--gesture-rotation': isTopCard ? `${dragOffset.x * 0.07}deg` : '0deg',
                zIndex: profiles.length - stackIndex
              }}
              onPointerDown={isTopCard ? handlePointerDown : undefined}
              onPointerMove={isTopCard ? handlePointerMove : undefined}
              onPointerUp={isTopCard ? handlePointerUp : undefined}
              onPointerCancel={isTopCard ? handlePointerCancel : undefined}
            >
              <div className="landing-profile-art">
                <img
                  className="landing-profile-photo"
                  src={currentProfile.image}
                  alt={isTopCard ? 'Example profile portrait (stock photo)' : ''}
                  width="800"
                  height="680"
                  draggable="false"
                />
                <span className="landing-photo-label"><MapPin size={13} /> Nairobi</span>
                {isTopCard && (
                  <>
                    <button className="landing-profile-nav landing-profile-nav-previous" type="button" onClick={() => dismissProfile('right', -1)} aria-label="Show previous example profile">
                      <ChevronLeft size={19} />
                    </button>
                    <button className="landing-profile-nav landing-profile-nav-next" type="button" onClick={() => dismissProfile('left', 1)} aria-label="Show next example profile">
                      <ChevronRight size={19} />
                    </button>
                  </>
                )}
              </div>
              <div className="landing-profile-details">
                <div className="landing-profile-heading">
                  <div>
                    <h2>A little more you</h2>
                    <p>Example profile · Good conversations start here</p>
                  </div>
                  {isTopCard && (
                    <button
                      className="landing-carousel-toggle"
                      type="button"
                      onClick={() => setIsPaused(paused => !paused)}
                      aria-label={isPaused ? 'Play profile carousel' : 'Pause profile carousel'}
                      aria-pressed={isPaused}
                    >
                      {isPaused ? <Play size={13} /> : <Pause size={13} />}
                    </button>
                  )}
                </div>
                <div className="landing-interest-list">
                  {currentProfile.interests.map(interest => <span key={interest}>{interest}</span>)}
                </div>
                <div className="landing-profile-actions" aria-hidden="true">
                  <span><Heart size={20} /></span>
                  <span className="landing-action-primary"><MessageCircle size={19} /></span>
                </div>
                {isTopCard && (
                  <div className="landing-profile-pagination" role="group" aria-label={`Example profile ${activeProfileIndex + 1} of ${profiles.length}`}>
                    {profiles.map((item, index) => (
                      <button
                        key={item.image}
                        type="button"
                        aria-label={`Show example profile ${index + 1}`}
                        aria-current={index === activeProfileIndex ? 'true' : undefined}
                        onPointerDown={event => event.stopPropagation()}
                        onClick={() => setActiveProfileIndex(index)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </article>
          )
        })}
      </div>
      <div className="landing-note-card">
        <span className="landing-note-icon"><Sparkles size={16} /></span>
        <span><strong>Start with a shared spark</strong><small>Find common ground</small></span>
      </div>
      <div className="landing-floating-heart" aria-hidden="true"><Heart size={18} fill="currentColor" /></div>
    </div>
  )
}

export default function LandingPage() {
  return (
    <main className="landing-page">
      <header className="landing-header">
        <Link className="landing-brand" to="/" aria-label="LinkUp home">
          <span className="landing-brand-mark"><Heart size={19} fill="currentColor" /></span>
          <span>LinkUp</span>
        </Link>
        <nav className="landing-nav" aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#make-it-yours">Your pace, your way</a>
        </nav>
        <div className="landing-header-actions">
          <Link className="landing-login-link" to="/login">Log in</Link>
          <Link className="landing-header-cta" to="/signup">Join LinkUp <ArrowRight size={16} /></Link>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <div className="landing-eyebrow"><span /> A little closer to something real</div>
          <h1>Good connections<br />start with <em>being you.</em></h1>
          <p className="landing-hero-description">
            Meet people in Nairobi, find the things you have in common, and let a good conversation take it from there.
          </p>
          <div className="landing-hero-actions">
            <Link className="landing-primary-cta" to="/signup">Create your free profile <ArrowRight size={18} /></Link>
            <Link className="landing-secondary-cta" to="/login">I already have an account</Link>
          </div>
          <p className="landing-age-note"><ShieldCheck size={15} /> A community for adults 18 and over</p>
        </div>
        <ProfilePreview />
      </section>

      <section className="landing-features" id="how-it-works">
        <div className="landing-section-heading">
          <span className="landing-section-kicker">More than a first impression</span>
          <h2>Make room for a real connection.</h2>
          <p>Thoughtful ways to meet, get to know each other, and stay in control.</p>
        </div>
        <div className="landing-feature-grid">
          {features.map(({ icon: Icon, title, description, tone }, index) => (
            <article className="landing-feature-card" key={title}>
              <span className={`landing-feature-icon landing-feature-icon-${tone}`}><Icon size={22} /></span>
              <span className="landing-feature-number">0{index + 1}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-invitation" id="make-it-yours">
        <div>
          <span className="landing-section-kicker">No rush. Just be yourself.</span>
          <h2>Your next good conversation could start today.</h2>
          <p>Create a profile, explore at your own pace, and see who you meet.</p>
        </div>
        <Link className="landing-primary-cta" to="/signup">Get started <ArrowRight size={18} /></Link>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-main">
          <div className="landing-footer-brand">
            <Link className="landing-brand" to="/" aria-label="LinkUp home">
              <span className="landing-brand-mark"><Heart size={16} fill="currentColor" /></span>
              <span>LinkUp</span>
            </Link>
            <p>Meet people. Find your kind of connection.</p>
            <span className="landing-footer-location"><MapPin size={14} /> Nairobi, Kenya</span>
          </div>
          <nav className="landing-footer-column" aria-label="Explore LinkUp">
            <h2>Explore</h2>
            <Link to="/signup">Create a profile</Link>
            <Link to="/login">Log in</Link>
            <a href="#how-it-works">How it works</a>
          </nav>
          <nav className="landing-footer-column" aria-label="Legal information">
            <h2>Legal</h2>
            <Link to="/privacy-policy">Privacy Policy</Link>
            <Link to="/terms-and-conditions">Terms &amp; Conditions</Link>
          </nav>
          <div className="landing-footer-column landing-footer-social">
            <h2>Follow LinkUp</h2>
            <p>Social profiles coming soon.</p>
          </div>
        </div>
        <div className="landing-footer-bottom">
          <span>© {new Date().getFullYear()} LinkUp. All rights reserved.</span>
          <span>Developed by <a href="https://savanna-designs.com" target="_blank" rel="noopener noreferrer">Savanna Designs</a></span>
        </div>
      </footer>
    </main>
  )
}
