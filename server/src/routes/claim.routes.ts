import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { GymClaim } from '../models/GymClaim'
import { Gym } from '../models/Gym'
import { User } from '../models/User'
import { validate } from '../middleware/validate'
import { requireAuth } from '../middleware/auth'

const router = Router()

const claimSchema = z.object({
  claimant_name: z.string().min(1),
  claimant_phone: z.string().regex(/^\d{10}$/, 'Enter 10-digit phone'),
  claimant_email: z.string().email(),
  reason: z.string().min(10, 'Please describe your claim in at least 10 characters'),
})

// POST /api/public/gym/:gymId/claim
router.post('/:gymId/claim', validate(claimSchema), async (req: Request, res: Response) => {
  try {
    const gym = await Gym.findById(req.params.gymId)
    if (!gym) return res.status(404).json({ error: 'Gym not found' })

    await GymClaim.create({
      gym: req.params.gymId,
      ...req.body,
    })
    res.status(201).json({ success: true, message: 'Claim submitted. We will review it within 2-3 business days.' })
  } catch (err) {
    console.error('submit claim error:', err)
    res.status(500).json({ error: 'Failed to submit claim' })
  }
})

// GET /api/admin/claims — list pending claims (admin only)
router.get('/admin/claims', requireAuth, async (req: Request, res: Response) => {
  try {
    const status = (req.query.status as string) || 'pending'
    const claims = await GymClaim.find({ status })
      .populate('gym', 'name city slug')
      .sort({ created_at: -1 })
      .lean()
    res.json({ data: claims })
  } catch (err) {
    console.error('list claims error:', err)
    res.status(500).json({ error: 'Failed to fetch claims' })
  }
})

// POST /api/admin/claims/:claimId/transfer — transfer gym ownership
router.post('/admin/claims/:claimId/transfer', requireAuth, async (req: Request, res: Response) => {
  try {
    const { new_owner_email } = req.body
    const claim = await GymClaim.findById(req.params.claimId)
    if (!claim) return res.status(404).json({ error: 'Claim not found' })

    const newOwner = await User.findOne({ email: new_owner_email })
    if (!newOwner) return res.status(404).json({ error: 'User not found with that email' })

    await Gym.findByIdAndUpdate(claim.gym, { owner: newOwner._id })
    await GymClaim.findByIdAndUpdate(req.params.claimId, { status: 'approved' })

    res.json({ success: true })
  } catch (err) {
    console.error('transfer ownership error:', err)
    res.status(500).json({ error: 'Failed to transfer ownership' })
  }
})

// PATCH /api/admin/claims/:claimId — reject claim
router.patch('/admin/claims/:claimId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { status } = req.body
    await GymClaim.findByIdAndUpdate(req.params.claimId, { status })
    res.json({ success: true })
  } catch (err) {
    console.error('update claim error:', err)
    res.status(500).json({ error: 'Failed to update claim' })
  }
})

export default router
