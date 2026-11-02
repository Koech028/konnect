import { ArrowRight, Compass, Heart, MapPin, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import './LandingPage.css'

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
  return (
    <div className="landing-preview" aria-label="A preview of LinkUp profiles and shared interests">
      <div className="landing-preview-orbit landing-preview-orbit-one" />
      <div className="landing-preview-orbit landing-preview-orbit-two" />
      <div className="landing-profile-card">
        <div className="landing-profile-art">
          <div className="landing-profile-sun" />
          <div className="landing-profile-person">
            <div className="landing-profile-hair" />
            <div className="landing-profile-face">
              <span className="landing-profile-eye landing-profile-eye-left" />
              <span className="landing-profile-eye landing-profile-eye-right" />
              <span className="landing-profile-smile" />
            </div>
            <div className="landing-profile-body" />
          </div>
          <span className="landing-photo-label"><MapPin size={13} /> Nairobi</span>
        </div>
        <div className="landing-profile-details">
          <div className="landing-profile-heading">
            <div>
              <h2>A little more you</h2>
              <p>Good conversations start here</p>
            </div>
            <span className="landing-online-dot" aria-label="Active" />
          </div>
          <div className="landing-interest-list">
            <span>Live music</span>
            <span>Weekend walks</span>
            <span>Good coffee</span>
          </div>
          <div className="landing-profile-actions" aria-hidden="true">
            <span><Heart size={20} /></span>
            <span className="landing-action-primary"><MessageCircle size={19} /></span>
          </div>
        </div>
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
        <Link className="landing-brand" to="/" aria-label="LinkUp home">
          <span className="landing-brand-mark"><Heart size={16} fill="currentColor" /></span>
          <span>LinkUp</span>
        </Link>
        <p>Meet people. Find your kind of connection.</p>
        <span className="landing-footer-location"><MapPin size={14} /> Nairobi, Kenya</span>
      </footer>
    </main>
  )
}
