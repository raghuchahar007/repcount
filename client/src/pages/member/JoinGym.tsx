import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { joinGym } from '@/api/me'
import { getPublicGym } from '@/api/public'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface GymPreview {
  name: string
  city: string
  slug: string
}

export default function JoinGymPage() {
  const [slug, setSlug] = useState('')
  const [preview, setPreview] = useState<GymPreview | null>(null)
  const [searching, setSearching] = useState(false)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()

  async function handleSearch() {
    if (!slug.trim()) return
    setSearching(true)
    setError('')
    setPreview(null)
    try {
      const data = await getPublicGym(slug.trim().toLowerCase())
      // Public API returns gym data flat (not wrapped in { gym: ... })
      const gym = data.gym || data
      setPreview({ name: gym.name, city: gym.city || '', slug: slug.trim().toLowerCase() })
    } catch (err: any) {
      setError(err.response?.status === 404 ? 'Gym not found. Check the slug and try again.' : 'Failed to search')
    } finally {
      setSearching(false)
    }
  }

  async function handleJoin() {
    if (!preview) return
    setJoining(true)
    setError('')
    try {
      await joinGym(preview.slug)
      setSuccess('Joined! Redirecting...')
      setTimeout(() => navigate('/m', { replace: true }), 1000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to join gym')
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="text-center pt-4 pb-2">
        <h1 className="text-2xl font-bold text-text-primary">Join a Gym</h1>
        <p className="text-text-secondary text-sm mt-1">Enter your gym's slug to join</p>
      </div>

      <Card>
        <div className="space-y-3">
          <Input
            label="Gym Slug"
            placeholder="e.g. iron-paradise"
            value={slug}
            onChange={(e) => setSlug(e.target.value.replace(/[^a-z0-9-]/g, ''))}
          />
          <Button
            fullWidth
            loading={searching}
            disabled={!slug.trim()}
            onClick={handleSearch}
            variant="secondary"
          >
            Search
          </Button>
        </div>
      </Card>

      {preview && (
        <Card>
          <div className="text-center space-y-3">
            <h3 className="text-lg font-bold text-text-primary">{preview.name}</h3>
            {preview.city && <p className="text-text-secondary text-sm">{preview.city}</p>}
            <Button
              fullWidth
              loading={joining}
              onClick={handleJoin}
            >
              Join {preview.name}
            </Button>
          </div>
        </Card>
      )}

      {error && (
        <Card variant="alert-danger">
          <p className="text-sm">{error}</p>
        </Card>
      )}

      {success && (
        <Card>
          <p className="text-sm text-status-green text-center font-semibold">{success}</p>
        </Card>
      )}
    </div>
  )
}
