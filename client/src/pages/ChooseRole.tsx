import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { setRole } from '@/api/auth'
import { Button } from '@/components/ui/Button'

export default function ChooseRole() {
  const [selected, setSelected] = useState<'owner' | 'member' | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleContinue() {
    if (!selected) return
    setLoading(true)
    setError('')
    try {
      const data = await setRole(selected)
      login(data.accessToken, data.user)
      navigate(selected === 'owner' ? '/owner/settings' : '/m', { replace: true })
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to set role')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-primary mb-2">Welcome to GymRep</h1>
          <p className="text-text-secondary text-sm">How will you use the app?</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => setSelected('owner')}
            className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${
              selected === 'owner'
                ? 'border-accent-primary bg-accent-primary/5'
                : 'border-border-light bg-bg-card'
            }`}
          >
            <span className="text-3xl block mb-2">🏋️</span>
            <h3 className="text-lg font-bold text-text-primary">I own a gym</h3>
            <p className="text-text-secondary text-sm mt-1">
              Manage members, payments, attendance, and grow your gym
            </p>
          </button>

          <button
            onClick={() => setSelected('member')}
            className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${
              selected === 'member'
                ? 'border-accent-primary bg-accent-primary/5'
                : 'border-border-light bg-bg-card'
            }`}
          >
            <span className="text-3xl block mb-2">💪</span>
            <h3 className="text-lg font-bold text-text-primary">I'm a gym member</h3>
            <p className="text-text-secondary text-sm mt-1">
              Track workouts, diet, attendance, and stay motivated
            </p>
          </button>
        </div>

        {error && <p className="text-status-red text-sm text-center">{error}</p>}

        <Button
          fullWidth
          loading={loading}
          disabled={!selected}
          onClick={handleContinue}
        >
          Continue
        </Button>
      </div>
    </div>
  )
}
