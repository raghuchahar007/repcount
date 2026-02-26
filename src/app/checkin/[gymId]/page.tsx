'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function CheckInPage() {
  const { gymId } = useParams()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'already' | 'error' | 'not_member' | 'not_logged_in'>('loading')
  const [gymName, setGymName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { handleCheckIn() }, [])

  async function handleCheckIn() {
    try {
      const supabase = createClient()

      // Get gym info
      const { data: gym } = await supabase.from('gyms').select('name').eq('id', gymId).single()
      if (gym) setGymName(gym.name)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setStatus('not_logged_in')
        return
      }

      // Find member record for this gym
      const { data: member } = await supabase
        .from('members')
        .select('id')
        .eq('user_id', user.id)
        .eq('gym_id', gymId)
        .eq('is_active', true)
        .single()

      if (!member) {
        setStatus('not_member')
        return
      }

      // Try to check in
      const { error: insertError } = await supabase.from('attendance').insert({
        member_id: member.id,
        gym_id: gymId as string,
      })

      if (insertError) {
        if (insertError.message.includes('duplicate')) {
          setStatus('already')
        } else {
          throw insertError
        }
      } else {
        setStatus('success')
      }
    } catch (err: any) {
      setError(err.message || 'Check-in failed')
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-accent-orange">RepCount</h1>
          {gymName && <p className="text-text-secondary text-sm mt-1">{gymName}</p>}
        </div>

        {status === 'loading' && (
          <Card className="p-8 text-center">
            <div className="animate-spin h-10 w-10 border-2 border-accent-orange border-t-transparent rounded-full mx-auto" />
            <p className="text-text-secondary text-sm mt-4">Checking you in...</p>
          </Card>
        )}

        {status === 'success' && (
          <Card className="p-8 text-center border-status-green/30 bg-status-green/5">
            <span className="text-5xl">✅</span>
            <p className="text-xl font-bold text-status-green mt-3">Checked In!</p>
            <p className="text-text-secondary text-sm mt-1">Keep pushing, champ! 💪</p>
            <Button onClick={() => router.push('/m')} className="mt-4">
              Go to App
            </Button>
          </Card>
        )}

        {status === 'already' && (
          <Card className="p-8 text-center">
            <span className="text-5xl">👋</span>
            <p className="text-lg font-bold text-text-primary mt-3">Already checked in today!</p>
            <p className="text-text-secondary text-sm mt-1">Great to see you again</p>
            <Button onClick={() => router.push('/m')} className="mt-4">
              Go to App
            </Button>
          </Card>
        )}

        {status === 'not_logged_in' && (
          <Card className="p-8 text-center">
            <span className="text-5xl">🔑</span>
            <p className="text-lg font-bold text-text-primary mt-3">Login Required</p>
            <p className="text-text-secondary text-sm mt-1">Please login to check in</p>
            <Button onClick={() => router.push(`/login?redirect=/checkin/${gymId}`)} className="mt-4">
              Login
            </Button>
          </Card>
        )}

        {status === 'not_member' && (
          <Card className="p-8 text-center">
            <span className="text-5xl">🏋️</span>
            <p className="text-lg font-bold text-text-primary mt-3">Not a Member</p>
            <p className="text-text-secondary text-sm mt-1">
              You're not registered at {gymName || 'this gym'}. Ask the owner to add you.
            </p>
            <Button variant="outline" onClick={() => router.push('/m')} className="mt-4">
              Go Home
            </Button>
          </Card>
        )}

        {status === 'error' && (
          <Card className="p-8 text-center border-status-red/30">
            <span className="text-5xl">❌</span>
            <p className="text-lg font-bold text-status-red mt-3">Check-in Failed</p>
            <p className="text-text-secondary text-sm mt-1">{error}</p>
            <Button onClick={handleCheckIn} className="mt-4">Retry</Button>
          </Card>
        )}
      </div>
    </div>
  )
}
