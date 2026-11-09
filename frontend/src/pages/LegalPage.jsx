import { ArrowLeft, Heart } from 'lucide-react'
import { Link } from 'react-router-dom'
import './LandingPage.css'

const policies = {
  privacy: {
    title: 'Privacy Policy',
    intro: 'This policy explains the personal information LinkUp handles when you use our service, why we use it, and the choices available to you.',
    sections: [
      {
        title: 'Information you provide',
        paragraphs: [
          'When you create and use an account, you may provide your email address, display name, age, gender, city, country, biography, interests, discovery preferences, and profile photos.',
          'We also handle content and information you choose to share through posts, stories, messages, likes, event participation, profile verification requests, safety reports, and referral features.'
        ]
      },
      {
        title: 'How we use information',
        paragraphs: [
          'We use this information to create and secure accounts, show profiles and content, support discovery and matching, deliver messages and notifications, respond to safety reports, and operate and improve LinkUp.',
          'We use email addresses to verify accounts and send requested account-security messages, such as password-reset codes.'
        ]
      },
      {
        title: 'What other people can see',
        paragraphs: [
          'Information and content you add to your profile or share in LinkUp may be visible to other members, depending on the feature and your settings. Messages are shared with their intended participants. Think carefully before posting information you want to keep private.'
        ]
      },
      {
        title: 'Service providers and sharing',
        paragraphs: [
          'We use service providers to host LinkUp, store uploaded media, deliver email, support live communication, and send browser push notifications when you enable them. These providers process information as needed to provide their services.',
          'We may also disclose information when reasonably necessary to protect members, investigate abuse, comply with law, or protect LinkUp and its users. We do not sell personal information.'
        ]
      },
      {
        title: 'Retention and security',
        paragraphs: [
          'We keep information for as long as needed to operate the service and for legitimate safety, security, and legal purposes. Retention periods may differ by information type and provider.',
          'We use administrative and technical safeguards designed to protect information. No online service can guarantee absolute security.'
        ]
      },
      {
        title: 'Your choices',
        paragraphs: [
          'You can update profile details, hide your profile from discovery, manage notification preferences, block or report members, and disable browser push notifications in LinkUp settings or your browser.',
          'The app does not currently provide an account-deletion control. A public privacy contact has not yet been designated; LinkUp should publish a contact method and an account-deletion process before public launch.'
        ]
      },
      {
        title: 'Age requirement and changes',
        paragraphs: [
          'LinkUp is intended for adults aged 18 and over. We do not knowingly invite people under 18 to create accounts.',
          'We may update this policy as the service changes. We will update the date on this page when we revise it.'
        ]
      }
    ]
  },
  terms: {
    title: 'Terms & Conditions',
    intro: 'These terms describe the basic rules for using LinkUp. By creating an account or using the service, you agree to follow them.',
    sections: [
      {
        title: 'Eligibility and your account',
        paragraphs: [
          'You must be at least 18 years old to use LinkUp. Provide accurate account information, keep your sign-in credentials private, and let us know if you believe someone else has accessed your account.',
          'You are responsible for activity carried out through your account and for keeping your profile information reasonably current.'
        ]
      },
      {
        title: 'Respectful and lawful use',
        paragraphs: [
          'Do not use LinkUp to harass, threaten, exploit, discriminate against, impersonate, defraud, or unlawfully monitor another person. Do not use the service for spam, scams, or attempts to access other accounts or systems without permission.',
          'Do not upload content that is illegal, infringes another person’s rights, or shares someone’s private information or intimate material without their consent. Do not create or share content involving minors.'
        ]
      },
      {
        title: 'Your content',
        paragraphs: [
          'You keep the rights you have in content you submit. You give LinkUp permission to host, store, reproduce, and display that content as needed to operate the features you choose to use.',
          'Only share content you have the right to post. You can remove content through available app features; copies may remain temporarily in backups or where retention is needed for safety, security, or legal reasons.'
        ]
      },
      {
        title: 'Safety and moderation',
        paragraphs: [
          'Use the available block and report tools to raise safety concerns. We may review reports and take reasonable steps to protect members, including limiting or suspending accounts that violate these terms.',
          'LinkUp does not guarantee the identity, conduct, or intentions of other members. Use good judgment when communicating or meeting someone, and do not share financial or sensitive personal information with people you do not trust.'
        ]
      },
      {
        title: 'Service availability and changes',
        paragraphs: [
          'We work to keep LinkUp available but cannot promise uninterrupted or error-free service. Features may change, be suspended, or be discontinued as the product develops.',
          'If paid features are introduced, their applicable prices and terms will be presented before purchase.'
        ]
      },
      {
        title: 'Questions and updates',
        paragraphs: [
          'A public support contact has not yet been designated. LinkUp should publish a contact method before public launch.',
          'We may update these terms as LinkUp changes. Continued use after an update means you accept the revised terms.'
        ]
      }
    ]
  }
}

export default function LegalPage({ type }) {
  const policy = policies[type]

  return (
    <main className="legal-page">
      <header className="legal-header">
        <Link className="landing-brand" to="/" aria-label="LinkUp home">
          <span className="landing-brand-mark"><Heart size={19} fill="currentColor" /></span>
          <span>LinkUp</span>
        </Link>
        <Link className="legal-back-link" to="/"><ArrowLeft size={16} /> Back to LinkUp</Link>
      </header>

      <article className="legal-content">
        <span className="landing-section-kicker">LinkUp · Legal</span>
        <h1>{policy.title}</h1>
        <p className="legal-updated">Last updated November 2, 2026</p>
        <p className="legal-draft-notice">
          This is a draft for review and is not legal advice. LinkUp has not yet designated a public support or privacy contact. Complete these details and have the policy reviewed before launch.
        </p>
        <p className="legal-intro">{policy.intro}</p>
        {policy.sections.map(section => (
          <section className="legal-section" key={section.title}>
            <h2>{section.title}</h2>
            {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
          </section>
        ))}
        <nav className="legal-related-links" aria-label="Other legal information">
          <Link to={type === 'privacy' ? '/terms-and-conditions' : '/privacy-policy'}>
            {type === 'privacy' ? 'Read Terms & Conditions' : 'Read the Privacy Policy'}
          </Link>
        </nav>
      </article>
    </main>
  )
}
