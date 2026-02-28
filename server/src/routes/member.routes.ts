import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { Member } from '../models/Member'
import { Membership } from '../models/Membership'
import { Attendance } from '../models/Attendance'
import { requireAuth } from '../middleware/auth'
import { requireOwner } from '../middleware/roleGuard'
import { requireGymAccess } from '../middleware/gymAccess'
import { validate } from '../middleware/validate'

const router = Router({ mergeParams: true })

const PLAN_DAYS: Record<string, number> = {
  monthly: 30,
  quarterly: 90,
  half_yearly: 180,
  yearly: 365,
}

function todayIST(): Date {
  const now = new Date()
  const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000))
  ist.setUTCHours(0, 0, 0, 0)
  return ist
}

const createMemberSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be 10 digits'),
  goal: z.enum(['weight_loss', 'muscle_gain', 'general']).optional(),
  diet_pref: z.enum(['veg', 'nonveg', 'egg']).optional(),
  budget: z.enum(['low', 'medium', 'high']).optional(),
  dob: z.string().optional(),
  emergency_phone: z.string().optional(),
  notes: z.string().optional(),
  plan_type: z.enum(['monthly', 'quarterly', 'half_yearly', 'yearly']).optional(),
  amount: z.number().positive().optional(),
  payment_method: z.enum(['cash', 'upi', 'card', 'online']).optional(),
})

const updateMemberSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().regex(/^\d{10}$/).optional(),
  goal: z.enum(['weight_loss', 'muscle_gain', 'general']).optional(),
  diet_pref: z.enum(['veg', 'nonveg', 'egg']).optional(),
  budget: z.enum(['low', 'medium', 'high']).optional(),
  dob: z.string().nullable().optional(),
  emergency_phone: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
})

// GET /api/gym/:gymId/members — List members
router.get(
  '/',
  requireAuth, requireOwner, requireGymAccess,
  async (req: Request, res: Response) => {
    try {
      const { gymId } = req.params
      const members = await Member.find({ gym: gymId }).sort({ created_at: -1 }).lean()

      // Batch-fetch latest membership for each member
      const memberIds = members.map((m) => m._id)
      const memberships = await Membership.find({
        member: { $in: memberIds },
        gym: gymId,
      })
        .sort({ expiry_date: -1 })
        .lean()

      const membershipMap = new Map<string, typeof memberships[number]>()
      for (const ms of memberships) {
        const key = ms.member.toString()
        if (!membershipMap.has(key)) {
          membershipMap.set(key, ms)
        }
      }

      const result = members.map((m) => ({
        ...m,
        latest_membership: membershipMap.get(m._id.toString()) || null,
      }))

      res.json(result)
    } catch (err: any) {
      console.error('list members error:', err)
      res.status(500).json({ error: 'Failed to fetch members' })
    }
  },
)

// POST /api/gym/:gymId/members — Add member
router.post(
  '/',
  requireAuth, requireOwner, requireGymAccess, validate(createMemberSchema),
  async (req: Request, res: Response) => {
    try {
      const { gymId } = req.params
      const { plan_type, amount, payment_method, ...memberData } = req.body

      const member = await Member.create({ ...memberData, gym: gymId })

      // If payment info provided, create initial membership
      if (plan_type && amount) {
        const startDate = todayIST()
        const expiryDate = new Date(startDate.getTime() + PLAN_DAYS[plan_type] * 24 * 60 * 60 * 1000)

        await Membership.create({
          member: member._id,
          gym: gymId,
          plan_type,
          amount,
          payment_method: payment_method || 'cash',
          start_date: startDate,
          expiry_date: expiryDate,
          status: 'active',
          paid_at: new Date(),
        })
      }

      res.status(201).json(member)
    } catch (err: any) {
      if (err.code === 11000) {
        return res.status(409).json({ error: 'Member with this phone already exists in this gym' })
      }
      console.error('create member error:', err)
      res.status(500).json({ error: 'Failed to add member' })
    }
  },
)

// GET /api/gym/:gymId/members/:memberId — Get single member
router.get(
  '/:memberId',
  requireAuth, requireOwner, requireGymAccess,
  async (req: Request, res: Response) => {
    try {
      const { gymId, memberId } = req.params
      const member = await Member.findOne({ _id: memberId, gym: gymId }).lean()
      if (!member) {
        return res.status(404).json({ error: 'Member not found' })
      }

      // Fetch memberships and attendance for this member
      const [memberships, attendance] = await Promise.all([
        Membership.find({ member: memberId, gym: gymId })
          .sort({ expiry_date: -1 })
          .lean(),
        Attendance.find({ member: memberId, gym: gymId })
          .sort({ checked_in_at: -1 })
          .limit(10)
          .lean(),
      ])

      res.json({ member, memberships, attendance })
    } catch (err: any) {
      console.error('get member error:', err)
      res.status(500).json({ error: 'Failed to fetch member' })
    }
  },
)

// PUT /api/gym/:gymId/members/:memberId — Update member
router.put(
  '/:memberId',
  requireAuth, requireOwner, requireGymAccess, validate(updateMemberSchema),
  async (req: Request, res: Response) => {
    try {
      const { gymId, memberId } = req.params
      const member = await Member.findOneAndUpdate(
        { _id: memberId, gym: gymId },
        req.body,
        { new: true, runValidators: true },
      )
      if (!member) {
        return res.status(404).json({ error: 'Member not found' })
      }
      res.json(member)
    } catch (err: any) {
      if (err.code === 11000) {
        return res.status(409).json({ error: 'Phone number already taken by another member' })
      }
      console.error('update member error:', err)
      res.status(500).json({ error: 'Failed to update member' })
    }
  },
)

export default router
