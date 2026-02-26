'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function AttendancePage() {
  const [checkedIn, setCheckedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const [monthData, setMonthData] = useState<string[]>([])
  const [streak, setStreak] = useState(0)

  useEffect(() => { loadAttendance() }, [])

  async function loadAttendance() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: member } = await supabase
      .from('members').select('id, gym_id').eq('user_id', user.id).eq('is_active', true).single()
    if (!member) { setLoading(false); return }

    const today = new Date().toISOString().split('T')[0]
    const monthStart = `${today.slice(0, 7)}-01`

    const [todayRes, monthRes] = await Promise.all([
      supabase.from('attendance').select('id').eq('member_id', member.id).gte('checked_in_at', `${today}T00:00:00`).limit(1),
      supabase.from('attendance').select('checked_in_at').eq('member_id', member.id).gte('checked_in_at', `${monthStart}T00:00:00`).order('checked_in_at', { ascending: false }),
    ])

    setCheckedIn((todayRes.data?.length || 0) > 0)

    const dates = monthRes.data?.map(a => a.checked_in_at.split('T')[0]) || []
    setMonthData([...new Set(dates)])

    // Streak calc
    let s = 0
    const uniqueDates = [...new Set(dates)].sort().reverse()
    for (let i = 0; i < uniqueDates.length; i++) {
      const expected = new Date()
      expected.setDate(expected.getDate() - i)
      if (uniqueDates[i] === expected.toISOString().split('T')[0]) s++
      else break
    }
    setStreak(s)
    setLoading(false)
  }

  async function handleCheckIn() {
    setChecking(true)
    setError('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      const { data: member } = await supabase
        .from('members').select('id, gym_id').eq('user_id', user.id).eq('is_active', true).single()
      if (!member) throw new Error('Member not found')

      const { error: insertError } = await supabase.from('attendance').insert({
        member_id: member.id,
        gym_id: member.gym_id,
      })

      if (insertError) {
        if (insertError.message.includes('duplicate')) {
          setCheckedIn(true)
          return
        }
        throw insertError
      }

      setCheckedIn(true)
      setStreak(prev => prev + 1)
      const today = new Date().toISOString().split('T')[0]
      setMonthData(prev => [today, ...prev])
    } catch (err: any) {
      setError(err.message || 'Check-in failed')
    } finally {
      setChecking(false)
    }
  }

  // Calendar for current month
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()
  const monthName = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  if (loading) {
    return <div className="p-4 space-y-4">{[1, 2].map(i => <div key={i} className="h-32 bg-bg-card rounded-2xl animate-pulse" />)}</div>
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold text-text-primary">Attendance</h2>

      {/* Streak & Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-accent-orange">{streak}</p>
          <p className="text-[10px] text-text-secondary">Streak 🔥</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-text-primary">{monthData.length}</p>
          <p className="text-[10px] text-text-secondary">This Month</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-status-green">{Math.round((monthData.length / now.getDate()) * 100)}%</p>
          <p className="text-[10px] text-text-secondary">Consistency</p>
        </Card>
      </div>

      {/* Check-in Button */}
      {checkedIn ? (
        <Card className="p-6 text-center border-status-green/30 bg-status-green/5">
          <span className="text-4xl">✅</span>
          <p className="text-lg font-bold text-status-green mt-2">Checked In Today!</p>
          <p className="text-xs text-text-secondary mt-1">Great job, keep it up!</p>
        </Card>
      ) : (
        <Card className="p-6 text-center">
          <Button onClick={handleCheckIn} loading={checking} size="lg" fullWidth>
            📍 Check In Now
          </Button>
          {error && <p className="text-status-red text-xs mt-2">{error}</p>}
        </Card>
      )}

      {/* Calendar */}
      <Card className="p-4">
        <p className="text-sm font-semibold text-text-primary mb-3">{monthName}</p>
        <div className="grid grid-cols-7 gap-1 text-center">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <span key={i} className="text-[10px] text-text-muted py-1">{d}</span>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const attended = monthData.includes(dateStr)
            const isToday = day === now.getDate()
            const isFuture = day > now.getDate()

            return (
              <div
                key={day}
                className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                  attended
                    ? 'bg-status-green text-white'
                    : isToday
                    ? 'border border-accent-orange text-accent-orange'
                    : isFuture
                    ? 'text-text-muted/30'
                    : 'text-text-muted'
                }`}
              >
                {day}
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
