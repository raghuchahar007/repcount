import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getMyGym } from '@/api/gym'
import { getRenewals } from '@/api/memberships'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { todayIST, daysSince, formatCurrency, formatPhone, formatDate } from '@/utils/helpers'
import { generateWhatsAppLink, templates } from '@/utils/whatsapp'

interface RenewalMembership {
  _id: string
  member: { _id: string; name: string; phone: string }
  plan_type: string
  amount: number
  expiry_date: string
}

export default function RenewalsPage() {
  const [renewals, setRenewals] = useState<RenewalMembership[]>([])
  const [gymName, setGymName] = useState('')
  const [gymUpi, setGymUpi] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const gym = await getMyGym()
        setGymName(gym.name || '')
        setGymUpi(gym.upi_id || '')
        const data = await getRenewals(gym._id)
        setRenewals(data)
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load renewals')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <LoadingSpinner text="Loading renewals..." />

  if (error) {
    return (
      <div className="p-4">
        <Card variant="alert-danger">
          <p className="text-sm text-status-red">{error}</p>
        </Card>
      </div>
    )
  }

  function getWhatsAppLink(m: RenewalMembership): string {
    const isOverdue = new Date(m.expiry_date) < new Date(todayIST())
    const daysOverdue = Math.max(0, daysSince(m.expiry_date))
    const message = isOverdue
      ? templates.overdue_payment(m.member.name, daysOverdue, m.amount, gymName)
      : templates.renewal_reminder(m.member.name, formatDate(m.expiry_date), gymName, gymUpi || undefined)
    return generateWhatsAppLink(m.member.phone, message)
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-text-primary">
          Renewals ({renewals.length})
        </h2>
        <p className="text-xs text-text-muted mt-0.5">
          Members expiring within 7 days or already expired
        </p>
      </div>

      {/* List */}
      {renewals.length === 0 ? (
        <Card>
          <p className="text-center text-text-muted text-sm py-6">
            No upcoming renewals
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {renewals.map((m) => {
            const isOverdue = new Date(m.expiry_date) < new Date(todayIST())
            const daysOverdue = Math.max(0, daysSince(m.expiry_date))
            return (
              <Card key={m._id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/owner/members/${m.member._id}`}
                        className="text-sm font-semibold text-text-primary truncate hover:text-accent-orange transition-colors"
                      >
                        {m.member.name}
                      </Link>
                      <Badge color={isOverdue ? 'red' : 'yellow'}>
                        {isOverdue ? `${daysOverdue}d overdue` : 'Expiring'}
                      </Badge>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">
                      {formatPhone(m.member.phone)}
                      {' · '}
                      {formatCurrency(m.amount)}
                      {' · '}
                      <span className="capitalize">{m.plan_type?.replace('_', ' ')}</span>
                    </p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 mt-3">
                  <a
                    href={getWhatsAppLink(m)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1"
                  >
                    <Button variant="success" fullWidth size="sm">
                      WhatsApp
                    </Button>
                  </a>
                  <a href={`tel:+91${m.member.phone}`} className="flex-1">
                    <Button variant="secondary" fullWidth size="sm">
                      Call
                    </Button>
                  </a>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
