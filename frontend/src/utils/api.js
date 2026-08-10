/**
 * Centralized API client — httpOnly cookie auth
 *
 * All API calls go through this module. Auth is handled exclusively via
 * httpOnly cookies (no localStorage tokens). On 401, the session is
 * considered expired and the user is redirected to login.
 */

const API_URL = import.meta.env.VITE_API_URL || '/api'

/**
 * Core fetch wrapper — always sends credentials (httpOnly cookies).
 * Returns the raw Response object — caller handles .json(), .blob(), etc.
 *
 * On 401: clears user state and reloads the page (back to login).
 * Components can still catch 401 themselves before this handler fires.
 */
export async function apiFetch(endpoint, options = {}) {
  const config = {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  }

  // Merge custom headers without overriding the browser's multipart boundary
  if (options.headers) {
    config.headers = { ...config.headers, ...options.headers }
  }

  const response = await fetch(`${API_URL}${endpoint}`, config)

  if (response.status === 401) {
    localStorage.removeItem('user')
    localStorage.removeItem('tenant')
    window.location.reload()
    throw new Error('Sesión expirada')
  }

  return response
}

/**
 * Convenience methods for common HTTP verbs.
 *
 * Usage:
 *   api.get('/leads')
 *   api.post('/leads', { name: '...' })
 *   api.put('/leads/1', { status: 'contactado' })
 *   api.delete('/leads/1')
 *   api.upload('/properties/upload', formData)
 */
export const api = {
  get: (url, opts) => apiFetch(url, { method: 'GET', ...opts }),

  post: (url, body, opts) =>
    apiFetch(url, { method: 'POST', body: JSON.stringify(body), ...opts }),

  put: (url, body, opts) =>
    apiFetch(url, { method: 'PUT', body: JSON.stringify(body), ...opts }),

  patch: (url, body, opts) =>
    apiFetch(url, { method: 'PATCH', body: JSON.stringify(body), ...opts }),

  delete: (url, opts) => apiFetch(url, { method: 'DELETE', ...opts }),

  /**
   * File upload — omits Content-Type so the browser sets the correct
   * multipart/form-data boundary automatically.
   */
  upload: (url, formData, opts) =>
    apiFetch(url, { method: 'POST', body: formData, headers: {}, ...opts }),
}
