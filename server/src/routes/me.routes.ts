import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { Types } from 'mongoose'
import { requireAuth } from '../middleware/auth'
import { requireMember } from '../middleware/roleGuard'
import { requireMemberContext } from '../middleware/memberContext'
import { validate } from '../middleware/validate'
import { User } from '../models/User'
import { Lead } from '../models/Lead'
import { Member } from '../models/Member'
import { Membership } from '../models/Membership'
import { Attendance } from '../models/Attendance'
import { Progress } from '../models/Progress'
import { GymPost } from '../models/GymPost'
import { Gym } from '../models/Gym'

const router = Router()

// --- Routes that need auth but NOT member context ---

const selfCheckInSchema = z.object({
  gymId: z.string().min(1, 'Gym ID required'),
})

// POST /check-in - member self check-in via gym QR
router.post('/check-in', requireAuth, validate(selfCheckInSchema), async (req: Request, res: Response) => {
  try {
    const { gymId } = req.body
    const member = await Member.findOne({ user: req.user!.userId, gym: gymId })
    if (!member) {
      return res.status(404).json({ error: 'You are not a member of this gym' })
    }

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
    const [y, m, d] = today.split('-').map(Number)
    const checkInDate = new Date(Date.UTC(y, m - 1, d))

    const attendance = await Attendance.create({
      member: member._id,
      gym: gymId,
      check_in_date: checkInDate,
      checked_in_at: new Date(),
    })

    res.status(201).json({ message: 'Checked in!', attendance })
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Already checked in today' })
    }
    console.error('Self check-in error:', err)
    res.status(500).json({ error: 'Failed to check in' })
  }
})

// GET /gyms - list all gyms where member has records
router.get('/gyms', requireAuth, async (req: Request, res: Response) => {
  try {
    const members = await Member.find({ user: req.user!.userId })
      .populate('gym', 'name slug logo_url city')
      .lean()
    const gyms = members.map(m => ({
      memberId: m._id,
      gym: m.gym,
      joinDate: m.join_date,
    }))
    res.json(gyms)
  } catch (err) {
    console.error('My gyms error:', err)
    res.status(500).json({ error: 'Failed to load gyms' })
  }
})

const joinGymSchema = z.object({
  slug: z.string().min(1, 'Gym slug required'),
})

// POST /join-gym - member joins a gym by slug
router.post('/join-gym', requireAuth, validate(joinGymSchema), async (req: Request, res: Response) => {
  try {
    const gym = await Gym.findOne({ slug: req.body.slug }).lean()
    if (!gym) return res.status(404).json({ error: 'Gym not found' })

    const phone = req.user!.phone.replace('+91', '')
    const existing = await Member.findOne({ gym: gym._id, phone })
    if (existing) {
      if (!existing.user) {
        existing.user = new Types.ObjectId(req.user!.userId)
        await existing.save()
      }
      return res.json({ message: 'Already a member', memberId: existing._id })
    }

    const user = await User.findById(req.user!.userId)
    const member = await Member.create({
      user: req.user!.userId,
      gym: gym._id,
      name: user?.full_name || phone,
      phone,
      goal: 'general',
      diet_pref: 'veg',
      budget: 'medium',
    })

    res.status(201).json({ message: 'Joined gym', memberId: member._id })
  } catch (err: any) {
    if (err.code === 11000) return res.status(409).json({ error: 'Already a member of this gym' })
    console.error('Join gym error:', err)
    res.status(500).json({ error: 'Failed to join gym' })
  }
})

// GET /join-status — Check pending join requests
router.get('/join-status', requireAuth, async (req: Request, res: Response) => {
  try {
    const leads = await Lead.find({
      user: req.user!.userId,
      source: 'app_request',
      status: { $in: ['new', 'contacted'] },
    }).populate('gym', 'name slug').lean()
    res.json(leads)
  } catch (err: any) {
    console.error('join status error:', err)
    res.status(500).json({ error: 'Failed to check join status' })
  }
})

// --- Routes that need full member context ---
router.use(requireAuth, requireMember, requireMemberContext)

// --- Helpers ---

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

function calculateStreak(attendanceDates: Date[]): number {
  if (attendanceDates.length === 0) return 0

  const dateSet = new Set(attendanceDates.map((d) => formatDateString(d)))

  const today = startOfDay(new Date())
  const todayStr = formatDateString(today)

  // Start from today if checked in, otherwise yesterday
  let current = new Date(today)
  if (!dateSet.has(todayStr)) {
    current.setDate(current.getDate() - 1)
  }

  let streak = 0
  while (dateSet.has(formatDateString(current))) {
    streak++
    current.setDate(current.getDate() - 1)
  }

  return streak
}

function privacyName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length <= 1) return parts[0] || ''
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

// --- Schemas ---

const updateProfileSchema = z.object({
  goal: z.enum(['weight_loss', 'muscle_gain', 'general']).optional(),
  diet_pref: z.enum(['veg', 'nonveg', 'egg']).optional(),
}).strict()

// --- Routes ---

