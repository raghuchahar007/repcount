'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

export default function ReferPage() {
  const [gymSlug, setGymSlug] = useState('')
  const [gymName, setGymName] = useState('')
  const [memberName, setMemberName] = useState('')
  const [referralCount, setReferralCount] = useState(0)
  const [referrals, setReferrals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => { loadReferralData() }, [])

  async function loadReferralData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: member } = await supabase
      .from('members').select('id, name, gym_id, gyms(name, slug)').eq('user_id', user.id).eq('is_active', true).single()

    if (!member) { setLoading(false); return }
    setMemberName(member.name)
    setGymName((member.gyms as any)?.name || '')
    setGymSlug((member.gyms as any)?.slug || '')

    // Get referral leads
    const { data: leads } = await supabase
      .from('leads')
      .select('*')
      .eq('referrer_member_id', member.id)
      .order('created_at', { ascending: false })

    setReferrals(leads || [])
    setReferralCount(leads?.length || 0)
    setLoading(false)
  }

  const referralLink = typeof window !== 'undefined'
    ? `${window.location.origin}/gym/${gymSlug}/join?ref=${encodeURIComponent(memberName)}`
    : ''

  const shareText = `Hey! I go to ${gymName} and it's amazing 💪 Join through this link and we both get benefits! ${referralLink}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  const handleWhatsAppShare = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank')
  }

  if (loading) return <div className="p-4 space-y-4">{[1, 2].map(i => <div key={i} className="h-24 bg-bg-card rounded-2xl animate-pulse" />)}</div>

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold text-text-primary">Refer a Friend</h2>

      {/* Stats */}
      <Card variant="gradient" className="p-5 text-center">
        <span className="text-4xl">🤝</span>
        <p className="text-2xl font-bold text-text-primary mt-2">{referralCount}</p>
        <p className="text-xs text-text-secondary">Friends Referred</p>
        {referralCount >= 3 && <Badge color="orange" className="mt-2">📣 Influencer</Badge>}
        {referralCount >= 1 && referralCount < 3 && <Badge color="green" className="mt-2">🤝 First Referral</Badge>}
      </Card>

      {/* Referral Link */}
      <Card className="p-4 space-y-3">
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Your Referral Link</p>
        <div className="bg-bg-primary border border-border rounded-lg p-3">
          <p className="text-xs text-text-secondary break-all">{referralLink || 'Loading...'}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" onClick={handleCopy}>
            {copied ? '✅ Copied!' : '📋 Copy Link'}
          </Button>
          <Button size="sm" variant="success" onClick={handleWhatsAppShare}>
            📱 Share WhatsApp
          </Button>
        </div>
      </Card>

      {/* How it works */}
      <Card className="p-4">
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">How It Works</p>
        <div className="space-y-3">
          {[
            { step: '1', text: 'Share your link with friends', icon: '📤' },
            { step: '2', text: 'They sign up through your link', icon: '✍️' },
            { step: '3', text: 'You both get recognized!', icon: '🏅' },
          ].map(s => (
            <div key={s.step} className="flex items-center gap-3">
              <span className="text-lg">{s.icon}</span>
              <p className="text-sm text-text-secondary">{s.text}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Referral History */}
      {referrals.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Your Referrals</p>
          <div className="space-y-2">
            {referrals.map(r => (
              <Card key={r.id} className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-primary">{r.name}</p>
                  <p className="text-[10px] text-text-muted">{new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                </div>
                <Badge color={r.status === 'converted' ? 'green' : r.status === 'contacted' ? 'yellow' : 'blue'}>
                  {r.status}
                </Badge>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
