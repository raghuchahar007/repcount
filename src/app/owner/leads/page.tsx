'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { generateWhatsAppLink } from '@/lib/whatsapp'
import type { Lead } from '@/lib/types'

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [gymName, setGymName] = useState('')

  useEffect(() => { loadLeads() }, [])

  async function loadLeads() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: gym } = await supabase
      .from('gyms').select('id, name').eq('owner_id', user.id).single()
    if (!gym) return
    setGymName(gym.name)

    const { data } = await supabase
      .from('leads')
      .select('*')
      .eq('gym_id', gym.id)
      .order('created_at', { ascending: false })

    setLeads(data || [])
    setLoading(false)
  }

  async function updateLeadStatus(leadId: string, status: string) {
    const supabase = createClient()
    await supabase.from('leads').update({ status }).eq('id', leadId)
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: status as Lead['status'] } : l))
  }

  const filteredLeads = leads.filter(l => filter === 'all' || l.status === filter)

  const statusColors: Record<string, 'blue' | 'yellow' | 'green' | 'red'> = {
    new: 'blue', contacted: 'yellow', converted: 'green', lost: 'red',
  }

  const filters = [
    { key: 'all', label: `All (${leads.length})` },
    { key: 'new', label: `New (${leads.filter(l => l.status === 'new').length})` },
    { key: 'contacted', label: 'Contacted' },
    { key: 'converted', label: 'Converted' },
  ]

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold text-text-primary">Leads</h2>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
              filter === f.key ? 'bg-accent-orange text-white' : 'bg-bg-card text-text-secondary border border-border'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-bg-card rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="space-y-2">
          {filteredLeads.map(lead => (
            <Card key={lead.id} className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-sm font-medium text-text-primary">{lead.name}</p>
                  <p className="text-xs text-text-muted">{lead.phone} · {lead.source.replace('_', ' ')}</p>
                </div>
                <Badge color={statusColors[lead.status] || 'gray'}>{lead.status}</Badge>
              </div>
              {lead.goal && <p className="text-xs text-text-secondary mb-2">Goal: {lead.goal}</p>}
              <div className="flex gap-2">
                <a
                  href={generateWhatsAppLink(lead.phone, `Hi ${lead.name}! 🏋️ Welcome to ${gymName}. We'd love to have you as a member. Come visit us for a free trial!`)}
                  target="_blank" rel="noopener" className="flex-1"
                >
                  <Button variant="outline" size="sm" fullWidth>📱 WhatsApp</Button>
                </a>
                <a href={`tel:+91${lead.phone}`} className="flex-1">
                  <Button variant="outline" size="sm" fullWidth>📞 Call</Button>
                </a>
                {lead.status === 'new' && (
                  <Button variant="secondary" size="sm" onClick={() => updateLeadStatus(lead.id, 'contacted')}>
                    Mark Contacted
                  </Button>
                )}
              </div>
            </Card>
          ))}
          {filteredLeads.length === 0 && (
            <Card className="p-8 text-center">
              <p className="text-text-muted text-sm">No leads yet</p>
              <p className="text-text-muted text-xs mt-1">Share your gym page to start getting leads</p>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
