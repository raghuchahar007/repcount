import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { discoverGyms, getJoinStatus } from '@/api/me'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

interface GymPreview {
  _id: string
  name: string
  slug: string
  city?: string
  address?: string
  facilities?: string[]
  pricing?: Record<string, number>
}

export default function DiscoverGymsPage() {
  const [gyms, setGyms] = useState<GymPreview[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [pendingSlugs, setPendingSlugs] = useState<Set<string>>(new Set())

  useEffect(() => {
    getJoinStatus()
      .then((leads: any[]) => {
        const slugs = new Set(leads.map((l: any) => l.gym?.slug).filter(Boolean))
        setPendingSlugs(slugs)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true)
      discoverGyms(search || undefined)
        .then(setGyms)
        .catch(() => {})
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const lowestPrice = (pricing?: Record<string, number>) => {
    if (!pricing) return null
    const vals = Object.values(pricing).filter(Boolean)
    return vals.length ? Math.min(...vals) : null
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold text-text-primary">Discover Gyms</h2>
      <Input
        placeholder="Search by name or city..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <LoadingSpinner text="Finding gyms..." />
      ) : gyms.length === 0 ? (
        <Card>
          <p className="text-text-muted text-sm text-center py-4">
            No gyms found. Try a different search.
          </p>
        </Card>
      ) : (
        gyms.map((gym) => (
          <Link key={gym._id} to={`/gym/${gym.slug}`}>
            <Card>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-text-primary">{gym.name}</p>
                  {(gym.city || gym.address) && (
                    <p className="text-text-secondary text-xs mt-0.5">
                      {gym.city || gym.address}
                    </p>
                  )}
                  {gym.facilities && gym.facilities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {gym.facilities.slice(0, 4).map((f) => (
                        <span key={f} className="text-[10px] px-2 py-0.5 rounded-full bg-bg-hover text-text-secondary border border-border">
                          {f}
                        </span>
                      ))}
                      {gym.facilities.length > 4 && (
                        <span className="text-[10px] text-text-muted">+{gym.facilities.length - 4}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-right ml-3">
                  {lowestPrice(gym.pricing) && (
                    <p className="text-accent-orange font-bold text-sm">
                      from ₹{lowestPrice(gym.pricing)}
                    </p>
                  )}
                  {pendingSlugs.has(gym.slug) ? (
                    <span className="text-xs font-medium text-status-yellow bg-status-yellow/10 px-2 py-1 rounded-full">Pending</span>
                  ) : (
                    <span className="text-text-muted text-lg">&rarr;</span>
                  )}
                </div>
              </div>
            </Card>
          </Link>
        ))
      )}
    </div>
  )
}
