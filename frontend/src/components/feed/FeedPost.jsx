import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, MessageCircle, Share2, Send } from 'lucide-react'
import { formatRelativeTime, truncateText } from '../../utils/helpers'
import Avatar from '../common/Avatar'

function PollOptions({ options, votes, totalVotes, selectedOption, onSelect }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
      {options.map((option, index) => {
        const voteCount = votes[index] || 0
        const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0
        const isSelected = selectedOption === index
        const hasVoted = selectedOption !== null

        return (
          <button
            key={index}
            onClick={() => !hasVoted && onSelect(index)}
            disabled={hasVoted}
            style={{
              position: 'relative',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              border: isSelected ? '2px solid var(--color-primary)' : '1.5px solid var(--color-border)',
              background: isSelected ? 'var(--color-primary-soft)' : 'var(--color-surface)',
              cursor: hasVoted ? 'default' : 'pointer',
              textAlign: 'left',
              fontFamily: 'var(--font-sans)',
              fontSize: '14px',
              color: 'var(--color-text-primary)',
              fontWeight: 500,
              overflow: 'hidden',
              transition: 'all var(--transition-fast)'
            }}
          >
            {hasVoted && (
              <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${percentage}%`,
                background: isSelected ? 'var(--color-primary-soft)' : 'var(--color-border-light)',
                borderRadius: 'var(--radius-md)',
                transition: 'width var(--transition-base)',
                zIndex: 0
              }} />
            )}
            <span style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between' }}>
              <span>{option}</span>
              {hasVoted && (
                <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px', fontWeight: 600 }}>
                  {percentage}%
                </span>
              )}
            </span>
          </button>
        )
      })}
      {selectedOption !== null && (
        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
          {totalVotes} votes
        </p>
      )}
    </div>
  )
}

export default function FeedPost({ post, onLike, onShare, onInterest, onPollVote }) {
  const navigate = useNavigate()
  const [liked, setLiked] = useState(post.liked_by_me)
  const [interested, setInterested] = useState(post.interested_by_me)
  const [selectedPollOption, setSelectedPollOption] = useState(post.content.selected_poll_option ?? null)
  const [pollVotes, setPollVotes] = useState(post.content.poll_votes || [])
  const [isExpanded, setIsExpanded] = useState(false)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    setLiked(post.liked_by_me)
    setInterested(post.interested_by_me)
    setPollVotes(post.content.poll_votes || [])
    setSelectedPollOption(post.content.selected_poll_option ?? null)
  }, [post])

  const handleLike = () => {
    setLiked(!liked)
    Promise.resolve(onLike?.(post.id, !liked)).catch(error => {
      setLiked(liked)
      setActionError(error.message || 'Like could not be saved.')
    })
  }

  const handleInterest = () => {
    setInterested(!interested)
    Promise.resolve(onInterest?.(post.id, !interested)).catch(error => {
      setInterested(interested)
      setActionError(error.message || 'Interest could not be saved.')
    })
  }

  const handlePollSelect = async (index) => {
    try {
      const result = await onPollVote?.(post.id, index)
      if (result) {
        setSelectedPollOption(index)
        setPollVotes(result.poll_votes)
        setActionError('')
      }
    } catch (error) {
      setActionError(error.message || 'Your vote could not be saved.')
    }
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/posts/${post.id}`
    try {
      if (navigator.share) await navigator.share({ title: 'LinkUp post', url })
      else {
        await navigator.clipboard.writeText(url)
        setActionError('Post link copied.')
      }
      onShare?.(post.id)
    } catch (error) {
      if (error.name !== 'AbortError') setActionError('Could not share this post from your browser.')
    }
  }

  const text = post.content.text
  const shouldTruncate = text && text.length > 200
  const displayText = shouldTruncate && !isExpanded ? truncateText(text, 200) : text

  return (
    <article style={{
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-lg)',
      marginBottom: 'var(--space-md)',
      boxShadow: 'var(--shadow-sm)',
      overflow: 'hidden',
      animation: 'fadeInUp var(--transition-base) forwards'
    }}>
      {/* Author Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: 'var(--space-md) var(--space-md) 0'
      }}>
        <Avatar src={post.author.avatar} alt={post.author.display_name} size="md" />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontWeight: 600,
              fontSize: '15px',
              color: 'var(--color-text-primary)'
            }}>
              {post.author.display_name}
            </span>
            {post.author.verification_status === 'verified' && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: 'var(--color-accent)',
                color: 'white',
                fontSize: '10px',
                fontWeight: 700
              }}>
                ✓
              </span>
            )}
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            color: 'var(--color-text-tertiary)',
            marginTop: '1px'
          }}>
            <span>{post.author.age} • {post.author.location.city}</span>
            <span>·</span>
            <span>{formatRelativeTime(post.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: 'var(--space-md)' }}>
        <p style={{
          fontSize: '15px',
          lineHeight: 1.6,
          color: 'var(--color-text-primary)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}>
          {displayText}
          {shouldTruncate && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-primary)',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                padding: '0 0 0 4px',
                fontFamily: 'var(--font-sans)'
              }}
            >
              {isExpanded ? ' Show less' : ' Read more'}
            </button>
          )}
        </p>

        {/* Media */}
        {post.content.media && post.content.media.length > 0 && (
          <div style={{
            marginTop: 'var(--space-md)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden'
          }}>
            {post.type === 'video' ? (
              <video
                src={post.content.media[0]}
                controls
                playsInline
                preload="metadata"
                aria-label="Post video"
                style={{
                  width: '100%',
                  maxHeight: '500px',
                  display: 'block',
                  background: '#111'
                }}
              />
            ) : (
              <img
                src={post.content.media[0]}
                alt="Post media"
                style={{
                  width: '100%',
                  maxHeight: '400px',
                  objectFit: 'cover',
                  display: 'block'
                }}
                loading="lazy"
              />
            )}
          </div>
        )}

        {/* Poll */}
        {post.type === 'poll' && post.content.poll_options && (
          <PollOptions
            options={post.content.poll_options}
            votes={pollVotes}
            totalVotes={pollVotes.reduce((a, b) => a + b, 0)}
            selectedOption={selectedPollOption}
            onSelect={handlePollSelect}
          />
        )}

        {/* Event Badge */}
        {post.type === 'event' && (
          <div style={{
            marginTop: '12px',
            padding: '10px 14px',
            background: 'var(--color-secondary-soft)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            color: 'var(--color-secondary)',
            fontWeight: 600
          }}>
            <span style={{ fontSize: '16px' }}>📅</span>
            Event — Join the conversation
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--space-md) var(--space-md)',
        borderTop: '1px solid var(--color-border-light)',
        paddingTop: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={handleLike}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: liked ? 'var(--color-primary-soft)' : 'transparent',
              color: liked ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              transition: 'all var(--transition-fast)'
            }}
          >
            <Heart size={18} fill={liked ? 'currentColor' : 'none'} className={liked ? 'animate-heart' : ''} />
            {post.engagement.likes_count + (liked && !post.liked_by_me ? 1 : !liked && post.liked_by_me ? -1 : 0)}
          </button>

          <button
            onClick={() => navigate(`/posts/${post.id}`)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: 'transparent',
              color: 'var(--color-text-tertiary)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              transition: 'all var(--transition-fast)'
            }}
          >
            <MessageCircle size={18} />
            {post.engagement.comments_count}
          </button>

          <button
            onClick={handleShare}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: 'transparent',
              color: 'var(--color-text-tertiary)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: 'var(--font-sans)'
            }}
          >
            <Share2 size={18} />
            Share
          </button>
        </div>
        {actionError && <p role="status" style={{ padding: '0 var(--space-md) var(--space-sm)', color: 'var(--color-text-secondary)', fontSize: 12 }}>{actionError}</p>}

        <button
          onClick={handleInterest}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-full)',
            border: interested ? 'none' : '1.5px solid var(--color-primary)',
            background: interested ? 'var(--color-primary)' : 'transparent',
            color: interested ? 'white' : 'var(--color-primary)',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            fontFamily: 'var(--font-sans)',
            transition: 'all var(--transition-fast)'
          }}
        >
          <Send size={14} />
          {interested ? 'Interested ✓' : 'Interested 👋'}
        </button>
      </div>

    </article>
  )
}
