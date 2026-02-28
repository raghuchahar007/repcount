import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { Gym } from '../models/Gym'
import { User } from '../models/User'
import { requireAuth } from '../middleware/auth'
import { requireOwner } from '../middleware/roleGuard'
import { requireGymAccess } from '../middleware/gymAccess'
import { validate } from '../middleware/validate'

const router = Router()

const createGymSchema = z.object({
  name: z.string().min(1, 'Gym name is required').max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  city: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  description: z.string().optional(),
  opening_time: z.string().optional(),
  closing_time: z.string().optional(),
  upi_id: z.string().optional(),
  pricing: z.record(z.number()).optional(),
  facilities: z.array(z.string()).optional(),
})

const updateGymSchema = createGymSchema.partial()

// POST /api/gym — Create gym
router.post('/', requireAuth, requireOwner, validate(createGymSchema), async (req: Request, res: Response) => {
  try {
    // Check if owner already has a gym
    const existing = await Gym.findOne({ owner: req.user!.userId })
    if (existing) {
      return res.status(409).json({ error: 'You already have a gym' })
    }

    const gym = await Gym.create({ ...req.body, owner: req.user!.userId })

    // Update user role to owner (in case it wasn't already)
    await User.findByIdAndUpdate(req.user!.userId, { role: 'owner' })

    res.status(201).json(gym)
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Slug already taken' })
    }
    console.error('create gym error:', err)
    res.status(500).json({ error: 'Failed to create gym' })
  }
})

// GET /api/gym/mine — Get current owner's gym
router.get('/mine', requireAuth, requireOwner, async (req: Request, res: Response) => {
  try {
    const gym = await Gym.findOne({ owner: req.user!.userId })
    if (!gym) {
      return res.status(404).json({ error: 'Gym not found' })
    }
    res.json(gym)
  } catch (err: any) {
    console.error('get my gym error:', err)
    res.status(500).json({ error: 'Failed to fetch gym' })
  }
})

// GET /api/gym/:gymId — Get gym by ID
router.get('/:gymId', requireAuth, requireOwner, requireGymAccess, async (req: Request, res: Response) => {
  res.json(req.gym)
})

// PUT /api/gym/:gymId — Update gym
router.put('/:gymId', requireAuth, requireOwner, requireGymAccess, validate(updateGymSchema), async (req: Request, res: Response) => {
  try {
    const gym = await Gym.findByIdAndUpdate(req.params.gymId, req.body, { new: true, runValidators: true })
    res.json(gym)
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Slug already taken' })
    }
    console.error('update gym error:', err)
    res.status(500).json({ error: 'Failed to update gym' })
  }
})

export default router
