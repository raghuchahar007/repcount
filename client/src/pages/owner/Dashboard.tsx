import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getMyGym } from '@/api/gym'
import { getDashboard } from '@/api/memberships'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/utils/helpers'

interface DashboardStats {
  totalMembers: number
  activeMembers: number
  overdueCount: number
  expiringCount: number
  inactiveCount: number
  newLeadsCount: number
  joinRequests: number
  monthRevenue: number
  todayAttendance: number
}

interface RecentMember {
  _id: string
  name: string
  phone: string
  latest_membership?: {
    expiry_date: string
    amount: number
    plan_type: string
    status: string
  }
}

export default function OwnerDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0, activeMembers: 0, overdueCount: 0,
    expiringCount: 0, inactiveCount: 0, newLeadsCount: 0,
    joinRequests: 0, monthRevenue: 0, todayAttendance: 0,
  })
  const [recentMembers, setRecentMembers] = useState<RecentMember[]>([])
  const [gymId, setGymId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadDashboard()

    const handleFocus = () => loadDashboard()
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  async function loadDashboard() {
    setLoading(true)
    setError('')
    try {
      const gym = await getMyGym()
      if (!gym || !gym._id) {
        // No gym found — show setup CTA
        return
      }
      setGymId(gym._id)

      const data = await getDashboard(gym._id)
      setStats({
        totalMembers: data.totalMembers || 0,
        activeMembers: (data.totalMembers || 0) - (data.inactiveCount || 0),
        overdueCount: data.overdueCount || 0,
        expiringCount: data.expiringCount || 0,
        inactiveCount: data.inactiveCount || 0,
        newLeadsCount: data.newLeadsCount || 0,
        joinRequests: data.joinRequests || 0,
        monthRevenue: data.monthRevenue || 0,
        todayAttendance: data.todayAttendance || 0,
      })
      setRecentMembers(data.recentMembers || [])
    } catch (err: any) {
      // 404 means no gym — that's expected, not an error
      if (err?.response?.status === 404) return
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 bg-bg-card rounded-2xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <p className="text-text-secondary text-sm mb-4">{error}</p>
        <Button variant="secondary" onClick={loadDashboard}>Retry</Button>
      </div>
    )
  }

  if (!gymId) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <span className="text-5xl mb-4">🏋️</span>
        <h2 className="text-xl font-bold text-text-primary mb-2">Set Up Your Gym</h2>
        <p className="text-text-secondary text-sm mb-6">Create your gym profile to start managing members</p>
        <Link
          to="/owner/settings"
          className="bg-gradient-to-r from-accent-primary to-accent-primary-dark text-white px-6 py-3 rounded-xl font-semibold"
        >
          Create Gym Profile
        </Link>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Revenue Card */}
      <Card variant="gradient" className="p-5">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-text-secondary text-xs mb-1">This Month Revenue</p>
            <p className="text-3xl font-bold text-text-primary">{formatCurrency(stats.monthRevenue)}</p>
          </div>
          <div className="text-right">
            <p className="text-text-secondary text-xs mb-1">Today</p>
            <p className="text-lg font-bold text-status-green">{stats.todayAttendance} check-ins</p>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <div className="flex-1 bg-bg-primary/50 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-text-primary">{stats.totalMembers}</p>
            <p className="text-[10px] text-text-secondary">Total Members</p>
          </div>
          <div className="flex-1 bg-bg-primary/50 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-text-primary">{stats.activeMembers}</p>
            <p className="text-[10px] text-text-secondary">Active</p>
          </div>
        </div>
      </Card>

      {/* Join Requests Alert */}
      {stats.joinRequests > 0 && (
        <Link to="/owner/join-requests">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-3 flex items-center gap-3">
            <span className="text-2xl">🙋</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-text-primary">{stats.joinRequests} join request{stats.joinRequests > 1 ? 's' : ''}</p>
              <p className="text-text-secondary text-xs">Tap to review</p>
            </div>
            <span className="text-text-muted">&rarr;</span>
          </div>
        </Link>
      )}

      {/* Alert Cards */}
      <div className="grid grid-cols-2 gap-3">
        {stats.overdueCount > 0 && (
          <Link to="/owner/members?filter=overdue">
            <Card variant="alert-danger" className="p-4">
              <p className="text-2xl font-bold text-status-red">{stats.overdueCount}</p>
              <p className="text-xs text-text-secondary mt-1">Overdue</p>
            </Card>
          </Link>
        )}
        {stats.expiringCount > 0 && (
          <Link to="/owner/members?filter=expiring">
            <Card variant="alert-warning" className="p-4">
              <p className="text-2xl font-bold text-status-yellow">{stats.expiringCount}</p>
              <p className="text-xs text-text-secondary mt-1">Expiring Soon</p>
            </Card>
          </Link>
        )}
        {stats.newLeadsCount > 0 && (
          <Link to="/owner/leads">
            <Card variant="alert-info" className="p-4">
              <p className="text-2xl font-bold text-status-blue">{stats.newLeadsCount}</p>
              <p className="text-xs text-text-secondary mt-1">New Leads</p>
            </Card>
          </Link>
        )}
        <Link to="/owner/members?filter=inactive">
          <Card className="p-4">
            <p className="text-2xl font-bold text-status-purple">{stats.inactiveCount}</p>
            <p className="text-xs text-text-secondary mt-1">Inactive (2wk+)</p>
          </Card>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-2">
        <Link to="/owner/members/add" className="bg-bg-card border border-border rounded-xl p-3 text-center">
          <span className="text-xl">➕</span>
          <p className="text-[10px] text-text-secondary mt-1">Add Member</p>
        </Link>
        <Link to="/owner/renewals" className="bg-bg-card border border-border rounded-xl p-3 text-center">
          <span className="text-xl">🔄</span>
          <p className="text-[10px] text-text-secondary mt-1">Renewals</p>
        </Link>
        <Link to="/owner/scan" className="bg-bg-card border border-border rounded-xl p-3 text-center">
          <span className="text-xl">📷</span>
          <p className="text-[10px] text-text-secondary mt-1">Scan QR</p>
        </Link>
        <Link to="/owner/posts/create" className="bg-bg-card border border-border rounded-xl p-3 text-center">
          <span className="text-xl">📝</span>
          <p className="text-[10px] text-text-secondary mt-1">New Post</p>
        </Link>
      </div>

      {/* Recent Members */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-text-primary">Recent Members</h3>
          <Link to="/owner/members" className="text-xs text-accent-primary">View All</Link>
        </div>
        <div className="space-y-2">
          {recentMembers.map((member) => {
            const latestMembership = member.latest_membership
            const isOverdue = latestMembership && new Date(latestMembership.expiry_date) < new Date()
            return (
              <Link key={member._id} to={`/owner/members/${member._id}`}>
                <Card className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-bg-hover flex items-center justify-center text-sm font-bold text-accent-primary">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">{member.name}</p>
                      <p className="text-[10px] text-text-muted">{member.phone}</p>
                    </div>
                  </div>
                  {latestMembership && (
                    <Badge color={isOverdue ? 'red' : 'green'}>
                      {isOverdue ? 'Overdue' : 'Active'}
                    </Badge>
                  )}
                </Card>
              </Link>
            )
          })}
          {recentMembers.length === 0 && (
            <Card className="p-6 text-center">
              <p className="text-text-muted text-sm">No members yet</p>
              <Link to="/owner/members/add" className="text-accent-primary text-xs mt-1 inline-block">
                Add your first member
              </Link>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
