import { useState, useEffect, useMemo } from 'react'
import { getMyGym } from '@/api/gym'
import { getLeads, updateLead } from '@/api/leads'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { formatPhone } from '@/utils/helpers'
import { generateWhatsAppLink } from '@/utils/whatsapp'

interface Lead {
  _id: string
  name: string
  phone: string
  source?: string
  goal?: string
  status: 'new' | 'contacted' | 'converted' | 'lost'
  created_at: string
}

type FilterType = 'all' | 'new' | 'contacted' | 'converted'

const STATUS_COLORS: Record<string, 'blue' | 'yellow' | 'green' | 'red'> = {
  new: 'blue',
  contacted: 'yellow',
  converted: 'green',
  lost: 'red',
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [gymId, setGymId] = useState('')
  const [gymName, setGymName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')

  useEffect(() => {
    async function load() {
      try {
        const gym = await getMyGym()
        setGymId(gym._id)
        setGymName(gym.name || '')
        const data = await getLeads(gym._id)
        setLeads(data)
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load leads')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return leads
    return leads.filter((l) => l.status === activeFilter)
  }, [leads, activeFilter])

  const counts = useMemo(() => {
    const c = { all: leads.length, new: 0, contacted: 0, converted: 0 }
    for (const l of leads) {
      if (l.status === 'new') c.new++
      else if (l.status === 'contacted') c.contacted++
      else if (l.status === 'converted') c.converted++
    }
    return c
  }, [leads])

  async function handleMarkContacted(lead: Lead) {
    // Optimistic update
    const prev = [...leads]
    setLeads(leads.map((l) => (l._id === lead._id ? { ...l, status: 'contacted' as const } : l)))

    try {
      await updateLead(gymId, lead._id, { status: 'contacted' })
    } catch {
      // Revert on error
      setLeads(prev)
    }
  }

  function getWhatsAppLink(lead: Lead): string {
    const message = `Hi ${lead.name}! Welcome to ${gymName}. We'd love to have you as a member. Come visit us for a free trial!`
    return generateWhatsAppLink(lead.phone, message)
  }

  if (loading) return <LoadingSpinner text="Loading leads..." />

  if (error) {
    return (
      <div className="p-4">
        <Card variant="alert-danger">
          <p className="text-sm text-status-red">{error}</p>
        </Card>
      </div>
    )
  }

  const FILTERS: { value: FilterType; label: string; count: number }[] = [
    { value: 'all', label: 'All', count: counts.all },
    { value: 'new', label: 'New', count: counts.new },
    { value: 'contacted', label: 'Contacted', count: counts.contacted },
    { value: 'converted', label: 'Converted', count: counts.converted },
  ]

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <h2 className="text-lg font-bold text-text-primary">Leads</h2>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setActiveFilter(f.value)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              activeFilter === f.value
                ? 'bg-accent-primary text-white'
                : 'bg-bg-card border border-border-light text-text-secondary'
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card>
          <p className="text-center text-text-muted text-sm py-6">
            No leads found
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((lead) => (
            <Card key={lead._id}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-text-primary truncate">
                      {lead.name}
                    </p>
                    <Badge color={STATUS_COLORS[lead.status] || 'gray'}>
                      {lead.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    {formatPhone(lead.phone)}
                    {lead.source && (
                      <> · {lead.source.replace(/_/g, ' ')}</>
                    )}
                    {lead.goal && (
                      <> · {lead.goal.replace(/_/g, ' ')}</>
                    )}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 mt-3">
                <a
                  href={getWhatsAppLink(lead)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button variant="success" fullWidth size="sm">
                    WhatsApp
                  </Button>
                </a>
                <a href={`tel:+91${lead.phone}`} className="flex-1">
                  <Button variant="secondary" fullWidth size="sm">
                    Call
                  </Button>
                </a>
                {lead.status === 'new' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMarkContacted(lead)}
                    className="flex-1"
                  >
                    Mark Contacted
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
