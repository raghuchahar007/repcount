import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { Gym } from '../models/Gym'
import { GymPost } from '../models/GymPost'
import { Lead } from '../models/Lead'
import { User } from '../models/User'
import { validate } from '../middleware/validate'
import { requireAuth } from '../middleware/auth'

const router = Router()

// GET /api/public/gyms — List all gyms (for discovery)
router.get(
  '/gyms',
  async (req: Request, res: Response) => {
    try {
      const { q } = req.query
      const filter: Record<string, any> = {}
      if (q && typeof q === 'string' && q.trim()) {
        filter.$or = [
          { name: { $regex: q.trim(), $options: 'i' } },
          { city: { $regex: q.trim(), $options: 'i' } },
        ]
      }
      const gyms = await Gym.find(filter)
        .select('name slug city address facilities pricing')
        .sort({ name: 1 })
        .limit(50)
        .lean()
      res.json(gyms)
    } catch (err: any) {
      console.error('list public gyms error:', err)
      res.status(500).json({ error: 'Failed to fetch gyms' })
    }
  },
)

const leadFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be 10 digits'),
  goal: z.enum(['weight_loss', 'muscle_gain', 'general_fitness', 'sports', 'other']).optional(),
})

// GET /api/public/gym/:slug — Public gym info
router.get(
  '/gym/:slug',
  async (req: Request, res: Response) => {
    try {
      const gym = await Gym.findOne({ slug: req.params.slug })
        .select('-owner -__v')
        .lean()
      if (!gym) {
        return res.status(404).json({ error: 'Gym not found' })
      }
      res.json(gym)
    } catch (err: any) {
      console.error('public gym info error:', err)
      res.status(500).json({ error: 'Failed to fetch gym info' })
    }
  },
)

// GET /api/public/gym/:slug/posts — Public posts for the gym
router.get(
  '/gym/:slug/posts',
  async (req: Request, res: Response) => {
    try {
      const gym = await Gym.findOne({ slug: req.params.slug }).select('_id').lean()
      if (!gym) {
        return res.status(404).json({ error: 'Gym not found' })
      }
      const posts = await GymPost.find({ gym: gym._id, is_published: true })
        .select('-participants -__v')
        .sort({ created_at: -1 })
        .limit(20)
        .lean()
      res.json(posts)
    } catch (err: any) {
      console.error('public posts error:', err)
      res.status(500).json({ error: 'Failed to fetch posts' })
    }
  },
)

// POST /api/public/gym/:slug/leads — Submit lead form
router.post(
  '/gym/:slug/leads',
  validate(leadFormSchema),
  async (req: Request, res: Response) => {
    try {
      const gym = await Gym.findOne({ slug: req.params.slug }).select('_id').lean()
      if (!gym) {
        return res.status(404).json({ error: 'Gym not found' })
      }
      await Lead.create({
        ...req.body,
        gym: gym._id,
        source: 'gym_page',
      })
      res.status(201).json({ message: 'Lead submitted successfully' })
    } catch (err: any) {
      if (err.code === 11000) {
        return res.status(409).json({ error: 'You have already submitted a lead for this gym' })
      }
      console.error('submit lead error:', err)
      res.status(500).json({ error: 'Failed to submit lead' })
    }
  },
)

// POST /api/public/gym/:slug/request-join — Member requests to join gym
router.post(
  '/gym/:slug/request-join',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const gym = await Gym.findOne({ slug: req.params.slug }).select('_id').lean()
      if (!gym) {
        return res.status(404).json({ error: 'Gym not found' })
      }
      const user = await User.findById(req.user!.userId).lean()
      if (!user) {
        return res.status(401).json({ error: 'User not found' })
      }

      const existing = await Lead.findOne({ gym: gym._id, user: req.user!.userId })
      if (existing) {
        return res.status(409).json({ error: 'Already requested', status: existing.status })
      }

      await Lead.create({
        gym: gym._id,
        user: req.user!.userId,
        name: user.full_name || user.phone,
        phone: user.phone.replace('+91', ''),
        source: 'app_request',
        status: 'new',
      })
      res.status(201).json({ message: 'Join request sent' })
    } catch (err: any) {
      if (err.code === 11000) {
        return res.status(409).json({ error: 'Already requested' })
      }
      console.error('request join error:', err)
      res.status(500).json({ error: 'Failed to send request' })
    }
  },
)

export default router
