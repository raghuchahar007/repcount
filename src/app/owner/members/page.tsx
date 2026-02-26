'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { todayIST } from '@/lib/utils'
import Link from 'next/link'

interface MemberRow {
  id: string
  name: string
  phone: string
  goal: string
  is_active: boolean
  join_date: string
  memberships: { expiry_date: string; amount: number; status: string }[]
}

function MembersContent() {
  const [members, setMembers] = useState<MemberRow[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()

  useEffect(() => {
    const f = searchParams.get('filter')
    if (f) setFilter(f)
    loadMembers()
  }, [searchParams])

  async function loadMembers() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: gym } = await supabase
        .from('gyms').select('id').eq('owner_id', user.id).single()
      if (!gym) return

      const { data } = await supabase
        .from('members')
        .select('*, memberships(expiry_date, amount, status)')
        .eq('gym_id', gym.id)
        .order('created_at', { ascending: false })

      setMembers(data || [])
    } catch {
      // silently handle - page shows empty/fallback state
    } finally {
      setLoading(false)
    }
  }

  const today = todayIST()
  const sevenDays = new Date(Date.now() + 7 * 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

  const filteredMembers = members.filter(m => {
    // Search filter
    if (search) {
      const q = search.toLowerCase()
      if (!m.name.toLowerCase().includes(q) && !m.phone.includes(q)) return false
    }

    const latest = m.memberships?.[0]
    switch (filter) {
      case 'overdue':
        return latest && latest.expiry_date < today
      case 'expiring':
        return latest && latest.expiry_date >= today && latest.expiry_date <= sevenDays
      case 'active':
        return latest && latest.expiry_date >= today
      case 'inactive':
        return !m.is_active
      default:
        return true
    }
  })

  const getDaysText = (expiryDate: string) => {
    const expiry = new Date(expiryDate)
    const now = new Date()
    // Reset time portion for accurate day diff
    expiry.setHours(0, 0, 0, 0)
    now.setHours(0, 0, 0, 0)
    const diffDays = Math.round((expiry.getTime() - now.getTime()) / 86400000)
    if (diffDays < 0) return { text: `${Math.abs(diffDays)} days overdue`, className: 'text-status-red' }
    if (diffDays <= 7) return { text: `expires in ${diffDays} days`, className: 'text-status-yellow' }
    return { text: `expires in ${diffDays} days`, className: 'text-text-muted' }
  }

  const getStatus = (m: MemberRow) => {
    const latest = m.memberships?.[0]
    if (!latest) return { label: 'No Plan', color: 'gray' as const }
    if (latest.expiry_date < today) return { label: 'Overdue', color: 'red' as const }
    if (latest.expiry_date <= sevenDays) return { label: 'Expiring', color: 'yellow' as const }
    return { label: 'Active', color: 'green' as const }
  }

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'expiring', label: 'Expiring' },
    { key: 'active', label: 'Active' },
  ]

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-text-primary">Members ({members.length})</h2>
        <Link href="/owner/members/add">
          <Button size="sm">+ Add</Button>
        </Link>
      </div>

      {/* Search */}
      <Input
        placeholder="Search name or phone..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filter === f.key
                ? 'bg-accent-orange text-white'
                : 'bg-bg-card text-text-secondary border border-border'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Member List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 bg-bg-card rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredMembers.map(member => {
            const status = getStatus(member)
            return (
              <Link key={member.id} href={`/owner/members/${member.id}`}>
                <Card className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-bg-hover flex items-center justify-center text-sm font-bold text-accent-orange">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">{member.name}</p>
                      <p className="text-[10px] text-text-muted">{member.phone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge color={status.color}>{status.label}</Badge>
                    {member.memberships?.[0] && (() => {
                      const days = getDaysText(member.memberships[0].expiry_date)
                      return (
                        <p className={`text-[10px] mt-1 ${days.className}`}>
                          {days.text}
                        </p>
                      )
                    })()}
                  </div>
                </Card>
              </Link>
            )
          })}
          {filteredMembers.length === 0 && (
            <Card className="p-8 text-center">
              <span className="text-3xl">👥</span>
              <p className="text-text-muted text-sm mt-2">
                {search ? 'No members found' : members.length === 0 ? 'No members yet' : 'No members in this category'}
              </p>
              {!search && members.length === 0 && (
                <Link href="/owner/members/add" className="text-accent-orange text-xs mt-1 inline-block">
                  Add your first member
                </Link>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

export default function MembersPage() {
  return (
    <Suspense fallback={<div className="p-4"><div className="h-16 bg-bg-card rounded-xl animate-pulse" /></div>}>
      <MembersContent />
    </Suspense>
  )
}