// GET /home - member home data
router.get('/home', async (req: Request, res: Response) => {
  try {
    const member = req.member!
    const memberId = member._id
    const gymId = member.gym

    // Parallel queries
    const [gym, latestMembership, attendanceRecords] = await Promise.all([
      Gym.findById(gymId).select('name logo_url').lean(),
      Membership.findOne({ member: memberId })
        .sort({ expiry_date: -1 })
        .lean(),
      Attendance.find({ member: memberId, gym: gymId })
        .sort({ check_in_date: -1 })
        .lean(),
    ])

    // Streak
    const streak = calculateStreak(attendanceRecords.map((a) => a.check_in_date))

    // 30-day attendance grid
    const today = startOfDay(new Date())
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)

    const attendanceDateSet = new Set(
      attendanceRecords.map((a) => formatDateString(a.check_in_date))
    )

    const attendanceGrid: { date: string; present: boolean }[] = []
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo)
      d.setDate(d.getDate() + i)
      const dateStr = formatDateString(d)
      attendanceGrid.push({ date: dateStr, present: attendanceDateSet.has(dateStr) })
    }

    res.json({
      member: {
        _id: member._id,
        name: member.name,
        goal: member.goal,
        diet_pref: member.diet_pref,
        badges: member.badges,
      },
      gym: gym ? { name: gym.name, logo_url: gym.logo_url } : null,
      membership: latestMembership
        ? {
            plan_type: latestMembership.plan_type,
            start_date: latestMembership.start_date,
            expiry_date: latestMembership.expiry_date,
            status: latestMembership.status,
          }
        : null,
      streak,
      attendanceGrid,
      badges: member.badges,
    })
  } catch (err) {
    console.error('GET /home error:', err)
    return res.status(500).json({ error: 'Failed to load home data' })
  }
})

// GET /profile - full profile with memberships
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const member = req.member!
    const [memberships, gym] = await Promise.all([
      Membership.find({ member: member._id })
        .sort({ expiry_date: -1 })
        .lean(),
      Gym.findById(member.gym).select('name slug').lean(),
    ])

    res.json({
      member: {
        _id: member._id,
        name: member.name,
        phone: member.phone,
        goal: member.goal,
        diet_pref: member.diet_pref,
        budget: member.budget,
        join_date: member.join_date,
        dob: member.dob,
        emergency_phone: member.emergency_phone,
        badges: member.badges,
        is_active: member.is_active,
      },
      gym: gym ? { name: gym.name, slug: gym.slug } : null,
      memberships,
    })
  } catch (err) {
    console.error('GET /profile error:', err)
    return res.status(500).json({ error: 'Failed to load profile' })
  }
})

// PUT /profile - update goal, diet_pref
router.put('/profile', validate(updateProfileSchema), async (req: Request, res: Response) => {
  try {
    const member = req.member!
    const updates: Record<string, unknown> = {}

    if (req.body.goal !== undefined) updates.goal = req.body.goal
    if (req.body.diet_pref !== undefined) updates.diet_pref = req.body.diet_pref

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' })
    }

    const updated = await Member.findByIdAndUpdate(member._id, updates, { new: true }).lean()
    res.json({ member: updated })
  } catch (err) {
    console.error('PUT /profile error:', err)
    return res.status(500).json({ error: 'Failed to update profile' })
  }
})

// GET /feed - gym posts with participantCount and hasJoined
router.get('/feed', async (req: Request, res: Response) => {
  try {
    const member = req.member!
    const gymId = member.gym

    const posts = await GymPost.find({ gym: gymId, is_published: true })
      .sort({ created_at: -1 })
      .lean()

    const feed = posts.map((post) => ({
      _id: post._id,
      title: post.title,
      body: post.body,
      post_type: post.post_type,
      image_url: post.image_url,
      starts_at: post.starts_at,
      ends_at: post.ends_at,
      created_at: post.created_at,
      participantCount: post.participants ? post.participants.length : 0,
      hasJoined: post.participants
        ? post.participants.some((p: Types.ObjectId) => p.equals(member._id))
        : false,
    }))

    res.json({ posts: feed })
  } catch (err) {
    console.error('GET /feed error:', err)
    return res.status(500).json({ error: 'Failed to load feed' })
  }
})

// POST /feed/:postId/join - join a challenge
router.post('/feed/:postId/join', async (req: Request, res: Response) => {
  try {
    const member = req.member!
    const postId = req.params.postId as string

    if (!Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ error: 'Invalid post ID' })
    }

    const post = await GymPost.findOne({
      _id: postId,
      gym: member.gym,
      is_published: true,
    })

    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }

    // Check if already joined
    const alreadyJoined = post.participants.some((p) => p.equals(member._id))
    if (alreadyJoined) {
      return res.status(409).json({ error: 'Already joined this post' })
    }

    post.participants.push(member._id)
    await post.save()

    res.json({
      message: 'Joined successfully',
      participantCount: post.participants.length,
    })
  } catch (err) {
    console.error('POST /feed/:postId/join error:', err)
    return res.status(500).json({ error: 'Failed to join post' })
  }
})

// GET /leaderboard - top 10 by monthly attendance
router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const member = req.member!
    const gymId = member.gym

    // Current month range
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    const leaderboard = await Attendance.aggregate([
      {
        $match: {
          gym: new Types.ObjectId(gymId.toString()),
          check_in_date: { $gte: monthStart, $lt: monthEnd },
        },
      },
      {
        $group: {
          _id: '$member',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'members',
          localField: '_id',
          foreignField: '_id',
          as: 'member',
        },
      },
      { $unwind: '$member' },
    ])

    const entries = leaderboard.map((entry, index) => ({
      rank: index + 1,
      name: privacyName(entry.member.name),
      count: entry.count,
      isMe: entry._id.equals(member._id),
    }))

    res.json({ leaderboard: entries })
  } catch (err) {
    console.error('GET /leaderboard error:', err)
    return res.status(500).json({ error: 'Failed to load leaderboard' })
  }
})

export default router
