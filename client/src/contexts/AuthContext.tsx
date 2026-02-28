import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { refreshToken as refreshTokenApi, logout as logoutApi } from '@/api/auth'
import { setAccessToken } from '@/api/axios'

interface AuthUser {
  id: string
  phone: string | null
  email: string | null
  role: 'owner' | 'member' | 'admin' | null
  full_name: string | null
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  showExpiryWarning: boolean
  dismissExpiryWarning: () => void
  login: (accessToken: string, user: AuthUser) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  showExpiryWarning: false,
  dismissExpiryWarning: () => {},
  login: () => {},
  logout: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

const parseTokenExpiry = (token: string): number | null => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp ? payload.exp * 1000 : null // Convert to ms
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [showExpiryWarning, setShowExpiryWarning] = useState(false)
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearWarningTimer = useCallback(() => {
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current)
      warningTimerRef.current = null
    }
  }, [])

  const scheduleExpiryWarning = useCallback((token: string) => {
    clearWarningTimer()
    const expiry = parseTokenExpiry(token)
    if (!expiry) return
    const warningTime = expiry - Date.now() - 5 * 60 * 1000
    if (warningTime > 0) {
      warningTimerRef.current = setTimeout(() => setShowExpiryWarning(true), warningTime)
    }
  }, [clearWarningTimer])

  // Clean up timer on unmount
  useEffect(() => {
    return () => clearWarningTimer()
  }, [clearWarningTimer])

  useEffect(() => {
    async function tryRefresh() {
      try {
        const data = await refreshTokenApi()
        setAccessToken(data.accessToken)
        setUser(data.user)
        scheduleExpiryWarning(data.accessToken)
      } catch {
        setAccessToken(null)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    tryRefresh()
  }, [scheduleExpiryWarning])

  const login = useCallback((accessToken: string, authUser: AuthUser) => {
    setAccessToken(accessToken)
    setUser(authUser)
    scheduleExpiryWarning(accessToken)
  }, [scheduleExpiryWarning])

  const logout = useCallback(async () => {
    try {
      await logoutApi()
    } catch {
      // Ignore — clear local state regardless
    }
    clearWarningTimer()
    setShowExpiryWarning(false)
    setAccessToken(null)
    setUser(null)
  }, [clearWarningTimer])

  const dismissExpiryWarning = useCallback(async () => {
    setShowExpiryWarning(false)
    try {
      const data = await refreshTokenApi()
      setAccessToken(data.accessToken)
      setUser(data.user)
      scheduleExpiryWarning(data.accessToken)
    } catch {
      setAccessToken(null)
      setUser(null)
    }
  }, [scheduleExpiryWarning])

  return (
    <AuthContext.Provider value={{ user, loading, showExpiryWarning, dismissExpiryWarning, login, logout }}>
      {showExpiryWarning && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-status-yellow text-black text-sm font-medium px-4 py-2 flex items-center justify-between">
          <span>Session expiring soon</span>
          <button
            onClick={dismissExpiryWarning}
            className="bg-black/20 px-3 py-1 rounded-lg text-xs font-bold"
          >
            Stay logged in
          </button>
        </div>
      )}
      {children}
    </AuthContext.Provider>
  )
}
