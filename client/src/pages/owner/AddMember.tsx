import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyGym } from '@/api/gym'
import { addMember } from '@/api/members'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { PLAN_TYPES, GOALS, DIET_PREFS } from '@/utils/constants'

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'online', label: 'Online' },
] as const

export default function AddMemberPage() {
  const navigate = useNavigate()
  const [gymId, setGymId] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showMore, setShowMore] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [planType, setPlanType] = useState('monthly')
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [dob, setDob] = useState('')
  const [goal, setGoal] = useState('')
  const [dietPref, setDietPref] = useState('')
  const [notes, setNotes] = useState('')

  // Validation errors
  const [nameError, setNameError] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [amountError, setAmountError] = useState('')
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  useEffect(() => {
    async function load() {
      try {
        const gym = await getMyGym()
        setGymId(gym._id)
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load gym')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function validate(): boolean {
    const errs: string[] = []
    setNameError('')
    setPhoneError('')
    setAmountError('')

    if (!name.trim()) {
      const msg = 'Name is required'
      setNameError(msg)
      errs.push(msg)
    }

    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length !== 10) {
      const msg = 'Enter a valid 10-digit phone number'
      setPhoneError(msg)
      errs.push(msg)
    }

    if (amount && Number(amount) <= 0) {
      const msg = 'Amount must be greater than 0'
      setAmountError(msg)
      errs.push(msg)
    }

    setValidationErrors(errs)
    if (errs.length > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    return errs.length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    setError('')
    setValidationErrors([])

    try {
      const payload: Record<string, any> = {
        name: name.trim(),
        phone: phone.replace(/\D/g, ''),
      }

      if (amount && Number(amount) > 0) {
        payload.plan_type = planType
        payload.amount = Number(amount)
        payload.payment_method = paymentMethod
      }

      if (goal) payload.goal = goal
      if (dietPref) payload.diet_pref = dietPref
      if (dob) payload.dob = dob
      if (notes.trim()) payload.notes = notes.trim()

      await addMember(gymId, payload)
      navigate('/owner/members')
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to add member'
      if (msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('already exists') || err.response?.status === 409) {
        setError('A member with this phone number already exists')
      } else {
        setError(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingSpinner text="Loading..." />

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="text-text-secondary text-sm hover:text-text-primary"
        >
          ← Back
        </button>
        <h2 className="text-lg font-bold text-text-primary">Add Member</h2>
      </div>

      {error && (
        <Card variant="alert-danger">
          <p className="text-sm text-status-red">{error}</p>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {validationErrors.length > 0 && (
          <div className="bg-status-red/10 border border-status-red/20 rounded-xl p-3 mb-4">
            <p className="text-status-red text-sm font-medium">
              {validationErrors.length} error{validationErrors.length > 1 ? 's' : ''} — please fix below
            </p>
          </div>
        )}

        {/* Basic Info */}
        <Card>
          <h3 className="text-sm font-semibold text-text-primary mb-3">Basic Info</h3>
          <div className="space-y-3">
            <Input
              label="Name"
              placeholder="Member name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={nameError}
            />
            <Input
              label="Phone"
              placeholder="10-digit number"
              value={phone}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 10)
                setPhone(val)
              }}
              inputMode="numeric"
              error={phoneError}
            />
          </div>
        </Card>

        {/* Payment */}
        <Card>
          <h3 className="text-sm font-semibold text-text-primary mb-3">Payment (optional)</h3>

          {/* Plan type grid */}
          <label className="block text-sm text-text-secondary mb-1.5">Plan Type</label>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {PLAN_TYPES.map((plan) => (
              <button
                key={plan.value}
                type="button"
                onClick={() => setPlanType(plan.value)}
                className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-colors border ${
                  planType === plan.value
                    ? 'bg-accent-primary/10 border-accent-primary text-accent-primary'
                    : 'bg-bg-card border-border-light text-text-secondary'
                }`}
              >
                {plan.label}
              </button>
            ))}
          </div>

          <Input
            label="Amount (Rs)"
            placeholder="0"
            value={amount}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '')
              setAmount(val)
            }}
            inputMode="numeric"
            error={amountError}
          />

          {/* Payment method */}
          <label className="block text-sm text-text-secondary mb-1.5 mt-3">Payment Method</label>
          <div className="grid grid-cols-4 gap-2">
            {PAYMENT_METHODS.map((pm) => (
              <button
                key={pm.value}
                type="button"
                onClick={() => setPaymentMethod(pm.value)}
                className={`px-2 py-2 rounded-xl text-xs font-medium transition-colors border text-center ${
                  paymentMethod === pm.value
                    ? 'bg-accent-primary/10 border-accent-primary text-accent-primary'
                    : 'bg-bg-card border-border-light text-text-secondary'
                }`}
              >
                {pm.label}
              </button>
            ))}
          </div>
        </Card>

        {/* More Details Toggle */}
        <button
          type="button"
          onClick={() => setShowMore(!showMore)}
          className="w-full text-center text-sm text-accent-primary font-medium py-2"
        >
          {showMore ? 'Hide Details' : 'More Details'}
        </button>

        {showMore && (
          <Card>
            <h3 className="text-sm font-semibold text-text-primary mb-3">Additional Details</h3>
            <div className="space-y-3">
              <Input
                label="Date of Birth"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />

              {/* Goal */}
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">Goal</label>
                <div className="grid grid-cols-3 gap-2">
                  {GOALS.map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setGoal(goal === g.value ? '' : g.value)}
                      className={`px-2 py-2 rounded-xl text-xs font-medium transition-colors border text-center ${
                        goal === g.value
                          ? 'bg-accent-primary/10 border-accent-primary text-accent-primary'
                          : 'bg-bg-card border-border-light text-text-secondary'
                      }`}
                    >
                      {g.emoji} {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Diet Preference */}
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">Diet Preference</label>
                <div className="grid grid-cols-3 gap-2">
                  {DIET_PREFS.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setDietPref(dietPref === d.value ? '' : d.value)}
                      className={`px-2 py-2 rounded-xl text-xs font-medium transition-colors border text-center ${
                        dietPref === d.value
                          ? 'bg-accent-primary/10 border-accent-primary text-accent-primary'
                          : 'bg-bg-card border-border-light text-text-secondary'
                      }`}
                    >
                      {d.emoji} {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes..."
                  rows={3}
                  className="w-full bg-bg-card border border-border-light rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition-colors resize-none"
                />
              </div>
            </div>
          </Card>
        )}

        {/* Submit */}
        <Button type="submit" fullWidth loading={submitting} size="lg">
          Add Member
        </Button>
      </form>
    </div>
  )
}
