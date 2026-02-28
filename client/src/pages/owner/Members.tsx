import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getMyGym } from '@/api/gym'
import { getMembers } from '@/api/members'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { todayIST, getInitials, formatPhone, daysUntil } from '@/utils/helpers'

interface LatestMembership {
  _id: string
  plan_type: string
  amount: number
  start_date: string
  expiry_date: string
  payment_method: string
}

interface Member {
  _id: string
  name: string
  phone: string
  goal?: string
  diet_pref?: string
  latest_membership?: LatestMembership
  created_at: string
}

type FilterType = 'all' | 'overdue' | 'expiring' | 'active'

function getStatus(member: Member): { label: string; color: 'red' | 'yellow' | 'green' | 'gray' } {
  const latest = member.latest_membership
  if (!latest) return { label: 'No Plan', color: 'gray' }
  const today = todayIST()
  if (latest.expiry_date < today) return { label: 'Overdue', color: 'red' }
  const sevenDays = new Date(Date.now() + 7 * 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  if (latest.expiry_date <= sevenDays) return { label: 'Expiring', color: 'yellow' }
  return { label: 'Active', color: 'green' }
}

function getExpiryText(member: Member): string {
  const latest = member.latest_membership
  if (!latest) return ''
  const days = daysUntil(latest.expiry_date)
  if (days < 0) return `${Math.abs(days)}d overdue`
  if (days === 0) return 'Expires today'
  return `${days}d left`
}

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'expiring', label: 'Expiring' },
  { value: 'active', label: 'Active' },
]

export default function MembersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const activeFilter = (searchParams.get('filter') as FilterType) || 'all'

  useEffect(() => {
    async function load() {
      try {
        const gym = await getMyGym()
        const data = await getMembers(gym._id)
        setMembers(data)
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load members')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    let list = members

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (m) => m.name.toLowerCase().includes(q) || m.phone.includes(q)
      )
    }

    // Status filter
    if (activeFilter !== 'all') {
      const today = todayIST()
      const sevenDays = new Date(Date.now() + 7 * 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

      list = list.filter((m) => {
        const latest = m.latest_membership
        if (activeFilter === 'overdue') {
          return latest ? latest.expiry_date < today : false
        }
        if (activeFilter === 'expiring') {
          return latest ? latest.expiry_date >= today && latest.expiry_date <= sevenDays : false
        }
        if (activeFilter === 'active') {
          return latest ? latest.expiry_date > sevenDays : false
        }
        return true
      })
    }

    return list
  }, [members, search, activeFilter])

  function setFilter(f: FilterType) {
    if (f === 'all') {
      searchParams.delete('filter')
    } else {
      searchParams.set('filter', f)
    }
    setSearchParams(searchParams, { replace: true })
  }

  if (loading) return <LoadingSpinner text="Loading members..." />

  if (error) {
    return (
      <div className="p-4">
        <Card variant="alert-danger">
          <p className="text-sm text-status-red">{error}</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-text-primary">
          Members ({members.length})
        </h2>
        <Link to="/owner/members/add">
          <Button size="sm">+ Add</Button>
        </Link>
      </div>

      {/* Search */}
      <Input
        placeholder="Search by name or phone..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTER_OPTIONS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              activeFilter === f.value
                ? 'bg-accent-orange text-white'
                : 'bg-bg-card border border-border-light text-text-secondary'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Member list */}
      {filtered.length === 0 ? (
        <Card>
          <p className="text-center text-text-muted text-sm py-4">
            {search || activeFilter !== 'all'
              ? 'No members match your filters'
              : 'No members yet. Add your first member!'}
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((member) => {
            const status = getStatus(member)
            const expiryText = getExpiryText(member)
            return (
              <Link key={member._id} to={`/owner/members/${member._id}`}>
                <Card className="flex items-center gap-3 active:scale-[0.98] transition-transform">
                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-full bg-accent-orange/10 text-accent-orange flex items-center justify-center text-sm font-bold shrink-0">
                    {getInitials(member.name)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-text-primary truncate">
                        {member.name}
                      </p>
                      <Badge color={status.color}>{status.label}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-text-muted">
                        {formatPhone(member.phone)}
                      </p>
                      {expiryText && (
                        <span className={`text-xs ${
                          status.color === 'red' ? 'text-status-red' :
                          status.color === 'yellow' ? 'text-status-yellow' :
                          'text-text-muted'
                        }`}>
                          {expiryText}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Chevron */}
                  <span className="text-text-muted text-sm shrink-0">›</span>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
