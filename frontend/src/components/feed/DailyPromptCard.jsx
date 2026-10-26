import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { api } from '../../utils/api'

export default function DailyPromptCard() {
  const [prompt, setPrompt] = useState(null)
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/api/v1/prompts/today/')
      .then(result => {
        setPrompt(result)
        setAnswer(result.answer)
      })
      .catch(err => setError(err.message || 'Today’s prompt could not be loaded.'))
      .finally(() => setLoading(false))
  }, [])

  const saveAnswer = async event => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      setPrompt(await api.post('/api/v1/prompts/today/', { answer }))
    } catch (err) {
      setError(err.message || 'Your answer could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section aria-label="Daily conversation prompt" style={cardStyle}>
      <h2 style={titleStyle}><Sparkles size={18} color="var(--color-primary)" /> A little question for today</h2>
      {loading && <p role="status" style={helperStyle}>Finding today’s prompt…</p>}
      {error && <p role="alert" style={errorStyle}>{error}</p>}
      {prompt && (
        <form onSubmit={saveAnswer}>
          <p style={promptStyle}>{prompt.prompt}</p>
          <textarea
            aria-label="Your private answer"
            maxLength={400}
            rows={2}
            value={answer}
            onChange={event => setAnswer(event.target.value)}
            placeholder="Write a thought for yourself…"
            style={textareaStyle}
          />
          <div style={footerStyle}>
            <span style={helperStyle}>Your answer is private to you.</span>
            <button type="submit" disabled={saving || !answer.trim()} style={buttonStyle}>
              {saving ? 'Saving…' : prompt.answered ? 'Update answer' : 'Save answer'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

const cardStyle = { padding: 'var(--space-md)', marginBottom: 'var(--space-md)', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-sm)' }
const titleStyle = { display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 10px', fontSize: 15 }
const promptStyle = { margin: '0 0 10px', fontSize: 15, fontWeight: 600 }
const textareaStyle = { width: '100%', resize: 'vertical', padding: 10, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg)', color: 'var(--color-text-primary)', font: 'inherit', fontSize: 13 }
const footerStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8 }
const helperStyle = { margin: 0, color: 'var(--color-text-secondary)', fontSize: 11 }
const buttonStyle = { padding: '8px 12px', border: 0, borderRadius: 'var(--radius-full)', background: 'var(--color-primary)', color: '#fff', font: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
const errorStyle = { color: 'var(--color-error)', fontSize: 12 }
