'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { todayIST } from '@/lib/utils'
import Link from 'next/link'

interface MemberDashboard {
  memberName: string
  gymName: string
  goal: string
  streak: number
  totalCheckIns: number
  memberSince: string
  expiryDate: string | null
  daysLeft: number | null
  todayCheckedIn: boolean
  recentBadges: { badge_type: string; earned_at: string }[]
}

// Compact workout templates — just enough for the "Today's Workout" preview card.
// Mirrors the full WORKOUT_TEMPLATES in /m/workout/page.tsx.
const WORKOUT_PREVIEW: Record<string, { focus: string; exercises: number; day: string }[]> = {
  'muscle_gain-beginner': [
    { day: 'Monday', focus: 'Chest + Triceps', exercises: 5 },
    { day: 'Tuesday', focus: 'Back + Biceps', exercises: 5 },
    { day: 'Wednesday', focus: 'Legs + Shoulders', exercises: 6 },
    { day: 'Thursday', focus: 'Rest Day', exercises: 0 },
    { day: 'Friday', focus: 'Chest + Triceps', exercises: 5 },
    { day: 'Saturday', focus: 'Back + Biceps', exercises: 5 },
    { day: 'Sunday', focus: 'Rest Day', exercises: 0 },
  ],
  'weight_loss-beginner': [
    { day: 'Mon/Wed/Fri', focus: 'Full Body Circuit', exercises: 7 },
    { day: 'Tue/Thu', focus: 'Cardio + Core', exercises: 5 },
    { day: 'Sat/Sun', focus: 'Active Rest', exercises: 0 },
  ],
  'general-beginner': [
    { day: 'Mon/Thu', focus: 'Upper Body', exercises: 5 },
    { day: 'Tue/Fri', focus: 'Lower Body + Core', exercises: 6 },
    { day: 'Wed', focus: 'Cardio', exercises: 2 },
    { day: 'Sat/Sun', focus: 'Rest', exercises: 0 },
  ],
}

const DAY_ABBREVS: Record<string, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed',
  Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
}

function getTodayWorkout(goal: string) {
  const key = `${goal}-beginner`
  const days = WORKOUT_PREVIEW[key] || WORKOUT_PREVIEW['general-beginner']
  const now = new Date()
  const fullDay = now.toLocaleDateString('en-US', { weekday: 'long' })
  const abbr = DAY_ABBREVS[fullDay] || fullDay.slice(0, 3)

  // Match: exact full name ("Monday") or abbreviation within a slash-separated list ("Mon/Wed/Fri")
  const match = days.find(d => d.day === fullDay || d.day.split('/').includes(abbr))
  return match ? { ...match, dayName: fullDay } : { dayName: fullDay, focus: 'Rest Day', exercises: 0, day: fullDay }
}

const BADGE_EMOJI: Record<string, string> = {
  first_week: '🌟', '30_day_streak': '🔥', '100_day_club': '💯',
  never_missed_monday: '📅', referral_1: '🤝', referral_3: '📣', top_10: '🏅',
}

