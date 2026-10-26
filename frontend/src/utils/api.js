const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')
const ACCESS_TOKEN_KEY = 'linkup_access_token'
const REFRESH_TOKEN_KEY = 'linkup_refresh_token'

export function setTokens({ access, refresh }) {
  if (access) localStorage.setItem(ACCESS_TOKEN_KEY, access)
  if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

async function refreshAccessToken() {
  const refresh = localStorage.getItem(REFRESH_TOKEN_KEY)
  if (!refresh) return false
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh })
  })
  if (!response.ok) {
    clearTokens()
    return false
  }
  const tokens = await response.json()
  setTokens(tokens)
  return true
}

function getErrorMessage(body, status) {
  if (typeof body === 'string' && body) return body
  if (body && typeof body === 'object') {
    if (typeof body.detail === 'string') return body.detail
    return Object.entries(body)
      .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(' ') : messages}`)
      .join(' ')
  }
  return `Request failed (${status}).`
}

export async function apiRequest(path, options = {}, retry = true) {
  const headers = new Headers(options.headers || {})
  const token = localStorage.getItem(ACCESS_TOKEN_KEY)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
  if (response.status === 401 && retry && localStorage.getItem(REFRESH_TOKEN_KEY) && await refreshAccessToken()) {
    return apiRequest(path, options, false)
  }
  if (response.status === 204) return null
  const contentType = response.headers.get('content-type') || ''
  const body = contentType.includes('application/json') ? await response.json() : await response.text()
  if (!response.ok) {
    const error = new Error(getErrorMessage(body, response.status))
    error.status = response.status
    throw error
  }
  return body
}

export const api = {
  get: path => apiRequest(path),
  post: (path, data) => apiRequest(path, { method: 'POST', body: JSON.stringify(data) }),
  patch: (path, data) => apiRequest(path, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (path, data) => apiRequest(path, {
    method: 'DELETE',
    ...(data ? { body: JSON.stringify(data) } : {})
  })
}
