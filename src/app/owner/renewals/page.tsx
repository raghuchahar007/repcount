'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { generateWhatsAppLink, templates } from '@/lib/whatsapp'
import { formatCurrency, daysSince, todayIST } from '@/lib/utils'
import Link from 'next/link'

interface RenewalMember {
  id: string
  name: string
  phone: string
  expiry_date: string
  amount: number
  plan_type: string
  days_overdue: number
}

export default function RenewalsPage() {
  const [members, setMembers] = useState<RenewalMember[]>([])
  const [gymName, setGymName] = useState('')
  const [gymUpi, setGymUpi] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => { loadRenewals() }, [])

  async function loadRenewals() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: gym } = await supabase
        .from('gyms').select('id, name, upi_id').eq('owner_id', user.id).single()
      if (!gym) return
      setGymName(gym.name)
      setGymUpi(gym.upi_id || '')

      const sevenDays = new Date(Date.now() + 7 * 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

      // Query memberships directly with server-side date filter
      const { data } = await supabase
        .from('memberships')
        .select('id, expiry_date, amount, plan_type, member_id, members(id, name, phone)')
        .eq('gym_id', gym.id)
        .eq('status', 'active')
        .lte('expiry_date', sevenDays)
        .order('expiry_date', { ascending: true })

      // Deduplicate by member_id (take latest membership per member)
      const byMember: Record<string, RenewalMember> = {}
      ;(data || []).forEach((ms: any) => {
        const member = ms.members
        if (!member) return
        const existing = byMember[ms.member_id]
        // Keep the one with the latest expiry_date
        if (!existing || ms.expiry_date > existing.expiry_date) {
          byMember[ms.member_id] = {
            id: member.id,
            name: member.name,
            phone: member.phone,
            expiry_date: ms.expiry_date,
            amount: ms.amount,
            plan_type: ms.plan_type,
            days_overdue: Math.max(0, daysSince(ms.expiry_date)),
          }
        }
      })

      const renewalList = Object.values(byMember)
      renewalList.sort((a, b) => a.days_overdue - b.days_overdue)
      setMembers(renewalList)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-4 space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-bg-card rounded-xl animate-pulse" />)}</div>

  if (error) return (
    <div className="p-4 flex flex-col items-center justify-center min-h-[40vh] text-center">
      <p className="text-text-secondary text-sm">Something went wrong</p>
      <button onClick={() => { setError(false); setLoading(true); loadRenewals() }} className="text-accent-orange text-sm mt-2 font-medium min-h-[44px]">
        Tap to retry
      </button>
    </div>
  )

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold text-text-primary">Renewals ({members.length})</h2>
      <p className="text-xs text-text-secondary">Members expiring within 7 days or already expired</p>

      {members.length === 0 ? (
        <Card className="p-8 text-center">
          <span className="text-3xl">✅</span>
          <p className="text-text-muted text-sm mt-2">No upcoming renewals</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {members.map(m => {
            const isOverdue = m.days_overdue > 0
            const message = isOverdue
              ? templates.overdue_payment(m.name, m.days_overdue, m.amount, gymName)
              : templates.renewal_reminder(m.name, m.expiry_date, gymName, gymUpi || undefined)

            return (
              <Card key={m.id} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <Link href={`/owner/members/${m.id}`} className="text-sm font-medium text-text-primary">{m.name}</Link>
                    <p className="text-[11px] text-text-muted">{m.phone} · {formatCurrency(m.amount)} · {m.plan_type.replace('_', ' ')}</p>
                  </div>
                  <Badge color={isOverdue ? 'red' : 'yellow'}>
                    {isOverdue ? `${m.days_overdue}d overdue` : 'Expiring'}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <a href={generateWhatsAppLink(m.phone, message)} target="_blank" rel="noopener" className="flex-1 bg-bg-card border border-border text-text-primary px-4 py-2.5 text-sm rounded-xl font-semibold text-center active:scale-[0.97] transition-transform">
                    📱 WhatsApp
                  </a>
                  <a href={`tel:+91${m.phone}`} className="flex-1 bg-bg-card border border-border text-text-primary px-4 py-2.5 text-sm rounded-xl font-semibold text-center active:scale-[0.97] transition-transform">
                    📞 Call
                  </a>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
