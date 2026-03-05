import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyGym, createGym, updateGym } from '@/api/gym'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { FACILITIES_OPTIONS } from '@/utils/constants'
import { slugify } from '@/utils/helpers'
import { QRCodeSVG } from 'qrcode.react'

interface TimingSlot { label: string; open: string; close: string }
interface PlanType { id: string; name: string }

const DURATIONS = ['monthly', 'quarterly', 'half_yearly', 'yearly']
const DURATION_LABELS: Record<string, string> = {
  monthly: 'Monthly', quarterly: 'Quarterly', half_yearly: '6 Months', yearly: 'Yearly',
}

const DEFAULT_SLOTS: TimingSlot[] = [
  { label: 'Morning', open: '06:00', close: '12:00' },
  { label: 'Evening', open: '16:00', close: '22:00' },
]

const DEFAULT_PLAN_TYPES: PlanType[] = [
  { id: 'strength', name: 'Strength' },
  { id: 'strength_cardio', name: 'Strength + Cardio' },
]

export default function SettingsPage() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [gymId, setGymId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [initialForm, setInitialForm] = useState<string>('')

  const [form, setForm] = useState({
    name: '',
    slug: '',
    address: '',
    phone: '',
    description: '',
    upi_id: '',
    facilities: [] as string[],
  })
  const [timingMode, setTimingMode] = useState<'slots' | '24x7'>('slots')
  const [timingSlots, setTimingSlots] = useState<TimingSlot[]>(DEFAULT_SLOTS)
  const [planTypes, setPlanTypes] = useState<PlanType[]>(DEFAULT_PLAN_TYPES)
  const [pricing, setPricing] = useState<Record<string, Record<string, number>>>({})

  useEffect(() => {
    loadGym()
  }, [])

  function getFormSnapshot() {
    return JSON.stringify({ form, timingMode, timingSlots, planTypes, pricing })
  }

  async function loadGym() {
    try {
      const gym = await getMyGym()
      if (gym && gym._id) {
        setGymId(gym._id)
        const formValues = {
          name: gym.name || '',
          slug: gym.slug || '',
          address: gym.address || '',
          phone: gym.phone || '',
          description: gym.description || '',
          upi_id: gym.upi_id || '',
          facilities: gym.facilities || [],
        }
        setForm(formValues)
        setTimingMode(gym.timing_mode || 'slots')
        setTimingSlots(gym.timing_slots?.length ? gym.timing_slots : [...DEFAULT_SLOTS])
        setPlanTypes(gym.plan_types?.length ? gym.plan_types : [...DEFAULT_PLAN_TYPES])
        setPricing(gym.pricing || {})
        setInitialForm(JSON.stringify({ form: formValues, timingMode: gym.timing_mode || 'slots', timingSlots: gym.timing_slots || DEFAULT_SLOTS, planTypes: gym.plan_types || DEFAULT_PLAN_TYPES, pricing: gym.pricing || {} }))
      }
    } catch (err: any) {
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

  const isDirty = initialForm && getFormSnapshot() !== initialForm

  const handleSave = async () => {
    const errs: string[] = []
    if (!form.name.trim()) errs.push('Gym name is required')
    if (!form.slug.trim()) errs.push('Gym page URL (slug) is required')
    setValidationErrors(errs)
    if (errs.length > 0) {
      setError('')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setSaving(true)
    setValidationErrors([])

    try {
      const gymData = {
        name: form.name.trim(),
        slug: form.slug || slugify(form.name),
        address: form.address || undefined,
        phone: form.phone || undefined,
        description: form.description || undefined,
        upi_id: form.upi_id || undefined,
        timing_mode: timingMode,
        timing_slots: timingMode === 'slots' ? timingSlots : [],
        plan_types: planTypes,
        pricing,
        facilities: form.facilities,
      }

      let updated: any
      if (gymId) {
        updated = await updateGym(gymId, gymData)
      } else {
        updated = await createGym(gymData)
        if (updated?._id) setGymId(updated._id)
      }

      // Update local state from response — no re-fetch needed
      if (updated) {
        setTimingMode(updated.timing_mode || timingMode)
        setTimingSlots(updated.timing_slots?.length ? updated.timing_slots : timingSlots)
        setPlanTypes(updated.plan_types?.length ? updated.plan_types : planTypes)
        setPricing(updated.pricing || pricing)
      }

      setInitialForm(getFormSnapshot())
      toast('Saved ✓', 'success')
    } catch (err: any) {
      toast(err?.response?.data?.error || err.message || 'Failed to save', 'error')
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

      {isDirty && (
        <div className="bg-status-yellow/20 text-status-yellow text-sm font-medium px-4 py-2 rounded-xl text-center mb-4">
          You have unsaved changes
        </div>
      )}

      {validationErrors.length > 0 && (
        <div className="bg-status-red/10 border border-status-red/20 rounded-xl p-3 mb-4">
          <p className="text-status-red text-sm font-medium">
            {validationErrors.length} error{validationErrors.length > 1 ? 's' : ''} — please fix below
          </p>
        </div>
      )}

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
            className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none resize-none"
          />
        </div>
      </Card>

      {/* Timings */}
      <Card className="p-4 space-y-3">
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Timing</p>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={timingMode === '24x7'}
            onChange={e => setTimingMode(e.target.checked ? '24x7' : 'slots')}
            className="w-4 h-4"
          />
          <span className="text-sm text-text-primary">24×7 Open</span>
        </label>

        {timingMode === 'slots' && (
          <div className="space-y-2">
            {timingSlots.map((slot, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  className="bg-bg-card border border-border-light rounded-lg px-3 py-2 text-sm w-24"
                  placeholder="Label"
                  value={slot.label}
                  onChange={e => {
                    const updated = [...timingSlots]
                    updated[idx] = { ...updated[idx], label: e.target.value }
                    setTimingSlots(updated)
                  }}
                />
                <input
                  type="time"
                  value={slot.open}
                  className="bg-bg-card border border-border-light rounded-lg px-3 py-2 text-sm"
                  onChange={e => { const u = [...timingSlots]; u[idx] = { ...u[idx], open: e.target.value }; setTimingSlots(u) }}
                />
                <span className="text-text-secondary text-sm">to</span>
                <input
                  type="time"
                  value={slot.close}
                  className="bg-bg-card border border-border-light rounded-lg px-3 py-2 text-sm"
                  onChange={e => { const u = [...timingSlots]; u[idx] = { ...u[idx], close: e.target.value }; setTimingSlots(u) }}
                />
                {timingSlots.length > 1 && (
                  <button
                    onClick={() => setTimingSlots(timingSlots.filter((_, i) => i !== idx))}
                    className="text-status-red text-sm"
                  >✕</button>
                )}
              </div>
            ))}
            {timingSlots.length < 4 && (
              <button
                onClick={() => setTimingSlots([...timingSlots, { label: '', open: '06:00', close: '22:00' }])}
                className="text-accent-primary text-sm"
              >+ Add slot</button>
            )}
          </div>
        )}
      </Card>

      {/* Plans & Pricing */}
      <Card className="p-4 space-y-4">
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Plans & Pricing (₹)</p>
        {planTypes.map((pt) => (
          <div key={pt.id} className="bg-bg-elevated rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2">
              <input
                className="bg-bg-card border border-border-light rounded-lg px-3 py-1.5 text-sm flex-1"
                value={pt.name}
                onChange={e => setPlanTypes(planTypes.map(p => p.id === pt.id ? { ...p, name: e.target.value } : p))}
              />
              {planTypes.length > 1 && (
                <button
                  onClick={() => setPlanTypes(planTypes.filter(p => p.id !== pt.id))}
                  className="text-status-red text-sm"
                >✕</button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DURATIONS.map(dur => (
                <div key={dur} className="flex items-center gap-2">
                  <span className="text-xs text-text-secondary w-16">{DURATION_LABELS[dur]}</span>
                  <input
                    type="number"
                    className="bg-bg-card border border-border-light rounded-lg px-2 py-1 text-sm w-full"
                    placeholder="₹0"
                    value={pricing[pt.id]?.[dur] || ''}
                    onChange={e => setPricing({
                      ...pricing,
                      [pt.id]: { ...(pricing[pt.id] || {}), [dur]: Number(e.target.value) },
                    })}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
        <button
          onClick={() => {
            const id = `plan_${Date.now()}`
            setPlanTypes([...planTypes, { id, name: 'New Plan' }])
          }}
          className="text-accent-primary text-sm"
        >+ Add plan type</button>
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
                  ? 'bg-accent-primary text-white'
                  : 'bg-bg-hover text-text-secondary border border-border'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </Card>

      {error && <p className="text-status-red text-xs text-center">{error}</p>}

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
              <QRCodeSVG value={`gymrep:checkin:${gymId}`} size={200} level="M" />
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
                  toast('Link copied!')
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
