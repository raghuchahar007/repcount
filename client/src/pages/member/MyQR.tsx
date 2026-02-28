import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { getProfile } from '@/api/me'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

export default function MyQRPage() {
  const [memberId, setMemberId] = useState('')
  const [memberName, setMemberName] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    getProfile()
      .then((data) => {
        setMemberId(data.member._id)
        setMemberName(data.member.name)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner text="Loading QR..." />

  return (
    <div className="p-4 space-y-4">
      <button
        onClick={() => navigate(-1)}
        className="text-text-secondary text-sm hover:text-text-primary"
      >
        ← Back
      </button>

      <div className="text-center pt-4">
        <h1 className="text-2xl font-bold text-text-primary">Your QR Code</h1>
        <p className="text-text-secondary text-sm mt-1">Show this to the gym to check in</p>
      </div>

      <Card>
        <div className="flex flex-col items-center py-6">
          <div className="bg-white p-4 rounded-2xl">
            <QRCodeSVG
              value={memberId}
              size={220}
              level="M"
            />
          </div>
          <p className="text-text-primary font-bold text-lg mt-4">{memberName}</p>
          <p className="text-text-muted text-xs mt-1">Member ID: {memberId.slice(-6)}</p>
        </div>
      </Card>
    </div>
  )
}
