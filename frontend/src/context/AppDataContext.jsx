import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../utils/api'
import { useAuth } from './AuthContext'

const AppDataContext = createContext(null)

export function AppDataProvider({ children }) {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [likedUserIds, setLikedUserIds] = useState([])
  const [blockedProfiles, setBlockedProfiles] = useState([])
  const [reports, setReports] = useState([])
  const [isLoadingPosts, setIsLoadingPosts] = useState(false)
  const [postsError, setPostsError] = useState('')
  const [relationshipsError, setRelationshipsError] = useState('')

  const refreshPosts = useCallback(async () => {
    if (!user) {
      setPosts([])
      setPostsError('')
      return []
    }
    setIsLoadingPosts(true)
    try {
      const response = await api.get('/api/v1/posts/')
      const items = response.results || response
      setPosts(items)
      setPostsError('')
      return items
    } catch (error) {
      setPostsError(error.message || 'Posts could not be loaded.')
      throw error
    } finally {
      setIsLoadingPosts(false)
    }
  }, [user])

  const refreshRelationships = useCallback(async () => {
    if (!user) {
      setLikedUserIds([])
      setBlockedProfiles([])
      setReports([])
      setRelationshipsError('')
      return
    }
    try {
      const [liked, blocked, submittedReports] = await Promise.all([
        api.get('/api/v1/likes/outgoing/'),
        api.get('/api/v1/safety/blocks/'),
        api.get('/api/v1/safety/reports/')
      ])
      setLikedUserIds(liked.map(profile => profile.id))
      setBlockedProfiles(blocked)
      setReports(submittedReports)
      setRelationshipsError('')
    } catch (error) {
      setRelationshipsError(error.message || 'Account activity could not be loaded.')
      throw error
    }
  }, [user])

  useEffect(() => {
    if (!user) {
      setPosts([])
      setPostsError('')
      setLikedUserIds([])
      setBlockedProfiles([])
      setReports([])
      setRelationshipsError('')
      return
    }
    refreshPosts().catch(error => console.error('Could not load posts:', error))
    refreshRelationships().catch(error => console.error('Could not load account data:', error))
  }, [user, refreshPosts, refreshRelationships])

  const createPost = useCallback(async (post) => {
    const created = await api.post('/api/v1/posts/', {
      type: post.type,
      content: post.content
    })
    setPosts(current => [created, ...current])
    return created
  }, [])

  const updatePost = useCallback(async (postId, updates) => {
    const updated = await api.patch(`/api/v1/posts/${postId}/`, updates)
    setPosts(current => current.map(post => post.id === postId ? updated : post))
    return updated
  }, [])

  const deletePost = useCallback(async (postId) => {
    await api.delete(`/api/v1/posts/${postId}/`)
    setPosts(current => current.filter(post => post.id !== postId))
  }, [])

  const togglePostLike = useCallback(async (postId, liked) => {
    const response = await api.post(`/api/v1/posts/${postId}/like/`, {})
    setPosts(current => current.map(post => post.id === postId
      ? {
          ...post,
          liked_by_me: response.liked,
          engagement: { ...post.engagement, likes_count: response.likes_count }
        }
      : post))
    return response
  }, [])

  const togglePostInterest = useCallback(async (postId, interested) => {
    const response = await api.post(`/api/v1/posts/${postId}/interest/`, {})
    setPosts(current => current.map(post => post.id === postId
      ? { ...post, interested_by_me: response.interested }
      : post))
    return response
  }, [])

  const votePoll = useCallback(async (postId, optionIndex) => {
    const response = await api.post(`/api/v1/posts/${postId}/poll-vote/`, { option_index: optionIndex })
    setPosts(current => current.map(post => post.id === postId
      ? {
          ...post,
          content: {
            ...post.content,
            poll_votes: response.poll_votes,
            selected_poll_option: response.selected_option_index
          }
        }
      : post))
    return response
  }, [])

  const toggleUserLike = useCallback(async (userId) => {
    const isLiked = likedUserIds.includes(userId)
    if (isLiked) {
      await api.delete('/api/v1/likes/', { user_id: userId })
      setLikedUserIds(current => current.filter(id => id !== userId))
      return { liked: false }
    }
    const response = await api.post('/api/v1/likes/', { user_id: userId })
    setLikedUserIds(current => current.includes(userId) ? current : [...current, userId])
    return response
  }, [likedUserIds])

  const setBlocked = useCallback(async (userId, blocked) => {
    if (blocked) {
      const result = await api.post('/api/v1/safety/blocks/', { user_id: userId })
      setBlockedProfiles(current => current.some(item => item.user.id === userId) ? current : [...current, result])
      setLikedUserIds(current => current.filter(id => id !== userId))
      return result
    }
    const block = blockedProfiles.find(item => item.user.id === userId)
    if (block) await api.delete(`/api/v1/safety/blocks/${block.id}/`)
    setBlockedProfiles(current => current.filter(item => item.user.id !== userId))
  }, [blockedProfiles])

  const addReport = useCallback(async (report) => {
    const created = await api.post('/api/v1/safety/reports/', {
      reported_user_id: report.user_id,
      reason: report.reason,
      details: report.details
    })
    setReports(current => [created, ...current])
    return created
  }, [])

  const addComment = useCallback(async (comment) => {
    const created = await api.post(`/api/v1/posts/${comment.post_id}/comments/`, { text: comment.text })
    setPosts(current => current.map(post => post.id === comment.post_id
      ? { ...post, engagement: { ...post.engagement, comments_count: (post.engagement?.comments_count || 0) + 1 } }
      : post))
    return created
  }, [])

  const getComments = useCallback(postId => api.get(`/api/v1/posts/${postId}/comments/`), [])
  const getPost = useCallback(postId => api.get(`/api/v1/posts/${postId}/`), [])
  const searchProfiles = useCallback(params => {
    const query = new URLSearchParams(params)
    return api.get(`/api/v1/discover/?${query.toString()}`)
  }, [])
  const getProfile = useCallback(userId => api.get(`/api/v1/profiles/${userId}/`), [])
  const getPostsByAuthor = useCallback(async (authorId) => {
    const response = await api.get(`/api/v1/posts/?author=${encodeURIComponent(authorId)}`)
    return response.results || response
  }, [])

  const value = useMemo(() => ({
    posts,
    likedUserIds,
    blockedProfiles,
    blockedUserIds: blockedProfiles.map(item => item.user.id),
    reports,
    isLoadingPosts,
    postsError,
    relationshipsError,
    refreshPosts,
    refreshRelationships,
    createPost,
    updatePost,
    deletePost,
    togglePostLike,
    togglePostInterest,
    votePoll,
    toggleUserLike,
    setBlocked,
    addReport,
    addComment,
    getComments,
    getPost,
    searchProfiles,
    getProfile,
    getPostsByAuthor
  }), [
    posts, likedUserIds, blockedProfiles, reports, isLoadingPosts, postsError,
    relationshipsError, refreshPosts,
    refreshRelationships, createPost, updatePost, deletePost, togglePostLike,
    togglePostInterest, votePoll, toggleUserLike, setBlocked, addReport, addComment, getComments, getPost,
    searchProfiles, getProfile, getPostsByAuthor
  ])

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData() {
  const context = useContext(AppDataContext)
  if (!context) throw new Error('useAppData must be used within AppDataProvider')
  return context
}
