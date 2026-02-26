'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
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

      const today = todayIST()
      const sevenDays = new Date(Date.now() + 7 * 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

      // Get members whose latest membership is expiring or expired
      const { data } = await supabase
        .from('members')
        .select('id, name, phone, memberships(expiry_date, amount, plan_type)')
        .eq('gym_id', gym.id)
        .eq('is_active', true)

      const renewalList: RenewalMember[] = []
      ;(data || []).forEach((m: any) => {
        const latest = m.memberships?.sort((a: any, b: any) =>
          new Date(b.expiry_date).getTime() - new Date(a.expiry_date).getTime()
        )?.[0]

        if (latest && latest.expiry_date <= sevenDays) {
          renewalList.push({
            id: m.id,
            name: m.name,
            phone: m.phone,
            expiry_date: latest.expiry_date,
            amount: latest.amount,
            plan_type: latest.plan_type,
            days_overdue: Math.max(0, daysSince(latest.expiry_date)),
          })
        }
      })

      renewalList.sort((a, b) => a.days_overdue - b.days_overdue)
      setMembers(renewalList)
    } catch {
      // silently handle - page shows empty/fallback state
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-4 space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-bg-card rounded-xl animate-pulse" />)}</div>

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
                    <p className="text-[10px] text-text-muted">{m.phone} · {formatCurrency(m.amount)} · {m.plan_type.replace('_', ' ')}</p>
                  </div>
                  <Badge color={isOverdue ? 'red' : 'yellow'}>
                    {isOverdue ? `${m.days_overdue}d overdue` : 'Expiring'}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <a href={generateWhatsAppLink(m.phone, message)} target="_blank" rel="noopener" className="flex-1">
                    <Button variant="outline" size="sm" fullWidth>📱 WhatsApp</Button>
                  </a>
                  <a href={`tel:+91${m.phone}`} className="flex-1">
                    <Button variant="outline" size="sm" fullWidth>📞 Call</Button>
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
