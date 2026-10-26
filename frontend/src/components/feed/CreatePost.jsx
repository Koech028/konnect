import { useState } from 'react'
import { Image, Video, BarChart3, Calendar, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import Avatar from '../common/Avatar'

export default function CreatePost({ onSubmit }) {
  const { user } = useAuth()
  const [text, setText] = useState('')
  const [postType, setPostType] = useState('status')
  const [pollOptions, setPollOptions] = useState(['', ''])
  const [showTypeMenu, setShowTypeMenu] = useState(false)

  const postTypes = [
    { id: 'status', label: 'Status', icon: null },
    { id: 'photo', label: 'Photo', icon: Image },
    { id: 'poll', label: 'Poll', icon: BarChart3 },
    { id: 'event', label: 'Event', icon: Calendar }
  ]

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!text.trim()) return

    const postData = {
      type: postType,
      content: { text }
    }

    if (postType === 'poll') {
      postData.content.poll_options = pollOptions.filter(o => o.trim())
    }

    onSubmit?.(postData)
    setText('')
    setPollOptions(['', ''])
    setPostType('status')
  }

  const addPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, ''])
    }
  }

  const removePollOption = (index) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index))
    }
  }

  return (
    <div style={{
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-md)',
      marginBottom: 'var(--space-md)',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Avatar src={user?.avatar} alt={user?.display_name} size="md" />
          <div style={{ flex: 1 }}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What's on your mind?"
              rows={3}
              style={{
                width: '100%',
                border: 'none',
                background: 'none',
                outline: 'none',
                resize: 'none',
                fontSize: '15px',
                fontFamily: 'var(--font-sans)',
                color: 'var(--color-text-primary)',
                lineHeight: 1.5
              }}
            />
          </div>
        </div>

        {postType === 'poll' && (
          <div style={{ marginTop: '12px', paddingLeft: '56px' }}>
            {pollOptions.map((option, index) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px'
              }}>
                <input
                  type="text"
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...pollOptions]
                    newOptions[index] = e.target.value
                    setPollOptions(newOptions)
                  }}
                  placeholder={`Option ${index + 1}`}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1.5px solid var(--color-border)',
                    fontSize: '14px',
                    fontFamily: 'var(--font-sans)',
                    outline: 'none'
                  }}
                />
                {pollOptions.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removePollOption(index)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-text-muted)',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            ))}
            {pollOptions.length < 4 && (
              <button
                type="button"
                onClick={addPollOption}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '4px 0'
                }}
              >
                + Add option
              </button>
            )}
          </div>
        )}

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: '1px solid var(--color-border-light)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              onClick={() => setShowTypeMenu(!showTypeMenu)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: 'var(--color-border-light)',
                color: 'var(--color-text-secondary)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)'
              }}
            >
              {postTypes.find(t => t.id === postType)?.label}
            </button>

            {showTypeMenu && (
              <div style={{
                position: 'absolute',
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)',
                padding: '8px',
                marginTop: '180px',
                zIndex: 10,
                minWidth: '160px'
              }}>
                {postTypes.map(type => {
                  const Icon = type.icon
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => {
                        setPostType(type.id)
                        setShowTypeMenu(false)
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: 'none',
                        background: postType === type.id ? 'var(--color-primary-soft)' : 'transparent',
                        color: postType === type.id ? 'var(--color-primary)' : 'var(--color-text-primary)',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        fontFamily: 'var(--font-sans)',
                        textAlign: 'left'
                      }}
                    >
                      {Icon && <Icon size={16} />}
                      {type.label}
                    </button>
                  )
                })}
              </div>
            )}

            <button type="button" style={{
              padding: '8px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: 'transparent',
              color: 'var(--color-text-muted)',
              cursor: 'pointer'
            }}>
              <Image size={20} />
            </button>
          </div>

          <button
            type="submit"
            disabled={!text.trim()}
            style={{
              padding: '10px 24px',
              borderRadius: 'var(--radius-full)',
              border: 'none',
              background: text.trim() ? 'var(--color-primary)' : 'var(--color-border)',
              color: text.trim() ? 'white' : 'var(--color-text-muted)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: text.trim() ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--font-sans)',
              transition: 'all var(--transition-fast)'
            }}
          >
            Post
          </button>
        </div>
      </form>
    </div>
  )
}