function JoinGymEmptyState() {
  const [gymCode, setGymCode] = useState('')
  const [gymInfo, setGymInfo] = useState<{ id: string; name: string } | null>(null)
  const [step, setStep] = useState<'input' | 'confirm' | 'success' | 'error'>('input')
  const [searching, setSearching] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [pendingGym, setPendingGym] = useState<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('repcount_pending_join')
    if (saved) {
      setPendingGym(saved)
      setStep('success')
    }
  }, [])

  async function lookupGym() {
    const code = gymCode.trim().toLowerCase()
    if (!code) return

    setSearching(true)
    setErrorMsg('')
    const supabase = createClient()
    const { data: gym } = await supabase
      .from('gyms')
      .select('id, name')
      .eq('slug', code)
      .single()

    if (gym) {
      setGymInfo(gym)
      setStep('confirm')
    } else {
      setErrorMsg('Gym not found. Check the code with your gym.')
      setStep('error')
    }
    setSearching(false)
  }

  async function submitJoinRequest() {
    if (!gymInfo) return

    setSubmitting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSubmitting(false); return }

    // Get phone from profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('phone, full_name')
      .eq('id', user.id)
      .single()

    const phone = profile?.phone || user.phone?.replace('+91', '') || ''

    await supabase.from('leads').insert({
      gym_id: gymInfo.id,
      name: profile?.full_name || phone,
      phone: phone,
      goal: 'general',
      source: 'gym_page',
      status: 'new',
      notes: 'Joined via gym code on home page',
    })

    localStorage.setItem('repcount_pending_join', gymInfo.name)
    setStep('success')
    setSubmitting(false)
  }

  return (
    <div className="p-4 min-h-[60vh] flex flex-col items-center justify-center">
      <Card className="p-6 w-full max-w-sm">
        {step === 'success' ? (
          <div className="text-center">
            <span className="text-5xl block mb-3">🎉</span>
            <h2 className="text-xl font-bold text-text-primary mb-2">Request Sent!</h2>
            <p className="text-text-secondary text-sm">
              {pendingGym || gymInfo?.name || 'Your gym'} will add you soon. Sit tight!
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-5">
              <span className="text-5xl block mb-3">🏋️</span>
              <h2 className="text-xl font-bold text-text-primary mb-1">Welcome to RepCount</h2>
              <p className="text-text-secondary text-sm">Enter your gym code to get started</p>
            </div>

            {step === 'confirm' && gymInfo ? (
              <div className="space-y-4">
                <div className="text-center py-3 bg-bg-primary rounded-xl">
                  <p className="text-sm text-text-secondary">Joining</p>
                  <p className="text-lg font-bold text-accent-orange mt-1">{gymInfo.name}</p>
                </div>
                <Button
                  fullWidth
                  size="lg"
                  loading={submitting}
                  onClick={submitJoinRequest}
                >
                  Confirm & Join
                </Button>
                <button
                  type="button"
                  className="w-full text-sm text-text-secondary py-2"
                  onClick={() => { setStep('input'); setGymInfo(null); setGymCode('') }}
                >
                  Use a different code
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <Input
                  placeholder="Enter gym code"
                  value={gymCode}
                  onChange={(e) => {
                    setGymCode(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                    if (step === 'error') { setStep('input'); setErrorMsg('') }
                  }}
                  error={step === 'error' ? errorMsg : undefined}
                />
                <p className="text-text-muted text-xs text-center">Ask your gym for the code</p>
                <Button
                  fullWidth
                  size="lg"
                  loading={searching}
                  disabled={!gymCode.trim()}
                  onClick={lookupGym}
                >
                  Find Gym
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}

export default function MemberHome() {
  const [data, setData] = useState<MemberDashboard | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadDashboard() }, [])

  async function loadDashboard() {
    try {
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

      if (!member) return

      const today = todayIST()

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
          if (dates[i] === expected.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })) {
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
        goal: member.goal || 'general',
        streak,
        totalCheckIns: checkins.length,
        memberSince: member.join_date,
        expiryDate,
        daysLeft,
        todayCheckedIn: (todayRes.data?.length || 0) > 0,
        recentBadges: badgesRes.data || [],
      })
      // Member exists, clear any pending join request from localStorage
      localStorage.removeItem('repcount_pending_join')
    } catch {
      // silently handle - page shows empty/fallback state
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-4 space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-bg-card rounded-2xl animate-pulse" />)}</div>
  }

  if (!data) {
    return <JoinGymEmptyState />
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
                <p className="text-[10px] text-text-muted">Tap to check in at your gym</p>
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

      {/* Today's Workout Preview */}
      {(() => {
        const tw = getTodayWorkout(data.goal)
        const isRest = tw.exercises === 0
        return (
          <Link href="/m/workout">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{isRest ? '😴' : '🏋️'}</span>
                  <div>
                    <p className="text-[10px] text-text-muted uppercase tracking-wide">{tw.dayName}</p>
                    {isRest ? (
                      <p className="text-sm font-medium text-text-secondary">Rest Day — recover and hydrate</p>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-text-primary">{tw.focus}</p>
                        <p className="text-[10px] text-text-muted">{tw.exercises} exercises</p>
                      </>
                    )}
                  </div>
                </div>
                {!isRest && (
                  <span className="text-xs font-medium text-accent-orange whitespace-nowrap">
                    Start Workout →
                  </span>
                )}
              </div>
            </Card>
          </Link>
        )
      })()}

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
