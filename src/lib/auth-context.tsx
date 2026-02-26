'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AuthData {
  userId: string | null
  gymId: string | null
  memberId: string | null
  memberName: string | null
  gymName: string | null
  loading: boolean
}

const AuthContext = createContext<AuthData>({
  userId: null, gymId: null, memberId: null, memberName: null, gymName: null, loading: true,
})

export function useAuth() { return useContext(AuthContext) }

export function MemberAuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthData>({
    userId: null, gymId: null, memberId: null, memberName: null, gymName: null, loading: true,
  })

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setAuth(prev => ({ ...prev, loading: false })); return }

        const { data: member } = await supabase
          .from('members').select('id, name, gym_id, gyms(name)')
          .eq('user_id', user.id).eq('is_active', true).single()

        setAuth({
          userId: user.id,
          gymId: member?.gym_id || null,
          memberId: member?.id || null,
          memberName: member?.name || null,
          gymName: (member?.gyms as any)?.name || null,
          loading: false,
        })
      } catch {
        setAuth(prev => ({ ...prev, loading: false }))
      }
    }
    load()
  }, [])

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

export function OwnerAuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthData>({
    userId: null, gymId: null, memberId: null, memberName: null, gymName: null, loading: true,
  })

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setAuth(prev => ({ ...prev, loading: false })); return }

        const { data: gym } = await supabase
          .from('gyms').select('id, name').eq('owner_id', user.id).single()

        setAuth({
          userId: user.id,
          gymId: gym?.id || null,
          memberId: null,
          memberName: null,
          gymName: gym?.name || null,
          loading: false,
        })
      } catch {
        setAuth(prev => ({ ...prev, loading: false }))
      }
    }
    load()
  }, [])

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}
