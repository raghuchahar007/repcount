import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { getMyGym } from '@/api/gym'
import { updateProfile } from '@/api/me'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function OwnerProfile() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [gym, setGym] = useState<{ name: string; city: string | null; slug: string } | null>(null)
  const [name, setName] = useState(user?.full_name || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getMyGym()
      .then(g => setGym({ name: g.name, city: g.city || null, slug: g.slug }))
      .catch(() => {})
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      await updateProfile({ name })
      toast('Profile updated', 'success')
    } catch {
      toast('Failed to update', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-text-primary">My Profile</h1>

      <Card className="p-4 space-y-4">
        <Input label="Name" value={name} onChange={e => setName(e.target.value)} />
        <div>
          <label className="block text-sm text-text-secondary mb-1">Email</label>
          <p className="text-text-primary">{user?.email || '—'}</p>
        </div>
        <Button onClick={handleSave} loading={saving} fullWidth>Save</Button>
      </Card>

      {gym && (
        <Card className="p-4 space-y-3">
          <p className="font-semibold text-text-primary">{gym.name}</p>
          {gym.city && <p className="text-sm text-text-secondary capitalize">{gym.city}</p>}
          <a
            href={`/gym/${gym.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary text-sm font-medium"
          >
            View public page →
          </a>
        </Card>
      )}
    </div>
  )
}
