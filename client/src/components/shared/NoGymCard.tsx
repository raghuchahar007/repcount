import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'

export function NoGymCard({ feature }: { feature?: string }) {
  return (
    <div className="p-4 flex flex-col items-center justify-center min-h-[60vh]">
      <Card>
        <div className="text-center py-6">
          <span className="text-5xl block mb-4">🏋️</span>
          <h2 className="text-lg font-bold text-text-primary mb-2">No Gym Yet</h2>
          <p className="text-text-secondary text-sm mb-4">
            {feature
              ? `Join a gym to unlock ${feature}`
              : 'Join a gym to get started'}
          </p>
          <Link
            to="/m/discover"
            className="inline-block bg-accent-orange text-white font-semibold text-sm px-6 py-2.5 rounded-xl"
          >
            Discover Gyms
          </Link>
        </div>
      </Card>
    </div>
  )
}
