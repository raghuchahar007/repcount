'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'
import { GOALS, DIET_PREFS } from '@/lib/constants'

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [member, setMember] = useState<any>(null)
  const [membership, setMembership] = useState<any>(null)
  const [stats, setStats] = useState({ totalVisits: 0, badges: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [profileRes, memberRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('members').select('*, gyms(name)').eq('user_id', user.id).eq('is_active', true).single(),
    ])

    setProfile(profileRes.data)

    if (memberRes.data) {
      setMember(memberRes.data)
      const [msRes, attendRes, badgeRes] = await Promise.all([
        supabase.from('memberships').select('*').eq('member_id', memberRes.data.id).order('expiry_date', { ascending: false }).limit(1),
        supabase.from('attendance').select('id', { count: 'exact' }).eq('member_id', memberRes.data.id),
        supabase.from('badges').select('id', { count: 'exact' }).eq('member_id', memberRes.data.id),
      ])
      setMembership(msRes.data?.[0] || null)
      setStats({
        totalVisits: attendRes.count || 0,
        badges: badgeRes.count || 0,
      })
    }
    setLoading(false)
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading) return <div className="p-4 space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-bg-card rounded-2xl animate-pulse" />)}</div>

  const goalLabel = GOALS.find(g => g.value === member?.goal)?.label || ''
  const dietLabel = DIET_PREFS.find(d => d.value === member?.diet_pref)?.label || ''
  const isExpired = membership && new Date(membership.expiry_date) < new Date()

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold text-text-primary">Profile</h2>

      {/* Profile Card */}
      <Card variant="gradient" className="p-5 text-center">
        <div className="w-16 h-16 rounded-full bg-bg-primary mx-auto flex items-center justify-center text-2xl font-bold text-accent-orange">
          {member?.name?.charAt(0)?.toUpperCase() || '?'}
        </div>
        <h3 className="text-lg font-bold text-text-primary mt-3">{member?.name || 'Member'}</h3>
        <p className="text-xs text-text-secondary">{(member?.gyms as any)?.name}</p>
        <p className="text-xs text-text-muted mt-1">Member since {member?.join_date ? new Date(member.join_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '-'}</p>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <p className="text-xl font-bold text-text-primary">{stats.totalVisits}</p>
          <p className="text-[10px] text-text-secondary">Total Visits</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xl font-bold text-text-primary">{stats.badges}</p>
          <p className="text-[10px] text-text-secondary">Badges</p>
        </Card>
        <Card className="p-3 text-center">
          <p className={`text-xl font-bold ${isExpired ? 'text-status-red' : 'text-status-green'}`}>
            {isExpired ? 'Expired' : 'Active'}
          </p>
          <p className="text-[10px] text-text-secondary">Status</p>
        </Card>
      </div>

      {/* Details */}
      <Card className="p-4">
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Details</p>
        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between">
            <span className="text-text-muted">Phone</span>
            <span className="text-text-primary">+91 {member?.phone}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Goal</span>
            <Badge color="orange">{goalLabel}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Diet</span>
            <span className="text-text-primary">{dietLabel}</span>
          </div>
          {membership && (
            <>
              <div className="flex justify-between">
                <span className="text-text-muted">Plan</span>
                <span className="text-text-primary capitalize">{membership.plan_type.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Expires</span>
                <span className={`font-medium ${isExpired ? 'text-status-red' : 'text-text-primary'}`}>
                  {new Date(membership.expiry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Last Paid</span>
                <span className="text-text-primary">{formatCurrency(membership.amount)}</span>
              </div>
            </>
          )}
        </div>
      </Card>

      <Button variant="ghost" fullWidth onClick={handleLogout}>
        Logout
      </Button>
    </div>
  )
}
