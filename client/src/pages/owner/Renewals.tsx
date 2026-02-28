import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getMyGym } from '@/api/gym'
import { getRenewals } from '@/api/memberships'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SkeletonList } from '@/components/shared/Skeleton'
import ErrorCard from '@/components/shared/ErrorCard'
import { todayIST, daysSince, formatCurrency, formatPhone, formatDate } from '@/utils/helpers'
import { generateWhatsAppLink, templates } from '@/utils/whatsapp'

type SortType = 'overdue' | 'name'

const SORT_OPTIONS: { value: SortType; label: string }[] = [
  { value: 'overdue', label: 'Most Overdue' },
  { value: 'name', label: 'A-Z' },
]

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
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortType>('overdue')

  async function fetchRenewals() {
    setLoading(true)
    setError('')
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

  useEffect(() => {
    fetchRenewals()
  }, [])

  if (loading) return <SkeletonList />

  if (error) {
    return (
      <div className="p-4">
        <ErrorCard message={error} onRetry={fetchRenewals} />
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

  const displayList = useMemo(() => {
    // Filter by search
    let list = renewals
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (m) =>
          m.member.name.toLowerCase().includes(q) ||
          m.member.phone.includes(q)
      )
    }

    // Sort
    return [...list].sort((a, b) => {
      if (sort === 'name') return (a.member.name || '').localeCompare(b.member.name || '')
      // overdue: sort by expiry_date ascending (earliest expiry = most overdue first)
      return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
    })
  }, [renewals, search, sort])

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

      {/* Search */}
      <Input
        placeholder="Search by name or phone..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Sort chips */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {SORT_OPTIONS.map((s) => (
          <button
            key={s.value}
            onClick={() => setSort(s.value)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              sort === s.value
                ? 'bg-accent-primary text-white'
                : 'bg-bg-card border border-border-light text-text-secondary'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* List */}
      {displayList.length === 0 ? (
        <Card>
          <p className="text-center text-text-muted text-sm py-6">
            {search ? 'No renewals match your search' : 'No upcoming renewals'}
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {displayList.map((m) => {
            const isOverdue = new Date(m.expiry_date) < new Date(todayIST())
            const daysOverdue = Math.max(0, daysSince(m.expiry_date))
            return (
              <Card key={m._id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/owner/members/${m.member._id}`}
                        className="text-sm font-semibold text-text-primary truncate hover:text-accent-primary transition-colors"
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
