import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { Lead } from '../models/Lead'
import { requireAuth } from '../middleware/auth'
import { requireOwner } from '../middleware/roleGuard'
import { requireGymAccess } from '../middleware/gymAccess'
import { validate } from '../middleware/validate'

const router = Router({ mergeParams: true })

const createLeadSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be 10 digits'),
  goal: z.string().optional(),
  source: z.enum(['gym_page', 'referral', 'trial', 'walkin', 'other']),
  notes: z.string().optional(),
})

const updateLeadSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be 10 digits').optional(),
  goal: z.string().optional(),
  source: z.enum(['gym_page', 'referral', 'trial', 'walkin', 'other']).optional(),
  status: z.enum(['new', 'contacted', 'converted', 'lost']).optional(),
  notes: z.string().optional(),
})

// GET /api/gym/:gymId/leads — List leads
router.get(
  '/',
  requireAuth, requireOwner, requireGymAccess,
  async (req: Request, res: Response) => {
    try {
      const { gymId } = req.params
      const filter: Record<string, any> = { gym: gymId }

      if (req.query.status && typeof req.query.status === 'string') {
        filter.status = req.query.status
      }

      const leads = await Lead.find(filter).sort({ created_at: -1 }).lean()
      res.json(leads)
    } catch (err: any) {
      console.error('list leads error:', err)
      res.status(500).json({ error: 'Failed to fetch leads' })
    }
  },
)

// POST /api/gym/:gymId/leads — Create lead
router.post(
  '/',
  requireAuth, requireOwner, requireGymAccess, validate(createLeadSchema),
  async (req: Request, res: Response) => {
    try {
      const { gymId } = req.params
      const lead = await Lead.create({ ...req.body, gym: gymId })
      res.status(201).json(lead)
    } catch (err: any) {
      console.error('create lead error:', err)
      res.status(500).json({ error: 'Failed to create lead' })
    }
  },
)

// PUT /api/gym/:gymId/leads/:leadId — Update lead
router.put(
  '/:leadId',
  requireAuth, requireOwner, requireGymAccess, validate(updateLeadSchema),
  async (req: Request, res: Response) => {
    try {
      const { leadId, gymId } = req.params
      const lead = await Lead.findOneAndUpdate(
        { _id: leadId, gym: gymId },
        req.body,
        { new: true, runValidators: true },
      )
      if (!lead) {
        return res.status(404).json({ error: 'Lead not found' })
      }
      res.json(lead)
    } catch (err: any) {
      console.error('update lead error:', err)
      res.status(500).json({ error: 'Failed to update lead' })
    }
  },
)

export default router
