import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { Member } from '../models/Member'
import { Membership } from '../models/Membership'
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

const recordPaymentSchema = z.object({
  member_id: z.string().min(1, 'Member ID is required'),
  plan_type: z.enum(['monthly', 'quarterly', 'half_yearly', 'yearly']),
  amount: z.number().positive('Amount must be positive'),
  payment_method: z.enum(['cash', 'upi', 'card', 'online']),
})

// POST /api/gym/:gymId/memberships — Record payment
router.post(
  '/',
  requireAuth, requireOwner, requireGymAccess, validate(recordPaymentSchema),
  async (req: Request, res: Response) => {
    try {
      const { gymId } = req.params
      const { member_id, plan_type, amount, payment_method } = req.body

      // Verify member belongs to this gym
      const member = await Member.findOne({ _id: member_id, gym: gymId })
      if (!member) {
        return res.status(404).json({ error: 'Member not found in this gym' })
      }

      // Expire existing active memberships
      await Membership.updateMany(
        { member: member_id, gym: gymId, status: 'active' },
        { status: 'expired' },
      )

      // Create new membership with IST dates
      const startDate = todayIST()
      const expiryDate = new Date(startDate.getTime() + PLAN_DAYS[plan_type] * 24 * 60 * 60 * 1000)

      const membership = await Membership.create({
        member: member_id,
        gym: gymId,
        plan_type,
        amount,
        payment_method,
        start_date: startDate,
        expiry_date: expiryDate,
        status: 'active',
        paid_at: new Date(),
      })

      // Mark member as active
      await Member.findByIdAndUpdate(member_id, { is_active: true })

      res.status(201).json(membership)
    } catch (err: any) {
      console.error('record payment error:', err)
      res.status(500).json({ error: 'Failed to record payment' })
    }
  },
)

// GET /api/gym/:gymId/memberships/renewals — Members needing renewal
router.get(
  '/renewals',
  requireAuth, requireOwner, requireGymAccess,
  async (req: Request, res: Response) => {
    try {
      const { gymId } = req.params
      const today = todayIST()
      const sevenDays = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

      const memberships = await Membership.find({
        gym: gymId,
        status: 'active',
        expiry_date: { $lte: sevenDays },
      })
        .populate('member', 'name phone')
        .sort({ expiry_date: 1 })
        .lean()

      // Deduplicate by member — keep the one with latest expiry
      const memberMap = new Map<string, typeof memberships[number]>()
      for (const m of memberships) {
        const memberRef = m.member as any
        const memberId: string | undefined = memberRef && typeof memberRef === 'object' && '_id' in memberRef
          ? String(memberRef._id)
          : memberRef ? String(memberRef) : undefined
        if (!memberId) continue
        const existing = memberMap.get(memberId)
        if (!existing || new Date(m.expiry_date) > new Date(existing.expiry_date)) {
          memberMap.set(memberId, m)
        }
      }

      const renewals = Array.from(memberMap.values()).sort(
        (a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime(),
      )

      res.json(renewals)
    } catch (err: any) {
      console.error('renewals error:', err)
      res.status(500).json({ error: 'Failed to fetch renewals' })
    }
  },
)

export default router
