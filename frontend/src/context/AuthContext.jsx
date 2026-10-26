import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { api, clearTokens, setTokens } from '../utils/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    const current = await api.get('/api/v1/auth/me/')
    setUser(current)
    return current
  }, [])

  useEffect(() => {
    if (!localStorage.getItem('linkup_access_token') && !localStorage.getItem('linkup_refresh_token')) {
      setIsLoading(false)
      return
    }
    refreshUser()
      .catch(() => {
        setUser(null)
      })
      .finally(() => setIsLoading(false))
  }, [refreshUser])

  const login = useCallback(async (email, password) => {
    setIsLoading(true)
    try {
      const result = await api.post('/api/v1/auth/login/', { email, password })
      setTokens(result)
      setUser(result.user)
      return result.user
    } finally {
      setIsLoading(false)
    }
  }, [])

  const signup = useCallback(async (email, password, userData) => {
    setIsLoading(true)
    try {
      const result = await api.post('/api/v1/auth/register/', {
        email,
        password,
        display_name: userData.display_name,
        age: Number(userData.age),
        gender: userData.gender,
        bio: userData.bio || '',
        interests: userData.interests || [],
        location: userData.location
      })
      setTokens(result)
      setUser(result.user)
      return result.user
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    clearTokens()
    setUser(null)
  }, [])

  const updateUser = useCallback(async (updates) => {
    const current = await api.patch('/api/v1/profiles/me/', updates)
    setUser(current)
    return current
  }, [])

  const value = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    signup,
    logout,
    updateUser,
    refreshUser
  }), [user, isLoading, login, signup, logout, updateUser, refreshUser])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
