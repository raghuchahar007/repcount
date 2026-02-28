import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getHome, selfCheckIn } from '@/api/me'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { QrScanner } from '@/components/shared/QrScanner'
import { BADGE_TYPES, PLAN_TYPES, MOTIVATION_QUOTES } from '@/utils/constants'
import { formatDate, daysUntil, todayIST } from '@/utils/helpers'

interface HomeData {
  member: {
    _id: string
    name: string
    phone: string
    goal: string
    diet_pref: string
    badges: { badge_type: string; earned_at: string }[]
  }
  gym: { name: string }
  membership: {
    plan_type: string
    expiry_date: string
    amount: number
    status: string
  } | null
  streak: number
  attendanceDays?: string[]
  attendanceGrid?: { date: string; present: boolean }[]
}

/** Generate an array of YYYY-MM-DD strings for the last N days (most recent last). */
function getLast30Days(): string[] {
  const days: string[] = []
  const today = new Date(todayIST() + 'T00:00:00+05:30')
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

/** Get 3-letter day label (Mon, Tue, ...) for a YYYY-MM-DD string. */
function dayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00+05:30')
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]
}

const QUICK_LINKS = [
  { to: '/m/diet', icon: '🍽️', label: 'Diet Plan', color: 'from-emerald-500/20 to-emerald-700/10' },
  { to: '/m/workout', icon: '🏋️', label: 'Workout', color: 'from-blue-500/20 to-blue-700/10' },
  { to: '/m/leaderboard', icon: '🏅', label: 'Leaderboard', color: 'from-yellow-500/20 to-yellow-700/10' },
  { to: '/m/feed', icon: '📣', label: 'Feed', color: 'from-purple-500/20 to-purple-700/10' },
]

