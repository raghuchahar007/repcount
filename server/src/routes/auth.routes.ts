import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { User } from '../models/User'
import { Member } from '../models/Member'
import { sendOtp as sendOtpService, verifyOtp as verifyOtpService } from '../services/otp.service'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../services/token.service'
import { validate } from '../middleware/validate'

const router = Router()

const sendOtpSchema = z.object({
  phone: z.string().regex(/^\+91\d{10}$/, 'Phone must be +91 followed by 10 digits'),
})

const verifyOtpSchema = z.object({
  phone: z.string().regex(/^\+91\d{10}$/, 'Phone must be +91 followed by 10 digits'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
})

// POST /api/auth/send-otp
router.post('/send-otp', validate(sendOtpSchema), async (req: Request, res: Response) => {
  try {
    const { phone } = req.body
    const result = await sendOtpService(phone)
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to send OTP' })
  }
})

// POST /api/auth/verify-otp
router.post('/verify-otp', validate(verifyOtpSchema), async (req: Request, res: Response) => {
  try {
    const { phone, otp } = req.body
    const isValid = await verifyOtpService(phone, otp)
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid or expired OTP' })
    }

    let user = await User.findOne({ phone })
    if (!user) {
      user = await User.create({ phone, role: 'member' })
    }

    // Auto-link member record if exists
    if (user.role === 'member') {
      const tenDigitPhone = phone.replace('+91', '')
      await Member.updateOne(
        { phone: tenDigitPhone, user: null },
        { $set: { user: user._id } }
      )
    }

    const tokenPayload = {
      userId: user._id.toString(),
      phone: user.phone,
      role: user.role,
    }

    const accessToken = signAccessToken(tokenPayload)
    const refreshToken = signRefreshToken(tokenPayload)

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    })

    res.json({
      accessToken,
      user: {
        id: user._id,
        phone: user.phone,
        role: user.role,
        full_name: user.full_name,
      },
    })
  } catch (err: any) {
    console.error('verify-otp error:', err)
    res.status(500).json({ error: 'Failed to verify OTP' })
  }
})

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.refreshToken
    if (!token) {
      return res.status(401).json({ error: 'Refresh token required' })
    }

    const payload = verifyRefreshToken(token)
    const user = await User.findById(payload.userId)
    if (!user) {
      return res.status(401).json({ error: 'User not found' })
    }

    const tokenPayload = {
      userId: user._id.toString(),
      phone: user.phone,
      role: user.role,
    }

    const accessToken = signAccessToken(tokenPayload)
    const newRefreshToken = signRefreshToken(tokenPayload)

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    })

    res.json({
      accessToken,
      user: {
        id: user._id,
        phone: user.phone,
        role: user.role,
        full_name: user.full_name,
      },
    })
  } catch {
    return res.status(401).json({ error: 'Invalid refresh token' })
  }
})

// POST /api/auth/logout
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('refreshToken', { path: '/' })
  res.json({ success: true })
})

export default router
