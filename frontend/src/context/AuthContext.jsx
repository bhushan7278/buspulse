/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('buspulse_token'))
  const [admin, setAdmin] = useState(() => {
    const saved = localStorage.getItem('buspulse_admin')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return null
      }
    }
    return null
  })
  const [loading, setLoading] = useState(true)

  // Verify session on mount
  useEffect(() => {
    let isMounted = true

    const verifyCurrentSession = async () => {
      const storedToken = localStorage.getItem('buspulse_token')
      if (!storedToken) {
        if (isMounted) setLoading(false)
        return
      }

      try {
        const response = await api.get('/auth/admin/me')
        if (isMounted) {
          setAdmin(response.data.admin)
          localStorage.setItem('buspulse_admin', JSON.stringify(response.data.admin))
        }
      } catch {
        // Token is expired or invalid
        if (isMounted) {
          setToken(null)
          setAdmin(null)
          localStorage.removeItem('buspulse_token')
          localStorage.removeItem('buspulse_admin')
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    verifyCurrentSession()

    return () => {
      isMounted = false
    }
  }, [])

  const login = useCallback((newToken, adminData) => {
    setToken(newToken)
    setAdmin(adminData)
    localStorage.setItem('buspulse_token', newToken)
    localStorage.setItem('buspulse_admin', JSON.stringify(adminData))
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/admin/logout')
    } catch {
      // ignore network errors on logout
    } finally {
      setToken(null)
      setAdmin(null)
      localStorage.removeItem('buspulse_token')
      localStorage.removeItem('buspulse_admin')
    }
  }, [])

  const value = {
    token,
    admin,
    isAuthenticated: !!token && !!admin,
    loading,
    login,
    logout
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
