import { useState, useEffect, useMemo } from 'react'
import { getMyGym } from '@/api/gym'
import { getLeads, updateLead } from '@/api/leads'
import { convertLead } from '@/api/owner'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SkeletonList } from '@/components/shared/Skeleton'
import ErrorCard from '@/components/shared/ErrorCard'
import Pagination from '@/components/shared/Pagination'
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
type SourceFilter = 'all' | 'app_request' | 'referral' | 'owner_invite' | 'website'

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
  const [activeSource, setActiveSource] = useState<SourceFilter>('all')
  const [converting, setConverting] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  async function fetchLeads(p: number = page) {
    setLoading(true)
    setError('')
    try {
      const gym = await getMyGym()
      setGymId(gym._id)
      setGymName(gym.name || '')
      const params: Record<string, any> = { page: p }
      if (activeFilter !== 'all') params.status = activeFilter
      if (activeSource !== 'all') params.source = activeSource
      const result = await getLeads(gym._id, params)
      setLeads(result.data)
      setTotalPages(result.totalPages)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load leads')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeads(page)
  }, [page, activeFilter, activeSource])

  // Filtering is now done server-side; leads already contains the filtered result
  const filtered = leads

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

  async function handleConvert(lead: Lead) {
    setConverting(lead._id)
    const prev = [...leads]
    setLeads(leads.map((l) => (l._id === lead._id ? { ...l, status: 'converted' as const } : l)))

    try {
      await convertLead(gymId, lead._id)
    } catch {
      setLeads(prev)
    } finally {
      setConverting(null)
    }
  }

  function getWhatsAppLink(lead: Lead): string {
    const message = `Hi ${lead.name}! Welcome to ${gymName}. We'd love to have you as a member. Come visit us for a free trial!`
    return generateWhatsAppLink(lead.phone, message)
  }

  if (loading) return <SkeletonList />

  if (error) {
    return (
      <div className="p-4">
        <ErrorCard message={error} onRetry={fetchLeads} />
      </div>
    )
  }

  const FILTERS: { value: FilterType; label: string; count: number }[] = [
    { value: 'all', label: 'All', count: counts.all },
    { value: 'new', label: 'New', count: counts.new },
    { value: 'contacted', label: 'Contacted', count: counts.contacted },
    { value: 'converted', label: 'Converted', count: counts.converted },
  ]

  const SOURCE_FILTERS: { value: SourceFilter; label: string }[] = [
    { value: 'all', label: 'All Sources' },
    { value: 'app_request', label: 'App Request' },
    { value: 'referral', label: 'Referral' },
    { value: 'owner_invite', label: 'Owner Invite' },
    { value: 'website', label: 'Website' },
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
            onClick={() => { setActiveFilter(f.value); setPage(1) }}
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

      {/* Source filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {SOURCE_FILTERS.map((sf) => (
          <button
            key={sf.value}
            onClick={() => { setActiveSource(sf.value); setPage(1) }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              activeSource === sf.value
                ? 'bg-accent-primary text-white'
                : 'bg-bg-card border border-border-light text-text-secondary'
            }`}
          >
            {sf.label}
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
                {(lead.status === 'new' || lead.status === 'contacted') && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleConvert(lead)}
                    disabled={converting === lead._id}
                    className="flex-1"
                  >
                    {converting === lead._id ? 'Converting...' : 'Convert'}
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
