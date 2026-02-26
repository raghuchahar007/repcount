'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { GOALS, DIET_PREFS, PLAN_TYPES } from '@/lib/constants'

export default function AddMemberPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    phone: '',
    goal: 'general',
    diet_pref: 'veg',
    plan_type: 'monthly',
    amount: '',
    payment_method: 'cash',
    dob: '',
    notes: '',
  })

  const update = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.name.trim()) return setError('Name is required')
    const cleanPhone = form.phone.replace(/\D/g, '')
    if (cleanPhone.length !== 10) return setError('Enter a valid 10-digit phone number')
    if (!form.amount || Number(form.amount) <= 0) return setError('Enter payment amount')

    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: gym } = await supabase
        .from('gyms').select('id').eq('owner_id', user.id).single()
      if (!gym) throw new Error('No gym found')

      // Calculate expiry based on plan type
      const startDate = new Date()
      const expiryDate = new Date()
      const planDays: Record<string, number> = {
        monthly: 30, quarterly: 90, half_yearly: 180, yearly: 365,
      }
      expiryDate.setDate(expiryDate.getDate() + (planDays[form.plan_type] || 30))

      // Insert member
      const { data: member, error: memberError } = await supabase
        .from('members')
        .insert({
          gym_id: gym.id,
          name: form.name.trim(),
          phone: cleanPhone,
          goal: form.goal,
          diet_pref: form.diet_pref,
          dob: form.dob || null,
          notes: form.notes || null,
        })
        .select()
        .single()

      if (memberError) {
        if (memberError.message.includes('duplicate')) {
          throw new Error('Member with this phone already exists')
        }
        throw memberError
      }

      // Insert membership/payment
      await supabase.from('memberships').insert({
        member_id: member.id,
        gym_id: gym.id,
        plan_type: form.plan_type,
        amount: Number(form.amount),
        start_date: startDate.toISOString().split('T')[0],
        expiry_date: expiryDate.toISOString().split('T')[0],
        payment_method: form.payment_method,
        status: 'active',
      })

      router.push('/owner/members')
    } catch (err: any) {
      setError(err.message || 'Failed to add member')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold text-text-primary mb-4">Add Member</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Info */}
        <Card className="p-4 space-y-3">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Basic Info</p>
          <Input
            label="Full Name"
            placeholder="Member name"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
          />
          <Input
            label="Phone"
            type="tel"
            placeholder="9876543210"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            maxLength={10}
          />
          <Input
            label="Date of Birth (optional)"
            type="date"
            value={form.dob}
            onChange={(e) => update('dob', e.target.value)}
          />
        </Card>

        {/* Goal & Preference */}
        <Card className="p-4 space-y-3">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Goal & Diet</p>
          <div>
            <label className="block text-xs text-text-secondary mb-2">Fitness Goal</label>
            <div className="flex gap-2">
              {GOALS.map(g => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => update('goal', g.value)}
                  className={`flex-1 py-2 px-2 rounded-lg text-[11px] font-medium text-center transition-colors ${
                    form.goal === g.value
                      ? 'bg-accent-orange text-white'
                      : 'bg-bg-hover text-text-secondary border border-border'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-2">Diet Preference</label>
            <div className="flex gap-2">
              {DIET_PREFS.map(d => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => update('diet_pref', d.value)}
                  className={`flex-1 py-2 px-2 rounded-lg text-[11px] font-medium text-center transition-colors ${
                    form.diet_pref === d.value
                      ? 'bg-accent-orange text-white'
                      : 'bg-bg-hover text-text-secondary border border-border'
                  }`}
                >
                  {d.emoji} {d.label}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Payment */}
        <Card className="p-4 space-y-3">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Payment</p>
          <div>
            <label className="block text-xs text-text-secondary mb-2">Plan</label>
            <div className="grid grid-cols-2 gap-2">
              {PLAN_TYPES.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => update('plan_type', p.value)}
                  className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                    form.plan_type === p.value
                      ? 'bg-accent-orange text-white'
                      : 'bg-bg-hover text-text-secondary border border-border'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <Input
            label="Amount (₹)"
            type="number"
            placeholder="1200"
            value={form.amount}
            onChange={(e) => update('amount', e.target.value)}
          />
          <div>
            <label className="block text-xs text-text-secondary mb-2">Payment Method</label>
            <div className="flex gap-2">
              {['cash', 'upi', 'card', 'online'].map(method => (
                <button
                  key={method}
                  type="button"
                  onClick={() => update('payment_method', method)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-colors ${
                    form.payment_method === method
                      ? 'bg-accent-orange text-white'
                      : 'bg-bg-hover text-text-secondary border border-border'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Notes */}
        <Card className="p-4">
          <label className="block text-xs text-text-secondary mb-2">Notes (optional)</label>
          <textarea
            placeholder="Any notes about this member..."
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
            rows={2}
            className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-orange focus:outline-none resize-none"
          />
        </Card>

        {error && <p className="text-status-red text-xs text-center">{error}</p>}

        <Button type="submit" fullWidth size="lg" loading={loading}>
          Add Member
        </Button>
      </form>
    </div>
  )
}
