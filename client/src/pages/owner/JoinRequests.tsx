import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyGym } from '@/api/gym'
import { getLeads, approveJoinRequest, rejectJoinRequest } from '@/api/owner'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { formatDate } from '@/utils/helpers'

interface JoinRequest {
  _id: string
  name: string
  phone: string
  goal?: string
  created_at: string
  status: string
}

export default function JoinRequestsPage() {
  const [requests, setRequests] = useState<JoinRequest[]>([])
  const [gymId, setGymId] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const gym = await getMyGym()
      setGymId(gym._id)
      const leads = await getLeads(gym._id, { source: 'app_request', status: 'new' })
      setRequests(leads)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(leadId: string) {
    setActionLoading(leadId)
    try {
      await approveJoinRequest(gymId, leadId)
      setRequests((prev) => prev.filter((r) => r._id !== leadId))
    } catch {
      // ignore
    } finally {
      setActionLoading(null)
    }
  }

  async function handleReject(leadId: string) {
    setActionLoading(leadId)
    try {
      await rejectJoinRequest(gymId, leadId)
      setRequests((prev) => prev.filter((r) => r._id !== leadId))
    } catch {
      // ignore
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) return <LoadingSpinner text="Loading requests..." />

  return (
    <div className="p-4 space-y-4">
      <button onClick={() => navigate(-1)} className="text-text-secondary text-sm">
        &larr; Back
      </button>
      <h2 className="text-lg font-bold text-text-primary">Join Requests</h2>

      {requests.length === 0 ? (
        <Card>
          <p className="text-text-muted text-sm text-center py-4">No pending requests</p>
        </Card>
      ) : (
        requests.map((req) => (
          <Card key={req._id}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-text-primary">{req.name}</p>
                <p className="text-text-secondary text-xs">{req.phone}</p>
                <p className="text-text-muted text-xs mt-0.5">{formatDate(req.created_at)}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleApprove(req._id)}
                  loading={actionLoading === req._id}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleReject(req._id)}
                  loading={actionLoading === req._id}
                >
                  Reject
                </Button>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  )
}
