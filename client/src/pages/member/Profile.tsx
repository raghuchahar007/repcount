import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProfile, updateProfile, leaveGym } from '@/api/me'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonCard } from '@/components/shared/Skeleton'
import ErrorCard from '@/components/shared/ErrorCard'
import { NoGymCard } from '@/components/shared/NoGymCard'
import { GOALS, DIET_PREFS, BADGE_TYPES, PLAN_TYPES } from '@/utils/constants'
import { getInitials, formatDate, formatCurrency, formatPhone } from '@/utils/helpers'

interface MemberProfile {
  _id: string
  name: string
  phone: string
  goal: string | null
  diet_pref: string | null
  badges: { badge_type: string; earned_at: string }[]
  created_at: string
}

interface Membership {
  _id: string
  plan_type: string
  amount: number
  start_date: string
  expiry_date: string
  payment_method: string
  created_at: string
}

interface GymInfo {
  name: string
  slug: string
}

interface ProfileData {
  member: MemberProfile
  gym: GymInfo | null
  memberships: Membership[]
}

export default function ProfilePage() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [data, setData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [noGym, setNoGym] = useState(false)

  // Editable fields
  const [name, setName] = useState('')
  const [goal, setGoal] = useState('')
  const [dietPref, setDietPref] = useState('')
  const [saving, setSaving] = useState(false)

  const [loggingOut, setLoggingOut] = useState(false)
  const [leavingGym, setLeavingGym] = useState(false)

  function fetchProfile() {
    setLoading(true)
    setError('')
    getProfile()
      .then((d) => {
        const profileData = d as ProfileData
        setData(profileData)
        setName(profileData.member.name || '')
        setGoal(profileData.member.goal || '')
        setDietPref(profileData.member.diet_pref || '')
      })
      .catch((err) => {
        if (err?.response?.data?.code === 'NO_GYM') {
          setNoGym(true)
        } else {
          setError(err?.response?.data?.message || 'Failed to load profile')
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      await updateProfile({ name: name.trim() || undefined, goal: goal || undefined, diet_pref: dietPref || undefined })
      // Update local data so header and hasChanges stay in sync
      if (data) {
        setData({
          ...data,
          member: {
            ...data.member,
            name: name.trim() || data.member.name,
            goal: goal || data.member.goal,
            diet_pref: dietPref || data.member.diet_pref,
          },
        })
      }
      toast('Saved!')
    } catch {
      toast('Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleLeaveGym() {
    const gymName = data?.gym?.name || 'this gym'
    if (!window.confirm(`Leave ${gymName}?`)) return
    setLeavingGym(true)
    try {
      await leaveGym()
      navigate('/m')
    } catch {
      setLeavingGym(false)
    }
  }

  async function handleLogout() {
    setLoggingOut(true)
    await logout()
  }

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (noGym) return <NoGymCard feature="your profile" />

  if (error) {
    return (
      <div className="p-4">
        <ErrorCard message={error} onRetry={fetchProfile} />
      </div>
    )
  }

  if (!data) return null

  const { member, memberships } = data
  const earnedBadgeTypes = new Set(member.badges.map((b) => b.badge_type))

  // Determine if form has changed from server values
  const hasChanges =
    (name !== (member.name || '')) || (goal !== (member.goal || '')) || (dietPref !== (member.diet_pref || ''))

  return (
    <div className="p-4 space-y-4">
      {/* Profile Header */}
      <Card variant="gradient">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent-primary to-accent-primary-dark flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-accent-primary/30">
            {getInitials(member.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-text-primary truncate">{member.name}</h2>
            <p className="text-text-secondary text-sm">{formatPhone(member.phone)}</p>
            <p className="text-text-muted text-xs mt-0.5">
              Member since {formatDate(member.created_at)}
            </p>
          </div>
        </div>
      </Card>

      {/* Editable Preferences */}
      <Card>
        <h3 className="text-sm font-semibold text-text-primary mb-3">Preferences</h3>

        {/* Name */}
        <div className="mb-3">
          <label className="block text-xs text-text-secondary mb-1.5">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full px-3 py-2.5 rounded-xl text-sm bg-bg-card border border-border-light text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition-colors"
          />
        </div>

        {/* Goal */}
        <div className="mb-3">
          <label className="block text-xs text-text-secondary mb-1.5">Fitness Goal</label>
          <div className="grid grid-cols-3 gap-2">
            {GOALS.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => setGoal(g.value)}
                className={`px-2 py-2.5 rounded-xl text-xs font-medium transition-all border text-center ${
                  goal === g.value
                    ? 'bg-accent-primary/10 border-accent-primary text-accent-primary'
                    : 'bg-bg-card border-border-light text-text-secondary'
                }`}
              >
                <span className="text-base block mb-0.5">{g.emoji}</span>
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Diet Preference */}
        <div className="mb-4">
          <label className="block text-xs text-text-secondary mb-1.5">Diet Preference</label>
          <div className="grid grid-cols-3 gap-2">
            {DIET_PREFS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDietPref(d.value)}
                className={`px-2 py-2.5 rounded-xl text-xs font-medium transition-all border text-center ${
                  dietPref === d.value
                    ? 'bg-accent-primary/10 border-accent-primary text-accent-primary'
                    : 'bg-bg-card border-border-light text-text-secondary'
                }`}
              >
                <span className="text-base block mb-0.5">{d.emoji}</span>
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Save button */}
        <Button
          size="sm"
          onClick={handleSave}
          loading={saving}
          disabled={!hasChanges}
        >
          Save Changes
        </Button>
      </Card>

      {/* Badges */}
      <Card>
        <h3 className="text-sm font-semibold text-text-primary mb-1">Badges</h3>
        <p className="text-xs text-text-muted mb-4">
          {earnedBadgeTypes.size} of {BADGE_TYPES.length} earned
        </p>

        <div className="grid grid-cols-2 gap-3">
          {BADGE_TYPES.map((badge) => {
            const earned = earnedBadgeTypes.has(badge.type)
            const earnedBadge = member.badges.find((b) => b.badge_type === badge.type)

            return (
              <div
                key={badge.type}
                className={`relative rounded-2xl p-3 border transition-all ${
                  earned
                    ? 'bg-gradient-to-br from-accent-primary/10 via-accent-primary/5 to-transparent border-accent-primary/30 shadow-sm shadow-accent-primary/10'
                    : 'bg-white/[0.02] border-border opacity-50'
                }`}
              >
                {/* Earned glow indicator */}
                {earned && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-status-green rounded-full flex items-center justify-center shadow-lg shadow-status-green/30">
                    <svg
                      className="w-3 h-3 text-black"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}

                {/* Lock icon for unearned */}
                {!earned && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-white/10 rounded-full flex items-center justify-center">
                    <svg
                      className="w-2.5 h-2.5 text-text-muted"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}

                {/* Emoji */}
                <div
                  className={`text-2xl mb-1.5 ${earned ? '' : 'grayscale'}`}
                >
                  {badge.emoji}
                </div>

                {/* Label */}
                <p
                  className={`text-xs font-semibold leading-tight ${
                    earned ? 'text-text-primary' : 'text-text-muted'
                  }`}
                >
                  {badge.label}
                </p>

                {/* Requirement / Earned date */}
                <p className="text-[10px] text-text-muted mt-0.5 leading-tight">
                  {earned && earnedBadge
                    ? `Earned ${formatDate(earnedBadge.earned_at)}`
                    : badge.requirement}
                </p>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Refer a Friend */}
      {data?.gym?.slug && (
        <Card>
          <h3 className="text-sm font-semibold text-text-secondary mb-2">Refer a Friend</h3>
          <p className="text-text-secondary text-xs mb-3">Invite friends to join {data.gym.name}</p>
          <button
            onClick={() => {
              const url = `${window.location.origin}/gym/${data.gym!.slug}?ref=${data.member._id}`
              if (navigator.share) {
                navigator.share({ title: `Join ${data.gym!.name}`, text: 'Check out my gym on RepCount!', url })
              } else {
                navigator.clipboard.writeText(url)
              }
            }}
            className="w-full bg-accent-primary text-white font-semibold text-sm py-2.5 rounded-xl"
          >
            Share Invite Link
          </button>
        </Card>
      )}

      {/* Payment History */}
      {memberships.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-text-primary mb-2">
            Payment History ({memberships.length})
          </h3>
          <div className="space-y-2">
            {memberships.map((m) => (
              <div
                key={m._id}
                className="flex items-center justify-between py-2 border-b border-border-light last:border-0"
              >
                <div>
                  <p className="text-sm text-text-primary font-medium">
                    {formatCurrency(m.amount)}
                  </p>
                  <p className="text-xs text-text-muted">
                    {PLAN_TYPES.find((p) => p.value === m.plan_type)?.label || m.plan_type}
                    {' · '}
                    <span className="capitalize">{m.payment_method}</span>
                  </p>
                </div>
                <p className="text-xs text-text-muted">{formatDate(m.created_at)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Leave Gym */}
      <Button
        variant="outline"
        fullWidth
        onClick={handleLeaveGym}
        loading={leavingGym}
        className="!text-status-red !border-status-red/30"
      >
        Leave Gym
      </Button>

      {/* Logout */}
      <Button
        variant="danger"
        fullWidth
        onClick={handleLogout}
        loading={loggingOut}
      >
        Logout
      </Button>

      {/* Bottom spacer for nav */}
      <div className="h-2" />
    </div>
  )
}