export default function MemberHome() {
  const [data, setData] = useState<HomeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [scanResult, setScanResult] = useState<{ text: string; type: 'success' | 'warning' | 'error' } | null>(null)
  const [scanLoading, setScanLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    getHome()
      .then((d) => setData(d as HomeData))
      .catch((err) => {
        if (err?.response?.data?.code === 'NO_GYM') {
          navigate('/m/discover', { replace: true })
          return
        }
        setError(err?.response?.data?.message || 'Failed to load home')
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleGymQrScan(qrData: string) {
    const gymId = qrData.startsWith('repcount:checkin:')
      ? qrData.replace('repcount:checkin:', '')
      : qrData
    if (!gymId || scanLoading) return
    setScanLoading(true)
    setShowScanner(false)
    try {
      await selfCheckIn(gymId)
      setScanResult({ text: 'Checked in!', type: 'success' })
    } catch (err: any) {
      if (err.response?.status === 409) {
        setScanResult({ text: 'Already checked in today', type: 'warning' })
      } else {
        setScanResult({ text: err.response?.data?.error || 'Check-in failed', type: 'error' })
      }
    } finally {
      setScanLoading(false)
    }
  }

  if (loading) return <LoadingSpinner text="Loading your dashboard..." />

  if (error) {
    return (
      <div className="p-4">
        <Card variant="alert-danger">
          <p className="text-sm">{error}</p>
        </Card>
      </div>
    )
  }

  if (!data) return null

  const { member, gym, membership, streak } = data
  // Handle both response shapes: attendanceDays (string[]) or attendanceGrid ({date, present}[])
  const attendanceDays = data.attendanceDays || (data.attendanceGrid?.filter(d => d.present).map(d => d.date)) || []
  const attendanceSet = new Set(attendanceDays)
  const last30 = getLast30Days()
  const checkedInToday = attendanceSet.has(todayIST())

  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
  const dailyQuote = MOTIVATION_QUOTES[dayOfYear % MOTIVATION_QUOTES.length]

  // Membership info
  const isActive = membership && membership.status === 'active'
  const daysLeft = membership ? daysUntil(membership.expiry_date) : 0
  const planLabel = membership
    ? PLAN_TYPES.find((p) => p.value === membership.plan_type)?.label || membership.plan_type
    : null

  return (
    <div className="p-4 space-y-4">
      {/* Greeting */}
      <Card variant="gradient">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">
              Hey, {member.name?.split(' ')[0] || 'there'}!
            </h2>
            <p className="text-text-secondary text-sm mt-0.5">{gym.name}</p>
          </div>
          {checkedInToday && (
            <Badge variant="green">Checked in</Badge>
          )}
        </div>
      </Card>

      <Card>
        <p className="text-sm text-text-secondary italic text-center">"{dailyQuote}"</p>
      </Card>

      {/* QR Check-in */}
      <Link to="/m/qr">
        <Card>
          <div className="flex items-center gap-3">
            <span className="text-3xl">📱</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-text-primary">Show My QR</p>
              <p className="text-text-secondary text-xs">For quick check-in at the gym</p>
            </div>
            <span className="text-text-muted text-lg">&rarr;</span>
          </div>
        </Card>
      </Link>

      {/* Scan Gym QR to Check In */}
      {!checkedInToday && (
        showScanner ? (
          <Card>
            <h3 className="text-sm font-semibold text-text-primary mb-3">Scan Gym QR</h3>
            <QrScanner
              onScan={handleGymQrScan}
              onError={(err) => { setScanResult({ text: err, type: 'error' }); setShowScanner(false) }}
            />
            <button
              onClick={() => setShowScanner(false)}
              className="w-full text-center text-text-muted text-sm mt-3 py-2"
            >
              Cancel
            </button>
          </Card>
        ) : (
          <button onClick={() => { setShowScanner(true); setScanResult(null) }} className="w-full">
            <Card>
              <div className="flex items-center gap-3">
                <span className="text-3xl">📷</span>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-text-primary">Scan to Check In</p>
                  <p className="text-text-secondary text-xs">Scan gym QR at the gate</p>
                </div>
                <span className="text-text-muted text-lg">&rarr;</span>
              </div>
            </Card>
          </button>
        )
      )}

      {scanResult && (
        <Card>
          <p className={`text-sm text-center font-semibold ${
            scanResult.type === 'success' ? 'text-status-green' :
            scanResult.type === 'warning' ? 'text-status-yellow' :
            'text-status-red'
          }`}>{scanResult.text}</p>
        </Card>
      )}

      {/* Streak */}
      <Card>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{streak > 0 ? '🔥' : '💤'}</span>
          <div>
            {streak > 0 ? (
              <>
                <p className="text-2xl font-bold text-accent-orange">{streak}</p>
                <p className="text-text-secondary text-sm">day streak</p>
              </>
            ) : (
              <>
                <p className="text-lg font-semibold text-text-primary">No streak yet</p>
                <p className="text-text-secondary text-sm">Check in today to start one!</p>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Plan Status */}
      <Card>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-text-secondary">Membership</h3>
          {isActive && daysLeft >= 0 ? (
            <Badge variant={daysLeft <= 7 ? 'yellow' : 'green'}>
              {daysLeft} days left
            </Badge>
          ) : (
            <Badge variant="red">Expired</Badge>
          )}
        </div>
        {isActive && membership ? (
          <div className="mt-2">
            <p className="text-lg font-bold">{planLabel}</p>
            <p className="text-text-secondary text-sm">
              Expires {formatDate(membership.expiry_date)}
            </p>
          </div>
        ) : (
          <div className="mt-2">
            <p className="text-text-muted text-sm">No active plan. Talk to your gym owner to renew.</p>
          </div>
        )}
      </Card>

      {/* 30-Day Attendance Grid */}
      <Card>
        <h3 className="text-sm font-semibold text-text-secondary mb-3">Last 30 Days</h3>
        <div className="grid grid-cols-7 gap-1.5">
          {/* Day-of-week headers */}
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <div key={i} className="text-center text-[10px] text-text-muted font-medium pb-1">
              {d}
            </div>
          ))}
          {/* Pad leading cells so first date aligns to correct day-of-week column */}
          {(() => {
            const firstDate = new Date(last30[0] + 'T00:00:00+05:30')
            // JS getDay: 0=Sun. We want Mon=0 so offset = (getDay + 6) % 7
            const offset = (firstDate.getDay() + 6) % 7
            return Array.from({ length: offset }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))
          })()}
          {/* Day circles */}
          {last30.map((dateStr) => {
            const attended = attendanceSet.has(dateStr)
            const isToday = dateStr === todayIST()
            return (
              <div key={dateStr} className="flex justify-center" title={`${dayLabel(dateStr)} ${dateStr}`}>
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium transition-colors ${
                    attended
                      ? 'bg-status-green text-black'
                      : 'bg-white/5 text-text-muted'
                  } ${isToday ? 'ring-2 ring-accent-orange ring-offset-1 ring-offset-bg-primary' : ''}`}
                >
                  {new Date(dateStr + 'T00:00:00+05:30').getDate()}
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex items-center gap-4 mt-3 pt-2 border-t border-border">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-status-green" />
            <span className="text-[11px] text-text-secondary">Present</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-white/5" />
            <span className="text-[11px] text-text-secondary">Absent</span>
          </div>
          <span className="ml-auto text-[11px] text-text-muted">
            {attendanceDays.length}/30 days
          </span>
        </div>
      </Card>

      {/* Badges */}
      <Card>
        <h3 className="text-sm font-semibold text-text-secondary mb-3">Badges Earned</h3>
        {member.badges && member.badges.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {member.badges.map((badge) => {
              const info = BADGE_TYPES.find((b) => b.type === badge.badge_type)
              return (
                <div
                  key={badge.badge_type}
                  className="flex flex-col items-center gap-1 min-w-[72px]"
                >
                  <span className="text-2xl">{info?.emoji || '🏅'}</span>
                  <span className="text-[10px] text-text-secondary text-center leading-tight">
                    {info?.label || badge.badge_type}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-text-muted text-sm">Keep going to earn badges!</p>
        )}
      </Card>

      {/* Quick Links */}
      <div>
        <h3 className="text-sm font-semibold text-text-secondary mb-3 px-0.5">Quick Links</h3>
        <div className="grid grid-cols-2 gap-3">
          {QUICK_LINKS.map((link) => (
            <Link key={link.to} to={link.to}>
              <div className={`bg-gradient-to-br ${link.color} rounded-2xl p-4 border border-border active:scale-[0.97] transition-transform`}>
                <span className="text-2xl">{link.icon}</span>
                <p className="text-sm font-semibold mt-2">{link.label}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
