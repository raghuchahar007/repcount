'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatCurrency, daysSince } from '@/lib/utils'
import { generateWhatsAppLink, templates } from '@/lib/whatsapp'
import { GOALS, PLAN_TYPES } from '@/lib/constants'
import type { Member, Membership, Attendance } from '@/lib/types'

export default function MemberDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [member, setMember] = useState<Member | null>(null)
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [recentAttendance, setRecentAttendance] = useState<Attendance[]>([])
  const [loading, setLoading] = useState(true)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    plan_type: 'monthly',
    amount: '',
    payment_method: 'cash',
  })
  const [gymName, setGymName] = useState('')
  const [gymUpi, setGymUpi] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadMember()
  }, [id])

  async function loadMember() {
    try {
      const supabase = createClient()

      // Get the current user's gym first
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: gym } = await supabase
        .from('gyms').select('id, name, upi_id').eq('owner_id', user.id).single()
      if (!gym) return

      const [memberRes, membershipsRes, attendanceRes] = await Promise.all([
        supabase.from('members').select('*').eq('id', id).eq('gym_id', gym.id).single(),
        supabase.from('memberships').select('*').eq('member_id', id).order('created_at', { ascending: false }),
        supabase.from('attendance').select('*').eq('member_id', id).order('checked_in_at', { ascending: false }).limit(10),
      ])

      if (memberRes.data) {
        setMember(memberRes.data)
        setGymName(gym.name)
        setGymUpi(gym.upi_id || '')
      }
      setMemberships(membershipsRes.data || [])
      setRecentAttendance(attendanceRes.data || [])
    } catch {
      // silently handle - page shows empty/fallback state
    } finally {
      setLoading(false)
    }
  }

  const handleRecordPayment = async () => {
    if (!member || !paymentForm.amount) return
    if (Number(paymentForm.amount) <= 0) return

    setError('')
    setSaving(true)
    const supabase = createClient()

    const startDate = new Date()
    const expiryDate = new Date()
    const planDays: Record<string, number> = {
      monthly: 30, quarterly: 90, half_yearly: 180, yearly: 365,
    }
    expiryDate.setDate(expiryDate.getDate() + (planDays[paymentForm.plan_type] || 30))

    const { error: payError } = await supabase.from('memberships').insert({
      member_id: member.id,
      gym_id: member.gym_id,
      plan_type: paymentForm.plan_type,
      amount: Number(paymentForm.amount),
      start_date: startDate.toISOString().split('T')[0],
      expiry_date: expiryDate.toISOString().split('T')[0],
      payment_method: paymentForm.payment_method,
      status: 'active',
    })

    if (payError) {
      setError('Failed to record payment. Please try again.')
      setSaving(false)
      return
    }

    setSaving(false)
    setShowPaymentForm(false)
    loadMember()
  }

  if (loading) {
    return <div className="p-4 space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-bg-card rounded-2xl animate-pulse" />)}</div>
  }

  if (!member) {
    return <div className="p-4 text-center text-text-muted">Member not found</div>
  }

  const latestMembership = memberships[0]
  const isOverdue = latestMembership && new Date(latestMembership.expiry_date) < new Date()
  const isExpiringSoon = latestMembership && !isOverdue && new Date(latestMembership.expiry_date) <= new Date(Date.now() + 7 * 86400000)
  const goalLabel = GOALS.find(g => g.value === member.goal)?.label || member.goal

  return (
    <div className="p-4 space-y-4">
      {/* Back button */}
      <button onClick={() => router.back()} className="text-text-secondary text-sm flex items-center gap-1">
        ← Back
      </button>

      {/* Member Header */}
      <Card variant="gradient" className="p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-bg-primary flex items-center justify-center text-2xl font-bold text-accent-orange">
            {member.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-text-primary">{member.name}</h2>
            <p className="text-sm text-text-secondary">{member.phone}</p>
            <div className="flex gap-2 mt-1">
              <Badge color="orange">{goalLabel}</Badge>
              {latestMembership && (
                <Badge color={isOverdue ? 'red' : isExpiringSoon ? 'yellow' : 'green'}>
                  {isOverdue ? `Overdue ${daysSince(latestMembership.expiry_date)}d` : isExpiringSoon ? 'Expiring Soon' : 'Active'}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="success"
          size="sm"
          onClick={() => setShowPaymentForm(!showPaymentForm)}
        >
          💰 Record Payment
        </Button>
        {isOverdue && latestMembership && (
          <a
            href={generateWhatsAppLink(
              member.phone,
              templates.overdue_payment(
                member.name,
                daysSince(latestMembership.expiry_date),
                latestMembership.amount,
                gymName
              )
            )}
            target="_blank"
            rel="noopener"
          >
            <Button variant="outline" size="sm" fullWidth>
              📱 WhatsApp Reminder
            </Button>
          </a>
        )}
        {isExpiringSoon && latestMembership && (
          <a
            href={generateWhatsAppLink(
              member.phone,
              templates.renewal_reminder(
                member.name,
                latestMembership.expiry_date,
                gymName,
                gymUpi || undefined
              )
            )}
            target="_blank"
            rel="noopener"
          >
            <Button variant="outline" size="sm" fullWidth>
              📱 Renewal Reminder
            </Button>
          </a>
        )}
        {!isOverdue && !isExpiringSoon && (
          <a href={`tel:+91${member.phone}`}>
            <Button variant="outline" size="sm" fullWidth>
              📞 Call
            </Button>
          </a>
        )}
      </div>

      {/* Payment Form */}
      {showPaymentForm && (
        <Card className="p-4 space-y-3 border-status-green/30">
          <p className="text-xs font-semibold text-status-green uppercase">Record Payment</p>
          <div>
            <label className="block text-xs text-text-secondary mb-2">Plan</label>
            <div className="grid grid-cols-2 gap-2">
              {PLAN_TYPES.map(p => (
                <button
                  key={p.value}
                  onClick={() => setPaymentForm(prev => ({ ...prev, plan_type: p.value }))}
                  className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                    paymentForm.plan_type === p.value
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
            value={paymentForm.amount}
            onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
          />
          <div className="flex gap-2">
            {['cash', 'upi'].map(m => (
              <button
                key={m}
                onClick={() => setPaymentForm(prev => ({ ...prev, payment_method: m }))}
                className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize ${
                  paymentForm.payment_method === m
                    ? 'bg-accent-orange text-white'
                    : 'bg-bg-hover text-text-secondary border border-border'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          {error && <p className="text-status-red text-xs text-center">{error}</p>}
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowPaymentForm(false)} className="flex-1">Cancel</Button>
            <Button size="sm" onClick={handleRecordPayment} loading={saving} className="flex-1">Save Payment</Button>
          </div>
        </Card>
      )}

      {/* Membership Info */}
      {latestMembership && (
        <Card className="p-4">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Current Plan</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-text-muted">Plan</p>
              <p className="text-sm text-text-primary capitalize">{latestMembership.plan_type.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-[10px] text-text-muted">Amount</p>
              <p className="text-sm text-text-primary">{formatCurrency(latestMembership.amount)}</p>
            </div>
            <div>
              <p className="text-[10px] text-text-muted">Start</p>
              <p className="text-sm text-text-primary">{new Date(latestMembership.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
            <div>
              <p className="text-[10px] text-text-muted">Expiry</p>
              <p className={`text-sm font-medium ${isOverdue ? 'text-status-red' : 'text-text-primary'}`}>
                {new Date(latestMembership.expiry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Payment History */}
      <div>
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Payment History</p>
        <div className="space-y-2">
          {memberships.map(ms => (
            <Card key={ms.id} className="p-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-text-primary">{formatCurrency(ms.amount)}</p>
                <p className="text-[10px] text-text-muted capitalize">{ms.plan_type.replace('_', ' ')} · {ms.payment_method}</p>
              </div>
              <p className="text-xs text-text-secondary">
                {new Date(ms.paid_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </p>
            </Card>
          ))}
          {memberships.length === 0 && (
            <p className="text-text-muted text-xs text-center py-4">No payment records</p>
          )}
        </div>
      </div>

      {/* Recent Attendance */}
      <div>
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Recent Attendance</p>
        <div className="flex flex-wrap gap-2">
          {recentAttendance.map(a => (
            <div key={a.id} className="bg-status-green/10 text-status-green px-3 py-1.5 rounded-lg text-xs">
              {new Date(a.checked_in_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </div>
          ))}
          {recentAttendance.length === 0 && (
            <p className="text-text-muted text-xs">No attendance records</p>
          )}
        </div>
      </div>

      {/* Member Info */}
      <Card className="p-4">
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Details</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-muted">Joined</span>
            <span className="text-text-primary">{new Date(member.join_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Goal</span>
            <span className="text-text-primary">{goalLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Diet</span>
            <span className="text-text-primary capitalize">{member.diet_pref}</span>
          </div>
          {member.dob && (
            <div className="flex justify-between">
              <span className="text-text-muted">DOB</span>
              <span className="text-text-primary">{new Date(member.dob).toLocaleDateString('en-IN')}</span>
            </div>
          )}
          {member.notes && (
            <div>
              <span className="text-text-muted block mb-1">Notes</span>
              <span className="text-text-secondary text-xs">{member.notes}</span>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
