import axios from 'axios'

/**
 * Resolves the backend API base URL
 */
const resolveApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim() !== '') {
    return import.meta.env.VITE_API_URL.trim().replace(/\/+$/, '')
  }
  const protocol = window.location.protocol || 'http:'
  const hostname = window.location.hostname || 'localhost'
  return `${protocol}//${hostname}:5000`
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor: attach JWT Bearer token if present
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('buspulse_token')
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

// Response interceptor: handle 401 unauthorized / expired tokens
api.interceptors.response.use(
  response => response,
  error => {
    const status = error?.response?.status
    const url = error?.config?.url || ''

    // If 401 occurs on login or registration endpoints, do not redirect - let the form handle it
    const isAuthEndpoint = url.includes('/auth/admin/login') || url.includes('/auth/admin/register')

    if (status === 401 && !isAuthEndpoint) {
      // Clear invalid session state
      localStorage.removeItem('buspulse_token')
      localStorage.removeItem('buspulse_admin')

      // Avoid redirect loops if already on login or public pages
      const pathname = window.location.pathname
      if (pathname !== '/login' && pathname !== '/register' && pathname !== '/track') {
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export default api
