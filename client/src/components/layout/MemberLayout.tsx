import { useState, useEffect } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { BottomNav, memberNavItems } from './BottomNav'
import { getMyGyms } from '@/api/me'

interface GymInfo {
  memberId: string
  gym: { _id: string; name: string; slug: string }
  joinDate: string
}

export default function MemberLayout() {
  const [gyms, setGyms] = useState<GymInfo[]>([])
  const [activeGymId, setActiveGymId] = useState<string>(
    localStorage.getItem('repcount_active_gym') || ''
  )

  useEffect(() => {
    getMyGyms()
      .then((data: GymInfo[]) => {
        setGyms(data)
        // If no active gym set and there are gyms, use the first one
        if (!activeGymId && data.length > 0) {
          const firstGymId = data[0].gym._id
          setActiveGymId(firstGymId)
          localStorage.setItem('repcount_active_gym', firstGymId)
        }
      })
      .catch(() => {})
  }, [])

  function handleGymSwitch(gymId: string) {
    setActiveGymId(gymId)
    localStorage.setItem('repcount_active_gym', gymId)
    window.location.reload()
  }

  const activeGym = gyms.find(g => g.gym._id === activeGymId)

  return (
    <div className="pb-20">
      <header className="sticky top-0 z-40 bg-bg-primary border-b border-border px-4 py-3 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between">
          <Link to="/m" className="text-lg font-bold text-accent-primary">RepCount</Link>
          {gyms.length > 1 ? (
            <select
              value={activeGymId}
              onChange={(e) => handleGymSwitch(e.target.value)}
              className="text-xs bg-bg-card border border-border rounded-lg px-2 py-1 text-text-secondary"
            >
              {gyms.map(g => (
                <option key={g.gym._id} value={g.gym._id}>{g.gym.name}</option>
              ))}
            </select>
          ) : (
            <span className="text-xs text-text-secondary">
              {activeGym?.gym.name || 'Member'}
            </span>
          )}
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <BottomNav items={memberNavItems} />
    </div>
  )
}
