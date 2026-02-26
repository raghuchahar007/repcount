'use client'
import { useState, useEffect, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { GOALS } from '@/lib/constants'

function JoinForm() {
  const { slug } = useParams()
  const searchParams = useSearchParams()
  const referrer = searchParams.get('ref')

  const [gymName, setGymName] = useState('')
  const [gymId, setGymId] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    goal: 'general',
  })

  useEffect(() => {
    loadGym()
  }, [slug])

  async function loadGym() {
    const supabase = createClient()
    const { data: gym } = await supabase.from('gyms').select('id, name').eq('slug', slug).single()
    if (gym) {
      setGymName(gym.name)
      setGymId(gym.id)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.phone.trim() || !gymId) return

    setLoading(true)
    const supabase = createClient()

    // Find referrer member if exists
    let referrerMemberId = null
    if (referrer) {
      const { data: refMember } = await supabase
        .from('members').select('id').eq('gym_id', gymId).ilike('name', `%${referrer}%`).limit(1).single()
      if (refMember) referrerMemberId = refMember.id
    }

    await supabase.from('leads').insert({
      gym_id: gymId,
      name: form.name.trim(),
      phone: form.phone.replace(/\D/g, ''),
      goal: form.goal,
      source: referrer ? 'referral' : 'gym_page',
      referrer_member_id: referrerMemberId,
      status: 'new',
    })

    setSubmitted(true)
    setLoading(false)
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center px-6">
        <Card className="p-8 text-center max-w-sm w-full">
          <span className="text-5xl">🎉</span>
          <h2 className="text-xl font-bold text-text-primary mt-3">You're In!</h2>
          <p className="text-sm text-text-secondary mt-2">
            {gymName} will contact you shortly. Get ready to transform! 💪
          </p>
          {referrer && (
            <p className="text-xs text-accent-orange mt-2">Referred by {referrer}</p>
          )}
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-accent-orange">RepCount</h1>
          <p className="text-text-secondary text-sm mt-1">Join {gymName}</p>
          {referrer && (
            <p className="text-accent-orange text-xs mt-1">Referred by {referrer} 🤝</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Card className="p-4 space-y-3">
            <Input
              label="Your Name"
              placeholder="Full name"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            />
            <Input
              label="Phone"
              type="tel"
              placeholder="9876543210"
              value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              maxLength={10}
            />
            <div>
              <label className="block text-xs text-text-secondary mb-2">Fitness Goal</label>
              <div className="flex gap-2">
                {GOALS.map(g => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, goal: g.value }))}
                    className={`flex-1 py-2 px-1 rounded-lg text-[11px] font-medium text-center transition-colors ${
                      form.goal === g.value
                        ? 'bg-accent-orange text-white'
                        : 'bg-bg-hover text-text-secondary border border-border'
                    }`}
                  >
                    {g.emoji} {g.label}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          <Button type="submit" fullWidth size="lg" loading={loading}>
            Join Now
          </Button>
        </form>
      </div>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg-primary" />}>
      <JoinForm />
    </Suspense>
  )
}
