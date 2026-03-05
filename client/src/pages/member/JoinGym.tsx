import { useState } from 'react'
import { getPublicGym } from '@/api/public'
import { requestToJoinGym, cancelJoinRequest } from '@/api/me'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface GymPreview {
  _id: string
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
  const [requested, setRequested] = useState(false)
  const [requestedGymId, setRequestedGymId] = useState('')

  async function handleSearch() {
    if (!slug.trim()) return
    setSearching(true)
    setError('')
    setPreview(null)
    try {
      const data = await getPublicGym(slug.trim().toLowerCase())
      const gym = data.gym || data
      setPreview({ _id: gym._id, name: gym.name, city: gym.city || '', slug: slug.trim().toLowerCase() })
    } catch (err: any) {
      setError(err.response?.status === 404 ? 'Gym not found. Check the slug and try again.' : 'Failed to search')
    } finally {
      setSearching(false)
    }
  }

  async function handleRequest() {
    if (!preview) return
    setJoining(true)
    setError('')
    try {
      const result = await requestToJoinGym(preview.slug)
      setRequestedGymId(result.gymId)
      setRequested(true)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send request')
    } finally {
      setJoining(false)
    }
  }

  async function handleCancel() {
    try {
      await cancelJoinRequest(requestedGymId)
      setRequested(false)
      setPreview(null)
      setSlug('')
    } catch {
      setError('Failed to cancel request')
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="text-center pt-4 pb-2">
        <h1 className="text-2xl font-bold text-text-primary">Join a Gym</h1>
        <p className="text-text-secondary text-sm mt-1">Enter your gym's slug to request joining</p>
      </div>

      {!requested && (
        <Card>
          <div className="space-y-3">
            <Input
              label="Gym Slug"
              placeholder="e.g. iron-paradise"
              value={slug}
              onChange={(e) => setSlug(e.target.value.replace(/[^a-z0-9-]/g, ''))}
            />
            <Button fullWidth loading={searching} disabled={!slug.trim()} onClick={handleSearch} variant="secondary">
              Search
            </Button>
          </div>
        </Card>
      )}

      {preview && !requested && (
        <Card>
          <div className="text-center space-y-3">
            <h3 className="text-lg font-bold text-text-primary">{preview.name}</h3>
            {preview.city && <p className="text-text-secondary text-sm capitalize">{preview.city}</p>}
            <Button fullWidth loading={joining} onClick={handleRequest}>
              Request to Join
            </Button>
          </div>
        </Card>
      )}

      {requested && (
        <Card className="p-4 text-center space-y-3">
          <p className="text-text-primary font-medium">Request sent!</p>
          <p className="text-text-secondary text-sm">Waiting for the gym owner to approve your request.</p>
          <Button variant="ghost" onClick={handleCancel}>Cancel Request</Button>
        </Card>
      )}

      {error && (
        <Card variant="alert-danger">
          <p className="text-sm">{error}</p>
        </Card>
      )}
    </div>
  )
}
