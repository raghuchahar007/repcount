import { useState, useEffect } from 'react'
import { QrScanner } from '@/components/shared/QrScanner'
import { checkInMember } from '@/api/members'
import { getMyGym } from '@/api/gym'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function ScanCheckinPage() {
  const [gymId, setGymId] = useState('')
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<{ text: string; type: 'success' | 'warning' | 'error' } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getMyGym().then(gym => setGymId(gym._id)).catch(() => {})
  }, [])

  async function handleScan(memberId: string) {
    if (!gymId || loading) return
    setLoading(true)
    setScanning(false)
    try {
      await checkInMember(gymId, memberId)
      setResult({ text: 'Checked in!', type: 'success' })
    } catch (err: any) {
      if (err.response?.status === 409) {
        setResult({ text: 'Already checked in today', type: 'warning' })
      } else {
        setResult({ text: err.response?.data?.error || 'Check-in failed', type: 'error' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="text-center pt-2">
        <h1 className="text-2xl font-bold text-text-primary">Scan Check-In</h1>
        <p className="text-text-secondary text-sm mt-1">Scan member's QR to mark attendance</p>
      </div>

      {result && (
        <Card>
          <p className={`text-sm text-center font-semibold ${
            result.type === 'success' ? 'text-status-green' :
            result.type === 'warning' ? 'text-status-yellow' :
            'text-status-red'
          }`}>{result.text}</p>
        </Card>
      )}

      {scanning ? (
        <Card>
          <QrScanner
            onScan={handleScan}
            onError={(err) => { setResult({ text: err, type: 'error' }); setScanning(false) }}
          />
          <button
            onClick={() => setScanning(false)}
            className="w-full text-center text-text-muted text-sm mt-3 py-2"
          >
            Cancel
          </button>
        </Card>
      ) : (
        <div className="text-center pt-8 space-y-3">
          <Button onClick={() => { setScanning(true); setResult(null) }} disabled={!gymId}>
            {result ? 'Scan Another' : 'Open Scanner'}
          </Button>
        </div>
      )}
    </div>
  )
}
