import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
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
  login: (accessToken: string, user: AuthUser) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: () => {},
  logout: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function tryRefresh() {
      try {
        const data = await refreshTokenApi()
        setAccessToken(data.accessToken)
        setUser(data.user)
      } catch {
        setAccessToken(null)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    tryRefresh()
  }, [])

  const login = useCallback((accessToken: string, authUser: AuthUser) => {
    setAccessToken(accessToken)
    setUser(authUser)
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutApi()
    } catch {
      // Ignore — clear local state regardless
    }
    setAccessToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
