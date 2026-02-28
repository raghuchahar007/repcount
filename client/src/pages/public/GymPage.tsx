import { useState, useEffect, FormEvent } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { getPublicGym, getPublicPosts, submitLead } from '@/api/public'
import { requestJoinGym } from '@/api/me'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { formatCurrency, formatDate } from '@/utils/helpers'
import { POST_TYPES, GOALS, PLAN_TYPES } from '@/utils/constants'

interface Gym {
  name: string
  city?: string
  address?: string
  phone?: string
  description?: string
  opening_time?: string
  closing_time?: string
  pricing?: Record<string, number>
  facilities?: string[]
  upi_id?: string
}

interface Post {
  _id?: string
  title: string
  body?: string
  post_type: string
  starts_at?: string
  ends_at?: string
  created_at: string
}

function getPostBadgeColor(postType: string): 'orange' | 'blue' | 'green' | 'purple' | 'gray' {
  const map: Record<string, 'orange' | 'blue' | 'green' | 'purple'> = {
    challenge: 'orange',
    event: 'blue',
    offer: 'green',
    announcement: 'purple',
  }
  return map[postType] || 'gray'
}

function getPostTypeLabel(postType: string): string {
  const found = POST_TYPES.find(pt => pt.value === postType)
  return found ? `${found.emoji} ${found.label}` : postType
}

