import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getMyGym } from '@/api/gym'
import { getMember } from '@/api/members'
import { recordPayment } from '@/api/memberships'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { PLAN_TYPES, GOALS } from '@/utils/constants'
import { todayIST, daysUntil, daysSince, formatDate, formatCurrency, formatPhone, getInitials } from '@/utils/helpers'
import { generateWhatsAppLink, templates } from '@/utils/whatsapp'

interface Membership {
  _id: string
  plan_type: string
  amount: number
  start_date: string
  expiry_date: string
  payment_method: string
  created_at: string
}

interface AttendanceRecord {
  _id: string
  date: string
  created_at: string
}

interface MemberData {
  _id: string
  name: string
  phone: string
  goal?: string
  diet_pref?: string
  dob?: string
  notes?: string
  created_at: string
}

interface MemberResponse {
  member: MemberData
  memberships: Membership[]
  attendance: AttendanceRecord[]
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'online', label: 'Online' },
] as const

function getStatus(memberships: Membership[]): { label: string; color: 'red' | 'yellow' | 'green' | 'gray' } {
  if (!memberships.length) return { label: 'No Plan', color: 'gray' }
  const latest = memberships[0]
  const today = todayIST()
  if (latest.expiry_date < today) return { label: 'Overdue', color: 'red' }
  const sevenDays = new Date(Date.now() + 7 * 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  if (latest.expiry_date <= sevenDays) return { label: 'Expiring', color: 'yellow' }
  return { label: 'Active', color: 'green' }
}

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [gymId, setGymId] = useState('')
  const [gymName, setGymName] = useState('')
  const [gymUpi, setGymUpi] = useState('')
  const [data, setData] = useState<MemberResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Payment form
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [planType, setPlanType] = useState('monthly')
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paymentSubmitting, setPaymentSubmitting] = useState(false)
  const [paymentError, setPaymentError] = useState('')

  async function loadData() {
    try {
      const gym = await getMyGym()
      setGymId(gym._id)
      setGymName(gym.name || '')
      setGymUpi(gym.upi_id || '')
      const memberData = await getMember(gym._id, id!)
      setData(memberData)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load member')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!amount || Number(amount) <= 0) {
      setPaymentError('Enter a valid amount')
      return
    }

    setPaymentSubmitting(true)
    setPaymentError('')

    try {
      await recordPayment(gymId, {
        member_id: id!,
        plan_type: planType,
        amount: Number(amount),
        payment_method: paymentMethod,
      })
      setShowPaymentForm(false)
      setAmount('')
      setPlanType('monthly')
      setPaymentMethod('cash')
      // Reload member data
      const memberData = await getMember(gymId, id!)
      setData(memberData)
    } catch (err: any) {
      setPaymentError(err.response?.data?.error || 'Failed to record payment')
    } finally {
      setPaymentSubmitting(false)
    }
  }

  if (loading) return <LoadingSpinner text="Loading member..." />

  if (error || !data) {
    return (
      <div className="p-4 space-y-4">
        <button
          onClick={() => navigate(-1)}
          className="text-text-secondary text-sm hover:text-text-primary"
        >
          ← Back
        </button>
        <Card variant="alert-danger">
          <p className="text-sm text-status-red">{error || 'Member not found'}</p>
        </Card>
      </div>
    )
  }

  const { member, memberships, attendance } = data
  const status = getStatus(memberships)
  const latest = memberships[0] || null
  const goalObj = GOALS.find((g) => g.value === member.goal)

  // WhatsApp logic
  function getActionButton() {
    if (status.color === 'red' && latest) {
      const daysOverdue = daysSince(latest.expiry_date)
      const message = templates.overdue_payment(member.name, daysOverdue, latest.amount, gymName)
      const waLink = generateWhatsAppLink(member.phone, message)
      return (
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1"
        >
          <Button variant="success" fullWidth size="sm">
            WhatsApp
          </Button>
        </a>
      )
    }
    if (status.color === 'yellow' && latest) {
      const message = templates.renewal_reminder(member.name, formatDate(latest.expiry_date), gymName, gymUpi || undefined)
      const waLink = generateWhatsAppLink(member.phone, message)
      return (
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1"
        >
          <Button variant="success" fullWidth size="sm">
            WhatsApp
          </Button>
        </a>
      )
    }
    return (
      <a href={`tel:+91${member.phone}`} className="flex-1">
        <Button variant="secondary" fullWidth size="sm">
          Call
        </Button>
      </a>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="text-text-secondary text-sm hover:text-text-primary"
      >
        ← Back
      </button>

      {/* Member Header */}
      <Card variant="gradient" className="text-white">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-lg font-bold">
            {getInitials(member.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold truncate">{member.name}</h2>
            <p className="text-white/60 text-sm">{formatPhone(member.phone)}</p>
            <div className="flex items-center gap-2 mt-1">
              {goalObj && (
                <Badge color="blue">
                  {goalObj.emoji} {goalObj.label}
                </Badge>
              )}
              <Badge color={status.color}>{status.label}</Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          fullWidth
          size="sm"
          onClick={() => setShowPaymentForm(!showPaymentForm)}
        >
          Record Payment
        </Button>
        {getActionButton()}
      </div>

      {/* Payment Form (expandable) */}
      {showPaymentForm && (
        <Card>
          <h3 className="text-sm font-semibold text-text-primary mb-3">Record Payment</h3>
          <form onSubmit={handleRecordPayment} className="space-y-3">
            {/* Plan type grid */}
            <div className="grid grid-cols-2 gap-2">
              {PLAN_TYPES.map((plan) => (
                <button
                  key={plan.value}
                  type="button"
                  onClick={() => setPlanType(plan.value)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-colors border ${
                    planType === plan.value
                      ? 'bg-accent-orange/10 border-accent-orange text-accent-orange'
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
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
            />

            {/* Payment method */}
            <div className="grid grid-cols-4 gap-2">
              {PAYMENT_METHODS.map((pm) => (
                <button
                  key={pm.value}
                  type="button"
                  onClick={() => setPaymentMethod(pm.value)}
                  className={`px-2 py-2 rounded-xl text-xs font-medium transition-colors border text-center ${
                    paymentMethod === pm.value
                      ? 'bg-accent-orange/10 border-accent-orange text-accent-orange'
                      : 'bg-bg-card border-border-light text-text-secondary'
                  }`}
                >
                  {pm.label}
                </button>
              ))}
            </div>

            {paymentError && (
              <p className="text-xs text-status-red">{paymentError}</p>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                fullWidth
                onClick={() => {
                  setShowPaymentForm(false)
                  setPaymentError('')
                }}
              >
                Cancel
              </Button>
              <Button type="submit" fullWidth loading={paymentSubmitting}>
                Save
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Current Plan */}
      {latest && (
        <Card>
          <h3 className="text-sm font-semibold text-text-primary mb-2">Current Plan</h3>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <div>
              <p className="text-text-muted text-xs">Plan</p>
              <p className="text-text-primary font-medium capitalize">
                {PLAN_TYPES.find((p) => p.value === latest.plan_type)?.label || latest.plan_type}
              </p>
            </div>
            <div>
              <p className="text-text-muted text-xs">Amount</p>
              <p className="text-text-primary font-medium">{formatCurrency(latest.amount)}</p>
            </div>
            <div>
              <p className="text-text-muted text-xs">Start Date</p>
              <p className="text-text-primary">{formatDate(latest.start_date)}</p>
            </div>
            <div>
              <p className="text-text-muted text-xs">Expiry Date</p>
              <p className={`font-medium ${
                status.color === 'red' ? 'text-status-red' :
                status.color === 'yellow' ? 'text-status-yellow' :
                'text-text-primary'
              }`}>
                {formatDate(latest.expiry_date)}
                {status.color === 'red' && ` (${daysSince(latest.expiry_date)}d ago)`}
                {status.color === 'yellow' && ` (${daysUntil(latest.expiry_date)}d left)`}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Payment History */}
      {memberships.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-text-primary mb-2">
            Payment History ({memberships.length})
          </h3>
          <div className="space-y-2">
            {memberships.map((m) => (
              <div key={m._id} className="flex items-center justify-between py-2 border-b border-border-light last:border-0">
                <div>
                  <p className="text-sm text-text-primary font-medium">
                    {formatCurrency(m.amount)}
                  </p>
                  <p className="text-xs text-text-muted">
                    {PLAN_TYPES.find((p) => p.value === m.plan_type)?.label || m.plan_type}
                    {' · '}
                    <span className="capitalize">{m.payment_method}</span>
                  </p>
                </div>
                <p className="text-xs text-text-muted">{formatDate(m.created_at)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Attendance */}
      {attendance.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-text-primary mb-2">
            Recent Attendance ({attendance.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {attendance.map((a) => (
              <span
                key={a._id}
                className="bg-status-green/10 text-status-green border border-status-green/20 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
              >
                {formatDate(a.date)}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Details */}
      <Card>
        <h3 className="text-sm font-semibold text-text-primary mb-2">Details</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-muted">Joined</span>
            <span className="text-text-primary">{formatDate(member.created_at)}</span>
          </div>
          {member.goal && (
            <div className="flex justify-between">
              <span className="text-text-muted">Goal</span>
              <span className="text-text-primary capitalize">
                {goalObj ? `${goalObj.emoji} ${goalObj.label}` : member.goal}
              </span>
            </div>
          )}
          {member.diet_pref && (
            <div className="flex justify-between">
              <span className="text-text-muted">Diet</span>
              <span className="text-text-primary capitalize">{member.diet_pref}</span>
            </div>
          )}
          {member.dob && (
            <div className="flex justify-between">
              <span className="text-text-muted">Date of Birth</span>
              <span className="text-text-primary">{formatDate(member.dob)}</span>
            </div>
          )}
          {member.notes && (
            <div>
              <p className="text-text-muted mb-1">Notes</p>
              <p className="text-text-primary whitespace-pre-wrap">{member.notes}</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
