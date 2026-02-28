import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyGym, createGym, updateGym } from '@/api/gym'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { FACILITIES_OPTIONS } from '@/utils/constants'
import { slugify } from '@/utils/helpers'
import { QRCodeSVG } from 'qrcode.react'

export default function SettingsPage() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [gymId, setGymId] = useState<string | null>(null)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    slug: '',
    address: '',
    phone: '',
    description: '',
    opening_time: '06:00',
    closing_time: '22:00',
    upi_id: '',
    monthly: '',
    quarterly: '',
    half_yearly: '',
    yearly: '',
    facilities: [] as string[],
  })

  useEffect(() => {
    loadGym()
  }, [])

  async function loadGym() {
    try {
      const gym = await getMyGym()
      if (gym && gym._id) {
        setGymId(gym._id)
        setForm({
          name: gym.name || '',
          slug: gym.slug || '',
          address: gym.address || '',
          phone: gym.phone || '',
          description: gym.description || '',
          opening_time: gym.opening_time || '06:00',
          closing_time: gym.closing_time || '22:00',
          upi_id: gym.upi_id || '',
          monthly: gym.pricing?.monthly?.toString() || '',
          quarterly: gym.pricing?.quarterly?.toString() || '',
          half_yearly: gym.pricing?.half_yearly?.toString() || '',
          yearly: gym.pricing?.yearly?.toString() || '',
          facilities: gym.facilities || [],
        })
      }
    } catch (err: any) {
      // 404 means no gym yet — that's expected for new owners
      if (err?.response?.status !== 404) {
        setError('Failed to load gym settings')
      }
    } finally {
      setLoading(false)
    }
  }

  const update = (field: string, value: string) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value }
      if (field === 'name') updated.slug = slugify(value)
      return updated
    })
  }

  const toggleFacility = (f: string) => {
    setForm(prev => ({
      ...prev,
      facilities: prev.facilities.includes(f)
        ? prev.facilities.filter(x => x !== f)
        : [...prev.facilities, f],
    }))
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Gym name is required')
      return
    }
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const gymData = {
        name: form.name.trim(),
        slug: form.slug || slugify(form.name),
        address: form.address || undefined,
        phone: form.phone || undefined,
        description: form.description || undefined,
        opening_time: form.opening_time || undefined,
        closing_time: form.closing_time || undefined,
        upi_id: form.upi_id || undefined,
        pricing: {
          ...(form.monthly && { monthly: Number(form.monthly) }),
          ...(form.quarterly && { quarterly: Number(form.quarterly) }),
          ...(form.half_yearly && { half_yearly: Number(form.half_yearly) }),
          ...(form.yearly && { yearly: Number(form.yearly) }),
        },
        facilities: form.facilities,
      }

      if (gymId) {
        await updateGym(gymId, gymData)
      } else {
        const created = await createGym(gymData)
        if (created?._id) setGymId(created._id)
      }

      setSuccess('Saved!')
      setTimeout(() => setSuccess(''), 2000)
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-bg-card rounded-2xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold text-text-primary">Gym Settings</h2>

      {/* Basic Info */}
      <Card className="p-4 space-y-3">
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Basic Info</p>
        <Input label="Gym Name" placeholder="Iron Paradise Gym" value={form.name} onChange={(e) => update('name', e.target.value)} />
        <Input label="Gym Page URL" placeholder="iron-paradise-gym" value={form.slug} onChange={(e) => update('slug', e.target.value)} />
        <Input label="Address" placeholder="Near Main Market, Agra" value={form.address} onChange={(e) => update('address', e.target.value)} />
        <Input label="Phone" type="tel" placeholder="9876543210" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
        <div>
          <label className="block text-xs text-text-secondary mb-2">Description</label>
          <textarea
            placeholder="Tell people about your gym..."
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            rows={3}
            className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-orange focus:outline-none resize-none"
          />
        </div>
      </Card>

      {/* Timings */}
      <Card className="p-4 space-y-3">
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Timings</p>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Opening" type="time" value={form.opening_time} onChange={(e) => update('opening_time', e.target.value)} />
          <Input label="Closing" type="time" value={form.closing_time} onChange={(e) => update('closing_time', e.target.value)} />
        </div>
      </Card>

      {/* Pricing */}
      <Card className="p-4 space-y-3">
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Pricing (₹)</p>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Monthly" type="number" placeholder="1200" value={form.monthly} onChange={(e) => update('monthly', e.target.value)} />
          <Input label="Quarterly" type="number" placeholder="3000" value={form.quarterly} onChange={(e) => update('quarterly', e.target.value)} />
          <Input label="Half Yearly" type="number" placeholder="5500" value={form.half_yearly} onChange={(e) => update('half_yearly', e.target.value)} />
          <Input label="Yearly" type="number" placeholder="10000" value={form.yearly} onChange={(e) => update('yearly', e.target.value)} />
        </div>
      </Card>

      {/* UPI */}
      <Card className="p-4 space-y-3">
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Payment</p>
        <Input label="UPI ID" placeholder="gym@upi" value={form.upi_id} onChange={(e) => update('upi_id', e.target.value)} />
      </Card>

      {/* Facilities */}
      <Card className="p-4 space-y-3">
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Facilities</p>
        <div className="flex flex-wrap gap-2">
          {FACILITIES_OPTIONS.map(f => (
            <button
              key={f}
              onClick={() => toggleFacility(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                form.facilities.includes(f)
                  ? 'bg-accent-orange text-white'
                  : 'bg-bg-hover text-text-secondary border border-border'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </Card>

      {error && <p className="text-status-red text-xs text-center">{error}</p>}
      {success && <p className="text-status-green text-xs text-center">{success}</p>}

      <Button onClick={handleSave} fullWidth size="lg" loading={saving}>
        {gymId ? 'Save Changes' : 'Create Gym'}
      </Button>

      {/* Gym QR Code for Check-In */}
      {gymId && (
        <Card>
          <h3 className="text-sm font-semibold text-text-primary mb-3">Gym Check-In QR</h3>
          <p className="text-text-secondary text-xs mb-4">
            Print this and place at your gym entrance. Members scan it to check in.
          </p>
          <div className="flex flex-col items-center py-4">
            <div className="bg-white p-4 rounded-2xl">
              <QRCodeSVG
                value={`repcount:checkin:${gymId}`}
                size={200}
                level="M"
              />
            </div>
            <p className="text-text-primary font-semibold mt-3">{form.name || 'Your Gym'}</p>
            <p className="text-text-muted text-xs mt-1">Scan to check in</p>
          </div>
        </Card>
      )}

      {/* Invite Members */}
      {gymId && form.slug && (
        <Card className="p-4 space-y-3">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Invite Members</p>
          <p className="text-text-secondary text-xs">Share this link for people to request joining your gym</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={`${window.location.origin}/gym/${form.slug}?ref=owner`}
              className="flex-1 bg-bg-primary border border-border rounded-lg px-3 py-2 text-xs text-text-primary"
            />
            <Button
              size="sm"
              onClick={() => {
                const url = `${window.location.origin}/gym/${form.slug}?ref=owner`
                if (navigator.share) {
                  navigator.share({ title: `Join ${form.name}`, url })
                } else {
                  navigator.clipboard.writeText(url)
                  setSuccess('Link copied!')
                  setTimeout(() => setSuccess(''), 2000)
                }
              }}
            >
              Share
            </Button>
          </div>
        </Card>
      )}

      {/* Logout */}
      <Button variant="ghost" fullWidth onClick={handleLogout}>
        Logout
      </Button>
    </div>
  )
}
