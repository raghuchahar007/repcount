import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { verifyOtp } from '@/api/auth'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'

export default function VerifyOtp() {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  const phone = (location.state as any)?.phone

  useEffect(() => {
    if (!phone) {
      navigate('/login', { replace: true })
      return
    }
    inputsRef.current[0]?.focus()
  }, [phone, navigate])

  if (!phone) return null

  async function handleVerify(otpString: string) {
    setError('')
    setLoading(true)
    try {
      const data = await verifyOtp(phone, otpString)
      login(data.accessToken, data.user)
      if (data.user.role === 'owner') {
        navigate('/owner', { replace: true })
      } else {
        navigate('/m', { replace: true })
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid OTP')
      setOtp(['', '', '', '', '', ''])
      inputsRef.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  function handleChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)
    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus()
    }
    const fullOtp = newOtp.join('')
    if (fullOtp.length === 6) {
      handleVerify(fullOtp)
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      const newOtp = pasted.split('')
      setOtp(newOtp)
      handleVerify(pasted)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text-primary mb-2">Enter OTP</h1>
          <p className="text-text-secondary text-sm">
            Sent to {phone.replace('+91', '')}
          </p>
        </div>

        <div className="flex justify-center gap-3 mb-6">
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputsRef.current[i] = el }}
              type="tel"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={i === 0 ? handlePaste : undefined}
              className="w-12 h-14 bg-bg-card border border-border-light rounded-xl text-center text-xl font-bold text-text-primary focus:outline-none focus:border-accent-orange transition-colors"
              disabled={loading}
            />
          ))}
        </div>

        {error && <p className="text-status-red text-sm text-center mb-4">{error}</p>}

        <Button
          fullWidth
          loading={loading}
          disabled={otp.join('').length < 6}
          onClick={() => handleVerify(otp.join(''))}
        >
          Verify
        </Button>

        <button
          className="w-full text-center text-text-muted text-sm mt-4 py-2"
          onClick={() => navigate('/login')}
          disabled={loading}
        >
          Change phone number
        </button>
      </div>
    </div>
  )
}
