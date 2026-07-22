const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

export const getToken    = ()  => localStorage.getItem('synapx_token')
export const getRefresh  = ()  => localStorage.getItem('synapx_refresh')
export const setToken    = (t) => localStorage.setItem('synapx_token', t)
export const setRefresh  = (t) => localStorage.setItem('synapx_refresh', t)
export const clearTokens = () => {
  localStorage.removeItem('synapx_token')
  localStorage.removeItem('synapx_refresh')
  localStorage.removeItem('synapx_user')
}

// Only ever run one refresh at a time — if several requests 401 together they
// all await the same refresh instead of stampeding the endpoint.
let refreshPromise = null

async function refreshAccessToken() {
  const refreshToken = getRefresh()
  if (!refreshToken) return null

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${BASE}/auth/refresh`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ refreshToken }),
        })
        if (!res.ok) return null
        const body = await res.json()
        const next = body?.data
        if (next?.accessToken) {
          setToken(next.accessToken)
          if (next.refreshToken) setRefresh(next.refreshToken)
          return next.accessToken
        }
        return null
      } catch {
        return null
      } finally {
        refreshPromise = null
      }
    })()
  }
  return refreshPromise
}

async function request(path, options = {}, _retried = false) {
  const token   = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers })

  // Access token expired → try a one-shot silent refresh, then replay once.
  // Never do this for the auth endpoints themselves (avoids refresh loops).
  if (res.status === 401 && !_retried && !path.startsWith('/auth/')) {
    const newToken = await refreshAccessToken()
    if (newToken) return request(path, options, true)
    // Refresh failed → the session is genuinely over.
    clearTokens()
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
  }

  const data = await res.json()

  if (!res.ok) {
    const err = new Error(data.message || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }

  return data
}

export const api = {
  get:   (path, params) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return request(`${path}${qs}`)
  },
  post:  (path, body) => request(path, { method: 'POST',  body: JSON.stringify(body) }),
  put:   (path, body) => request(path, { method: 'PUT',   body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete:(path)       => request(path, { method: 'DELETE' }),
}

export default api
