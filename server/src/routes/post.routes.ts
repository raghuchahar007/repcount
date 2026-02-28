import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { GymPost } from '../models/GymPost'
import { requireAuth } from '../middleware/auth'
import { requireOwner } from '../middleware/roleGuard'
import { requireGymAccess } from '../middleware/gymAccess'
import { validate } from '../middleware/validate'

const router = Router({ mergeParams: true })

const createPostSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  body: z.string().optional(),
  post_type: z.enum(['challenge', 'event', 'offer', 'announcement']),
  image_url: z.string().url().optional(),
  starts_at: z.string().optional(),
  ends_at: z.string().optional(),
  is_published: z.boolean().default(true),
})

const updatePostSchema = z.object({
  title: z.string().min(1).optional(),
  body: z.string().optional(),
  post_type: z.enum(['challenge', 'event', 'offer', 'announcement']).optional(),
  image_url: z.string().url().nullable().optional(),
  starts_at: z.string().nullable().optional(),
  ends_at: z.string().nullable().optional(),
  is_published: z.boolean().optional(),
})

// GET /api/gym/:gymId/posts — List posts
router.get(
  '/',
  requireAuth, requireOwner, requireGymAccess,
  async (req: Request, res: Response) => {
    try {
      const { gymId } = req.params
      const posts = await GymPost.find({ gym: gymId })
        .sort({ created_at: -1 })
        .lean()
      res.json(posts)
    } catch (err: any) {
      console.error('list posts error:', err)
      res.status(500).json({ error: 'Failed to fetch posts' })
    }
  },
)

// POST /api/gym/:gymId/posts — Create post
router.post(
  '/',
  requireAuth, requireOwner, requireGymAccess, validate(createPostSchema),
  async (req: Request, res: Response) => {
    try {
      const { gymId } = req.params
      const post = await GymPost.create({
        ...req.body,
        gym: gymId,
        author: req.user!.userId,
      })
      res.status(201).json(post)
    } catch (err: any) {
      console.error('create post error:', err)
      res.status(500).json({ error: 'Failed to create post' })
    }
  },
)

// PUT /api/gym/:gymId/posts/:postId — Update post
router.put(
  '/:postId',
  requireAuth, requireOwner, requireGymAccess, validate(updatePostSchema),
  async (req: Request, res: Response) => {
    try {
      const { postId, gymId } = req.params
      const post = await GymPost.findOneAndUpdate(
        { _id: postId, gym: gymId },
        req.body,
        { new: true, runValidators: true },
      )
      if (!post) {
        return res.status(404).json({ error: 'Post not found' })
      }
      res.json(post)
    } catch (err: any) {
      console.error('update post error:', err)
      res.status(500).json({ error: 'Failed to update post' })
    }
  },
)

// DELETE /api/gym/:gymId/posts/:postId — Delete post
router.delete(
  '/:postId',
  requireAuth, requireOwner, requireGymAccess,
  async (req: Request, res: Response) => {
    try {
      const { postId, gymId } = req.params
      const post = await GymPost.findOneAndDelete({ _id: postId, gym: gymId })
      if (!post) {
        return res.status(404).json({ error: 'Post not found' })
      }
      res.json({ success: true })
    } catch (err: any) {
      console.error('delete post error:', err)
      res.status(500).json({ error: 'Failed to delete post' })
    }
  },
)

export default router
