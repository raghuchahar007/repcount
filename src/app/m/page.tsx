'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import Link from 'next/link'

interface MemberDashboard {
  memberName: string
  gymName: string
  streak: number
  totalCheckIns: number
  memberSince: string
  expiryDate: string | null
  daysLeft: number | null
  todayCheckedIn: boolean
  recentBadges: { badge_type: string; earned_at: string }[]
}

const BADGE_EMOJI: Record<string, string> = {
  first_week: '🌟', '30_day_streak': '🔥', '100_day_club': '💯',
  never_missed_monday: '📅', referral_1: '🤝', referral_3: '📣', top_10: '🏅',
}

export default function MemberHome() {
  const [data, setData] = useState<MemberDashboard | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadDashboard() }, [])

  async function loadDashboard() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get member record
    const { data: member } = await supabase
      .from('members')
      .select('*, gyms(name)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!member) { setLoading(false); return }

    const today = new Date().toISOString().split('T')[0]

    const [membershipRes, attendanceRes, todayRes, badgesRes] = await Promise.all([
      supabase.from('memberships').select('expiry_date').eq('member_id', member.id).order('expiry_date', { ascending: false }).limit(1),
      supabase.from('attendance').select('checked_in_at').eq('member_id', member.id).order('checked_in_at', { ascending: false }),
      supabase.from('attendance').select('id').eq('member_id', member.id).gte('checked_in_at', `${today}T00:00:00`).limit(1),
      supabase.from('badges').select('badge_type, earned_at').eq('member_id', member.id).order('earned_at', { ascending: false }).limit(5),
    ])

    // Calculate streak
    let streak = 0
    const checkins = attendanceRes.data || []
    if (checkins.length > 0) {
      const dates = [...new Set(checkins.map(c => c.checked_in_at.split('T')[0]))].sort().reverse()
      for (let i = 0; i < dates.length; i++) {
        const expected = new Date()
        expected.setDate(expected.getDate() - i)
        if (dates[i] === expected.toISOString().split('T')[0]) {
          streak++
        } else break
      }
    }

    const latestMembership = membershipRes.data?.[0]
    const expiryDate = latestMembership?.expiry_date || null
    const daysLeft = expiryDate ? Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000) : null

    setData({
      memberName: member.name,
      gymName: (member.gyms as any)?.name || 'Your Gym',
      streak,
      totalCheckIns: checkins.length,
      memberSince: member.join_date,
      expiryDate,
      daysLeft,
      todayCheckedIn: (todayRes.data?.length || 0) > 0,
      recentBadges: badgesRes.data || [],
    })
    setLoading(false)
  }

  if (loading) {
    return <div className="p-4 space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-bg-card rounded-2xl animate-pulse" />)}</div>
  }

  if (!data) {
    return (
      <div className="p-4 text-center min-h-[60vh] flex flex-col items-center justify-center">
        <span className="text-5xl mb-4">🏋️</span>
        <h2 className="text-xl font-bold text-text-primary mb-2">Welcome to RepCount</h2>
        <p className="text-text-secondary text-sm">Ask your gym owner to add you as a member</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Welcome & Streak */}
      <Card variant="gradient" className="p-5">
        <p className="text-text-secondary text-xs">{data.gymName}</p>
        <h2 className="text-xl font-bold text-text-primary mt-1">Hey, {data.memberName.split(' ')[0]}!</h2>
        <div className="flex items-center gap-6 mt-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-accent-orange">{data.streak}</p>
            <p className="text-[10px] text-text-secondary">Day Streak 🔥</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-text-primary">{data.totalCheckIns}</p>
            <p className="text-[10px] text-text-secondary">Total Visits</p>
          </div>
          {data.daysLeft !== null && (
            <div className="text-center">
              <p className={`text-3xl font-bold ${data.daysLeft < 0 ? 'text-status-red' : data.daysLeft <= 7 ? 'text-status-yellow' : 'text-status-green'}`}>
                {data.daysLeft < 0 ? 0 : data.daysLeft}
              </p>
              <p className="text-[10px] text-text-secondary">Days Left</p>
            </div>
          )}
        </div>
      </Card>

      {/* Today's Check-in Status */}
      {data.todayCheckedIn ? (
        <Card className="p-4 border-status-green/30 bg-status-green/5">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="text-sm font-medium text-status-green">Checked in today!</p>
              <p className="text-[10px] text-text-muted">Keep the streak going</p>
            </div>
          </div>
        </Card>
      ) : (
        <Link href="/m/attendance">
          <Card className="p-4 border-accent-orange/30 bg-accent-orange/5">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📸</span>
              <div>
                <p className="text-sm font-medium text-accent-orange">Mark your attendance</p>
                <p className="text-[10px] text-text-muted">Scan QR at your gym</p>
              </div>
            </div>
          </Card>
        </Link>
      )}

      {/* Membership Alert */}
      {data.daysLeft !== null && data.daysLeft <= 7 && (
        <Card variant={data.daysLeft < 0 ? 'alert-danger' : 'alert-warning'} className="p-4">
          <p className="text-sm font-medium">
            {data.daysLeft < 0 ? '⚠️ Your membership has expired' : `⏳ Membership expires in ${data.daysLeft} days`}
          </p>
          <p className="text-[10px] text-text-secondary mt-1">Contact your gym to renew</p>
        </Card>
      )}

      {/* Quick Links Grid */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { href: '/m/diet', icon: '🥗', label: 'Diet' },
          { href: '/m/workout', icon: '💪', label: 'Workout' },
          { href: '/m/progress', icon: '📊', label: 'Progress' },
          { href: '/m/feed', icon: '📣', label: 'Feed' },
          { href: '/m/leaderboard', icon: '🏆', label: 'Board' },
          { href: '/m/refer', icon: '🤝', label: 'Refer' },
          { href: '/m/attendance', icon: '📅', label: 'Attendance' },
          { href: '/m/profile', icon: '👤', label: 'Profile' },
        ].map(item => (
          <Link key={item.href} href={item.href} className="bg-bg-card border border-border rounded-xl p-3 text-center">
            <span className="text-lg">{item.icon}</span>
            <p className="text-[10px] text-text-secondary mt-1">{item.label}</p>
          </Link>
        ))}
      </div>

      {/* Recent Badges */}
      {data.recentBadges.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-2">Your Badges</h3>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {data.recentBadges.map(b => (
              <div key={b.badge_type} className="bg-bg-card border border-border rounded-xl px-4 py-3 text-center flex-shrink-0">
                <span className="text-2xl">{BADGE_EMOJI[b.badge_type] || '🏅'}</span>
                <p className="text-[10px] text-text-secondary mt-1 capitalize">{b.badge_type.replace(/_/g, ' ')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
