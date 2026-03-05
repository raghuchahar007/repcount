import { useState, useEffect } from 'react'
import api from '@/api/axios'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatDate } from '@/utils/helpers'

interface Claim {
  _id: string
  gym: { _id: string; name: string; city?: string; slug: string }
  claimant_name: string
  claimant_phone: string
  claimant_email: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export default function ClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)
  const [transferEmail, setTransferEmail] = useState<Record<string, string>>({})
  const [processing, setProcessing] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchClaims()
  }, [])

  async function fetchClaims() {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/claims?status=pending')
      setClaims(data.data || [])
    } catch {
      setError('Failed to load claims')
    } finally {
      setLoading(false)
    }
  }

  async function handleTransfer(claimId: string) {
    const email = transferEmail[claimId]?.trim()
    if (!email) return
    setProcessing(claimId)
    try {
      await api.post(`/admin/claims/${claimId}/transfer`, { new_owner_email: email })
      setClaims(prev => prev.filter(c => c._id !== claimId))
    } catch (err: any) {
      setError(err.response?.data?.error || 'Transfer failed')
    } finally {
      setProcessing(null)
    }
  }

  async function handleReject(claimId: string) {
    setProcessing(claimId)
    try {
      await api.patch(`/admin/claims/${claimId}`, { status: 'rejected' })
      setClaims(prev => prev.filter(c => c._id !== claimId))
    } catch {
      setError('Reject failed')
    } finally {
      setProcessing(null)
    }
  }

  if (loading) return <div className="p-4 text-text-secondary">Loading claims...</div>

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-text-primary">Gym Claims</h1>
      {error && <p className="text-status-red text-sm">{error}</p>}

      {claims.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-text-secondary">No pending claims</p>
        </Card>
      ) : claims.map(claim => (
        <Card key={claim._id} className="p-4 space-y-3">
          <div>
            <p className="font-semibold text-text-primary">{claim.gym?.name}</p>
            {claim.gym?.city && <p className="text-xs text-text-secondary capitalize">{claim.gym.city}</p>}
            <p className="text-xs text-text-muted mt-0.5">{formatDate(claim.created_at)}</p>
          </div>
          <div className="text-sm space-y-1">
            <p className="text-text-primary"><span className="text-text-secondary">Claimant: </span>{claim.claimant_name}</p>
            <p className="text-text-primary"><span className="text-text-secondary">Phone: </span>{claim.claimant_phone}</p>
            <p className="text-text-primary"><span className="text-text-secondary">Email: </span>{claim.claimant_email}</p>
            <p className="text-text-primary"><span className="text-text-secondary">Reason: </span>{claim.reason}</p>
          </div>
          <div className="space-y-2 pt-2 border-t border-border-light">
            <Input
              label="Transfer to email"
              placeholder="owner@example.com"
              type="email"
              value={transferEmail[claim._id] || ''}
              onChange={e => setTransferEmail(prev => ({ ...prev, [claim._id]: e.target.value }))}
            />
            <div className="flex gap-2">
              <Button
                fullWidth
                loading={processing === claim._id}
                disabled={!transferEmail[claim._id]?.trim()}
                onClick={() => handleTransfer(claim._id)}
              >
                Transfer Ownership
              </Button>
              <Button
                variant="ghost"
                loading={processing === claim._id}
                onClick={() => handleReject(claim._id)}
              >
                Reject
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
