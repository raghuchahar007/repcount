import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getPublicGyms, GymCard } from '@/api/public'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonCard } from '@/components/shared/Skeleton'

export default function LandingPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [gyms, setGyms] = useState<GymCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPublicGyms().then(setGyms).finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-accent-primary">GymRep</h1>
        {!authLoading && (
          user
            ? <Button onClick={() => navigate(user.role === 'owner' ? '/owner' : '/m')}>Dashboard →</Button>
            : <div className="flex gap-2">
                <Link to="/login"><Button variant="ghost">Login</Button></Link>
                <Link to="/register"><Button>Register</Button></Link>
              </div>
        )}
      </div>

      {/* Hero */}
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-text-primary mb-2">Find your gym</h2>
        <p className="text-text-secondary">Gyms powered by GymRep</p>
      </div>

      {/* Gym Grid */}
      {loading ? (
        <div className="grid gap-4">
          {[1,2,3].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : gyms.length === 0 ? (
        <p className="text-center text-text-secondary py-12">No gyms listed yet.</p>
      ) : (
        <div className="grid gap-4">
          {gyms.map(gym => (
            <Link key={gym.slug} to={`/gym/${gym.slug}`}>
              <Card className="p-4 hover:border-accent-primary transition-colors">
                <div className="flex items-center gap-3">
                  {gym.logo_url
                    ? <img src={gym.logo_url} alt={gym.name} className="w-12 h-12 rounded-xl object-cover" />
                    : <div className="w-12 h-12 rounded-xl bg-bg-elevated flex items-center justify-center text-lg font-bold text-accent-primary">{gym.name[0]}</div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text-primary truncate">{gym.name}</p>
                    {gym.city && <p className="text-sm text-text-secondary capitalize">{gym.city}</p>}
                  </div>
                </div>
                {gym.facilities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {gym.facilities.slice(0, 4).map(f => (
                      <span key={f} className="text-xs bg-bg-elevated text-text-secondary px-2 py-0.5 rounded-full">{f}</span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-text-secondary mt-2">
                  {gym.timing_mode === '24x7' ? '24×7 open' : gym.timing_slots.map(s => `${s.label} ${s.open}–${s.close}`).join(' · ')}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
