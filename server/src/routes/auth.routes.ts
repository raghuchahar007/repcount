import { Router, Request, Response } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { User } from '../models/User'
import { Member } from '../models/Member'
import { sendOtp as sendOtpService, verifyOtp as verifyOtpService } from '../services/otp.service'
import { signAccessToken, signRefreshToken, verifyRefreshToken, verifyAccessToken } from '../services/token.service'
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

// POST /api/auth/register
const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().regex(/^\+91\d{10}$/).optional(),
})

router.post('/register', validate(registerSchema), async (req: Request, res: Response) => {
  try {
    const { name, email, password, phone } = req.body
    const existingEmail = await User.findOne({ email: email.toLowerCase() })
    if (existingEmail) {
      return res.status(409).json({ error: 'Email already registered' })
    }
    if (phone) {
      const existingPhone = await User.findOne({ phone })
      if (existingPhone) {
        return res.status(409).json({ error: 'Phone number already registered' })
      }
    }
    const password_hash = await bcrypt.hash(password, 10)
    const user = await User.create({
      email: email.toLowerCase(),
      password_hash,
      full_name: name,
      phone: phone || null,
    })
    const tokenPayload = {
      userId: user._id.toString(),
      phone: user.phone || '',
      role: user.role || '',
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
    res.status(201).json({
      isNewUser: true,
      accessToken,
      user: {
        id: user._id,
        phone: user.phone,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
      },
    })
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Email or phone already registered' })
    }
    console.error('register error:', err)
    res.status(500).json({ error: 'Registration failed' })
  }
})

// POST /api/auth/login
const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
})

router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }
    const isMatch = await bcrypt.compare(password, user.password_hash)
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }
    if (user.role === 'member' && user.phone) {
      const tenDigitPhone = user.phone.replace('+91', '')
      await Member.updateOne(
        { phone: tenDigitPhone, user: null },
        { $set: { user: user._id } }
      )
    }
    const tokenPayload = {
      userId: user._id.toString(),
      phone: user.phone || '',
      role: user.role || '',
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
        email: user.email,
        role: user.role,
        full_name: user.full_name,
      },
    })
  } catch (err: any) {
    console.error('login error:', err)
    res.status(500).json({ error: 'Login failed' })
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

    let isNewUser = false
    let user = await User.findOne({ phone })
    if (!user) {
      user = await User.create({ phone })
      isNewUser = true
    }

    // Auto-link member record if exists
    if (user.role === 'member' && user.phone) {
      const tenDigitPhone = user.phone.replace('+91', '')
      await Member.updateOne(
        { phone: tenDigitPhone, user: null },
        { $set: { user: user._id } }
      )
    }

    const tokenPayload = {
      userId: user._id.toString(),
      phone: user.phone || '',
      role: user.role || '',
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
      isNewUser,
      accessToken,
      user: {
        id: user._id,
        phone: user.phone,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
      },
    })
  } catch (err: any) {
    console.error('verify-otp error:', err)
    res.status(500).json({ error: 'Failed to verify OTP' })
  }
})

// PUT /api/auth/set-role
const setRoleSchema = z.object({
  role: z.enum(['owner', 'member']),
})

router.put('/set-role', validate(setRoleSchema), async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access token required' })
  }
  try {
    const payload = verifyAccessToken(authHeader.split(' ')[1])
    const user = await User.findById(payload.userId)
    if (!user) return res.status(404).json({ error: 'User not found' })

    if (user.role) {
      return res.status(400).json({ error: 'Role already set' })
    }

    const newRole: string = req.body.role
    user.role = newRole as 'owner' | 'member'
    await user.save()

    const tokenPayload = { userId: user._id.toString(), phone: user.phone || '', role: newRole }
    const accessToken = signAccessToken(tokenPayload)
    const refreshToken = signRefreshToken(tokenPayload)

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    })

    // If member, auto-link existing Member record
    if (newRole === 'member' && user.phone) {
      const tenDigitPhone = user.phone.replace('+91', '')
      await Member.updateOne(
        { phone: tenDigitPhone, user: null },
        { $set: { user: user._id } }
      )
    }

    res.json({
      accessToken,
      user: { id: user._id, phone: user.phone, email: user.email, role: newRole, full_name: user.full_name },
    })
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
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
      phone: user.phone || '',
      role: user.role || '',
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
        email: user.email,
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