export default function GymPage() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()
  const ref = searchParams.get('ref')
  const { user } = useAuth()
  const [gym, setGym] = useState<Gym | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [joinStatus, setJoinStatus] = useState<'idle' | 'loading' | 'sent' | 'already'>('idle')

  // Lead form state
  const [showForm, setShowForm] = useState(false)
  const [leadName, setLeadName] = useState('')
  const [leadPhone, setLeadPhone] = useState('')
  const [leadGoal, setLeadGoal] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (!slug) return
    loadData()
  }, [slug])

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [gymData, postsData] = await Promise.all([
        getPublicGym(slug!),
        getPublicPosts(slug!),
      ])
      setGym(gymData)
      setPosts(Array.isArray(postsData) ? postsData.slice(0, 5) : [])
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setError('Gym not found')
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleLeadSubmit(e: FormEvent) {
    e.preventDefault()
    if (!leadName.trim()) return
    if (!/^\d{10}$/.test(leadPhone)) {
      setSubmitError('Please enter a valid 10-digit phone number')
      return
    }

    setSubmitting(true)
    setSubmitError('')
    try {
      await submitLead(slug!, {
        name: leadName.trim(),
        phone: `+91${leadPhone}`,
        ...(leadGoal ? { goal: leadGoal } : {}),
      })
      setSubmitSuccess(true)
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setSubmitError("You've already submitted a request for this gym.")
      } else {
        setSubmitError('Something went wrong. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <LoadingSpinner text="Loading gym details..." />
  }

  if (error) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-screen text-center">
        <span className="text-5xl mb-4">
          {error === 'Gym not found' ? '404' : '!'}
        </span>
        <h2 className="text-xl font-bold text-text-primary mb-2">
          {error === 'Gym not found' ? 'Gym Not Found' : 'Oops!'}
        </h2>
        <p className="text-text-secondary text-sm">{error}</p>
      </div>
    )
  }

  if (!gym) return null

  // Build pricing entries from the gym pricing object
  const pricingEntries = PLAN_TYPES
    .filter(plan => gym.pricing && gym.pricing[plan.value] != null && gym.pricing[plan.value] > 0)
    .map(plan => ({
      ...plan,
      price: gym.pricing![plan.value],
      perMonth: Math.round(gym.pricing![plan.value] / plan.months),
    }))

  // Find the best per-month value
  const bestPerMonth = pricingEntries.length > 0
    ? Math.min(...pricingEntries.map(p => p.perMonth))
    : null

  return (
    <div className="min-h-screen pb-8">
      {/* ------------------------------------------------------------------ */}
      {/* Hero Section                                                        */}
      {/* ------------------------------------------------------------------ */}
      <Card variant="gradient" className="rounded-none rounded-b-3xl p-6 pt-10 pb-8">
        <div className="text-center">
          {/* Gym icon */}
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent-orange/20 flex items-center justify-center">
            <span className="text-3xl">🏋️</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2 leading-tight">
            {gym.name}
          </h1>
          {(gym.city || gym.address) && (
            <p className="text-text-secondary text-sm">
              {[gym.address, gym.city].filter(Boolean).join(', ')}
            </p>
          )}
          {gym.description && (
            <p className="text-text-muted text-xs mt-3 leading-relaxed max-w-xs mx-auto">
              {gym.description}
            </p>
          )}
        </div>
      </Card>

      <div className="px-4 space-y-5 mt-5">
        {/* ---------------------------------------------------------------- */}
        {/* Info Row: Timings + Phone                                         */}
        {/* ---------------------------------------------------------------- */}
        {(gym.opening_time || gym.closing_time || gym.phone) && (
          <div className="flex gap-3">
            {(gym.opening_time || gym.closing_time) && (
              <Card className="flex-1 p-3 text-center">
                <p className="text-lg mb-1">🕐</p>
                <p className="text-xs text-text-secondary">Timings</p>
                <p className="text-sm font-semibold text-text-primary mt-0.5">
                  {gym.opening_time || '—'} – {gym.closing_time || '—'}
                </p>
              </Card>
            )}
            {gym.phone && (
              <Card className="flex-1 p-3 text-center">
                <p className="text-lg mb-1">📞</p>
                <p className="text-xs text-text-secondary">Phone</p>
                <a
                  href={`tel:${gym.phone}`}
                  className="text-sm font-semibold text-accent-orange mt-0.5 block"
                >
                  {gym.phone}
                </a>
              </Card>
            )}
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Facilities                                                        */}
        {/* ---------------------------------------------------------------- */}
        {gym.facilities && gym.facilities.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-3">Facilities</h2>
            <div className="flex flex-wrap gap-2">
              {gym.facilities.map((facility) => (
                <span
                  key={facility}
                  className="bg-bg-card border border-border-light rounded-xl px-3 py-1.5 text-xs text-text-secondary"
                >
                  {facility}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Pricing Table                                                     */}
        {/* ---------------------------------------------------------------- */}
        {pricingEntries.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-3">Membership Plans</h2>
            <div className="grid grid-cols-2 gap-3">
              {pricingEntries.map((plan) => {
                const isBestValue = plan.perMonth === bestPerMonth && pricingEntries.length > 1
                return (
                  <Card
                    key={plan.value}
                    className={`p-4 relative overflow-hidden ${
                      isBestValue
                        ? 'border-accent-orange/50 ring-1 ring-accent-orange/30'
                        : ''
                    }`}
                  >
                    {isBestValue && (
                      <div className="absolute top-0 right-0 bg-accent-orange text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg">
                        BEST VALUE
                      </div>
                    )}
                    <p className="text-xs text-text-secondary mb-1">{plan.label}</p>
                    <p className={`text-xl font-bold ${isBestValue ? 'text-accent-orange' : 'text-text-primary'}`}>
                      {formatCurrency(plan.price)}
                    </p>
                    <p className="text-[10px] text-text-muted mt-1">
                      {formatCurrency(plan.perMonth)}/mo
                    </p>
                  </Card>
                )
              })}
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Recent Posts                                                       */}
        {/* ---------------------------------------------------------------- */}
        {posts.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-3">Latest Updates</h2>
            <div className="space-y-2">
              {posts.map((post, index) => (
                <Card key={post._id || index} className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h3 className="text-sm font-medium text-text-primary leading-snug flex-1">
                      {post.title}
                    </h3>
                    <Badge color={getPostBadgeColor(post.post_type)}>
                      {getPostTypeLabel(post.post_type)}
                    </Badge>
                  </div>
                  {post.body && (
                    <p className="text-xs text-text-muted leading-relaxed line-clamp-2">
                      {post.body}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-text-muted">
                    {post.created_at && (
                      <span>{formatDate(post.created_at)}</span>
                    )}
                    {post.starts_at && (
                      <span>Starts: {formatDate(post.starts_at)}</span>
                    )}
                    {post.ends_at && (
                      <span>Ends: {formatDate(post.ends_at)}</span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* CTA + Lead Form                                                   */}
        {/* ---------------------------------------------------------------- */}
        <section className="pt-2">
          {!showForm && !submitSuccess && (
            <Button
              fullWidth
              size="lg"
              onClick={() => setShowForm(true)}
              className="text-base"
            >
              Join This Gym
            </Button>
          )}

          {showForm && !submitSuccess && (
            <Card className="p-5">
              <h2 className="text-base font-bold text-text-primary mb-1">
                Interested in joining?
              </h2>
              <p className="text-xs text-text-muted mb-4">
                Leave your details and the gym will contact you.
              </p>

              <form onSubmit={handleLeadSubmit} className="space-y-3">
                <Input
                  label="Name"
                  placeholder="Your full name"
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  required
                />

                <div className="w-full">
                  <label className="block text-sm text-text-secondary mb-1.5">
                    Phone
                  </label>
                  <div className="flex">
                    <span className="flex items-center px-3 bg-bg-hover border border-r-0 border-border-light rounded-l-xl text-sm text-text-secondary">
                      +91
                    </span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="10 digit number"
                      value={leadPhone}
                      onChange={(e) => setLeadPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      required
                      className="flex-1 bg-bg-card border border-border-light rounded-r-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-orange transition-colors"
                    />
                  </div>
                </div>

                <div className="w-full">
                  <label className="block text-sm text-text-secondary mb-1.5">
                    Goal (optional)
                  </label>
                  <select
                    value={leadGoal}
                    onChange={(e) => setLeadGoal(e.target.value)}
                    className="w-full bg-bg-card border border-border-light rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent-orange transition-colors appearance-none"
                  >
                    <option value="">Select a goal</option>
                    {GOALS.map((goal) => (
                      <option key={goal.value} value={goal.value}>
                        {goal.emoji} {goal.label}
                      </option>
                    ))}
                  </select>
                </div>

                {submitError && (
                  <p className="text-xs text-status-red">{submitError}</p>
                )}

                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    loading={submitting}
                    className="flex-1"
                  >
                    Submit
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {submitSuccess && (
            <Card variant="alert-success" className="p-5 text-center">
              <span className="text-3xl block mb-2">🎉</span>
              <h3 className="text-base font-bold text-status-green mb-1">
                Thanks!
              </h3>
              <p className="text-sm text-text-secondary">
                The gym will contact you soon.
              </p>
            </Card>
          )}
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Request to Join (logged-in members)                               */}
        {/* ---------------------------------------------------------------- */}
        {user && user.role === 'member' && (
          <Card>
            <div className="text-center py-2">
              {joinStatus === 'sent' ? (
                <>
                  <span className="text-3xl block mb-2">✅</span>
                  <p className="text-sm font-semibold text-status-green">Request sent!</p>
                  <p className="text-text-secondary text-xs mt-1">The gym owner will review your request.</p>
                </>
              ) : joinStatus === 'already' ? (
                <>
                  <span className="text-3xl block mb-2">⏳</span>
                  <p className="text-sm font-semibold text-text-primary">Request pending</p>
                  <p className="text-text-secondary text-xs mt-1">Waiting for the gym owner to approve.</p>
                </>
              ) : (
                <button
                  onClick={async () => {
                    setJoinStatus('loading')
                    try {
                      await requestJoinGym(slug!, ref || undefined)
                      setJoinStatus('sent')
                    } catch (err: any) {
                      if (err?.response?.status === 409) {
                        setJoinStatus('already')
                      } else {
                        setJoinStatus('idle')
                      }
                    }
                  }}
                  disabled={joinStatus === 'loading'}
                  className="w-full bg-accent-orange text-white font-semibold text-sm py-3 rounded-xl disabled:opacity-50"
                >
                  {joinStatus === 'loading' ? 'Sending...' : 'Request to Join'}
                </button>
              )}
            </div>
          </Card>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Footer / Branding                                                 */}
        {/* ---------------------------------------------------------------- */}
        <div className="text-center pt-4 pb-2">
          <p className="text-[10px] text-text-muted">
            Powered by <span className="text-accent-orange font-semibold">RepCount</span>
          </p>
        </div>
      </div>
    </div>
  )
}
