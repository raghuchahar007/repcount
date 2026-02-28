# M2: Owner Core Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build all owner-facing backend API routes and frontend pages — gym setup, member management, payments, renewals, leads, posts, and the dashboard with live stats.

**Architecture:** Express routes under `/api/gym` protected by `requireAuth + requireOwner + requireGymAccess` middleware chain. React pages under `/owner/*` with an OwnerLayout (header + BottomNav). Each page fetches from the API via Axios. All dates use IST helpers.

**Tech Stack:** Express 4, Mongoose, Zod validation, React 18, React Router v6, Tailwind CSS v4, Axios

---

### Task 1: Gym Routes (create + get + update)

**Files:**
- Create: `server/src/routes/gym.routes.ts`
- Modify: `server/src/app.ts` (register route)

**Context:** Owner needs to create their gym on first login (Settings page), then read/update it. The `requireGymAccess` middleware (already built in M1) handles ownership verification for `:gymId` routes. But we also need a "get my gym" route that finds the gym by `owner` field (for pages that don't know the gymId yet).

**Step 1: Create gym routes file**

Create `server/src/routes/gym.routes.ts`:

```typescript
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

// POST /api/gym — create gym (one per owner)
router.post('/', requireAuth, requireOwner, validate(createGymSchema), async (req: Request, res: Response) => {
  try {
    const existing = await Gym.findOne({ owner: req.user!.userId })
    if (existing) {
      return res.status(409).json({ error: 'You already have a gym. Update it instead.' })
    }

    const gym = await Gym.create({
      ...req.body,
      owner: req.user!.userId,
    })

    // Promote user role to owner if currently member
    await User.findByIdAndUpdate(req.user!.userId, { role: 'owner' })

    res.status(201).json(gym)
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'A gym with this slug already exists' })
    }
    console.error('create gym error:', err)
    res.status(500).json({ error: 'Failed to create gym' })
  }
})

// GET /api/gym/mine — get current owner's gym
router.get('/mine', requireAuth, requireOwner, async (req: Request, res: Response) => {
  try {
    const gym = await Gym.findOne({ owner: req.user!.userId })
    if (!gym) {
      return res.status(404).json({ error: 'No gym found. Create one first.' })
    }
    res.json(gym)
  } catch {
    res.status(500).json({ error: 'Failed to fetch gym' })
  }
})

// GET /api/gym/:gymId — get gym by ID
router.get('/:gymId', requireAuth, requireOwner, requireGymAccess, (req: Request, res: Response) => {
  res.json(req.gym)
})

// PUT /api/gym/:gymId — update gym
router.put('/:gymId', requireAuth, requireOwner, requireGymAccess, validate(updateGymSchema), async (req: Request, res: Response) => {
  try {
    const gym = await Gym.findByIdAndUpdate(req.params.gymId, req.body, { new: true, runValidators: true })
    res.json(gym)
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'A gym with this slug already exists' })
    }
    res.status(500).json({ error: 'Failed to update gym' })
  }
})

export default router
```

**Step 2: Register in app.ts**

In `server/src/app.ts`, add:
```typescript
import gymRoutes from './routes/gym.routes'
// ... after authRoutes line:
app.use('/api/gym', gymRoutes)
```

**Step 3: Verify TypeScript compiles**

Run: `cd /Users/raghuchahar/Desktop/repcount/server && npx tsc --noEmit`
Expected: 0 errors

**Step 4: Commit**

```bash
cd /Users/raghuchahar/Desktop/repcount
git add server/src/routes/gym.routes.ts server/src/app.ts
git commit -m "feat(server): gym CRUD routes (create, get mine, get by id, update)"
```

---

### Task 2: Member Routes (list, add, get, update)

**Files:**
- Create: `server/src/routes/member.routes.ts`
- Modify: `server/src/app.ts` (register route)

**Context:** All member routes are scoped under `/api/gym/:gymId/members` and use the full middleware chain. When adding a member, also create their first membership. Use IST dates for membership start/expiry. Detect duplicate phone per gym via Mongoose error code 11000.

**Step 1: Create member routes**

Create `server/src/routes/member.routes.ts`:

```typescript
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

const addMemberSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be 10 digits'),
  goal: z.enum(['weight_loss', 'muscle_gain', 'general']).default('general'),
  diet_pref: z.enum(['veg', 'nonveg', 'egg']).default('veg'),
  budget: z.enum(['low', 'medium', 'high']).optional(),
  dob: z.string().optional(),
  emergency_phone: z.string().optional(),
  notes: z.string().optional(),
  // Optional first payment
  plan_type: z.enum(['monthly', 'quarterly', 'half_yearly', 'yearly']).optional(),
  amount: z.number().positive().optional(),
  payment_method: z.enum(['cash', 'upi', 'card', 'online']).optional(),
})

const updateMemberSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().regex(/^\d{10}$/).optional(),
  goal: z.enum(['weight_loss', 'muscle_gain', 'general']).optional(),
  diet_pref: z.enum(['veg', 'nonveg', 'egg']).optional(),
  budget: z.enum(['low', 'medium', 'high']).optional(),
  dob: z.string().optional(),
  emergency_phone: z.string().optional(),
  notes: z.string().optional(),
  is_active: z.boolean().optional(),
})

const PLAN_DAYS: Record<string, number> = {
  monthly: 30, quarterly: 90, half_yearly: 180, yearly: 365,
}

// GET /api/gym/:gymId/members
router.get('/', requireAuth, requireOwner, requireGymAccess, async (req: Request, res: Response) => {
  try {
    const { search, filter, limit = '200' } = req.query
    const gymId = req.params.gymId

    let query: any = { gym: gymId }

    if (filter === 'inactive') {
      query.is_active = false
    } else if (filter !== 'all') {
      query.is_active = true
    }

    let members = await Member.find(query)
      .sort({ created_at: -1 })
      .limit(Number(limit))
      .lean()

    // Attach latest membership to each member
    const memberIds = members.map(m => m._id)
    const memberships = await Membership.find({
      member: { $in: memberIds },
      gym: gymId,
    }).sort({ expiry_date: -1 }).lean()

    // Group by member, take latest
    const membershipMap: Record<string, any> = {}
    for (const ms of memberships) {
      const mid = ms.member.toString()
      if (!membershipMap[mid]) {
        membershipMap[mid] = ms
      }
    }

    const result = members.map(m => ({
      ...m,
      latest_membership: membershipMap[m._id.toString()] || null,
    }))

    // Search filter (client-side for simplicity)
    let filtered = result
    if (search && typeof search === 'string') {
      const q = search.toLowerCase()
      filtered = result.filter(m =>
        m.name.toLowerCase().includes(q) || m.phone.includes(q)
      )
    }

    res.json(filtered)
  } catch (err) {
    console.error('list members error:', err)
    res.status(500).json({ error: 'Failed to fetch members' })
  }
})

// POST /api/gym/:gymId/members
router.post('/', requireAuth, requireOwner, requireGymAccess, validate(addMemberSchema), async (req: Request, res: Response) => {
  try {
    const { name, phone, goal, diet_pref, budget, dob, emergency_phone, notes, plan_type, amount, payment_method } = req.body
    const gymId = req.params.gymId

    const member = await Member.create({
      gym: gymId,
      name,
      phone,
      goal,
      diet_pref,
      budget: budget || undefined,
      dob: dob || undefined,
      emergency_phone: emergency_phone || undefined,
      notes: notes || undefined,
    })

    // Create first membership if payment info provided
    let membership = null
    if (plan_type && amount) {
      const now = new Date()
      const startDate = new Date(now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }))
      const expiryDate = new Date(startDate)
      expiryDate.setDate(expiryDate.getDate() + (PLAN_DAYS[plan_type] || 30))

      membership = await Membership.create({
        member: member._id,
        gym: gymId,
        plan_type,
        amount,
        start_date: startDate,
        expiry_date: expiryDate,
        payment_method: payment_method || 'cash',
        status: 'active',
        paid_at: now,
      })
    }

    res.status(201).json({ member, membership })
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Member with this phone already exists in this gym' })
    }
    console.error('add member error:', err)
    res.status(500).json({ error: 'Failed to add member' })
  }
})

// GET /api/gym/:gymId/members/:memberId
router.get('/:memberId', requireAuth, requireOwner, requireGymAccess, async (req: Request, res: Response) => {
  try {
    const member = await Member.findOne({ _id: req.params.memberId, gym: req.params.gymId }).lean()
    if (!member) return res.status(404).json({ error: 'Member not found' })

    const [memberships, attendance] = await Promise.all([
      Membership.find({ member: member._id }).sort({ created_at: -1 }).lean(),
      Attendance.find({ member: member._id }).sort({ checked_in_at: -1 }).limit(10).lean(),
    ])

    res.json({ member, memberships, attendance })
  } catch {
    res.status(500).json({ error: 'Failed to fetch member' })
  }
})

// PUT /api/gym/:gymId/members/:memberId
router.put('/:memberId', requireAuth, requireOwner, requireGymAccess, validate(updateMemberSchema), async (req: Request, res: Response) => {
  try {
    const member = await Member.findOneAndUpdate(
      { _id: req.params.memberId, gym: req.params.gymId },
      req.body,
      { new: true, runValidators: true }
    )
    if (!member) return res.status(404).json({ error: 'Member not found' })
    res.json(member)
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Another member with this phone already exists' })
    }
    res.status(500).json({ error: 'Failed to update member' })
  }
})

export default router
```

**Step 2: Register in app.ts**

```typescript
import memberRoutes from './routes/member.routes'
// after gymRoutes:
app.use('/api/gym/:gymId/members', memberRoutes)
```

**Step 3: Verify TypeScript compiles**

Run: `cd /Users/raghuchahar/Desktop/repcount/server && npx tsc --noEmit`

**Step 4: Commit**

```bash
cd /Users/raghuchahar/Desktop/repcount
git add server/src/routes/member.routes.ts server/src/app.ts
git commit -m "feat(server): member CRUD routes (list with memberships, add with payment, get detail, update)"
```

---

### Task 3: Membership, Dashboard Stats & Remaining Routes

**Files:**
- Create: `server/src/routes/membership.routes.ts`
- Create: `server/src/routes/dashboard.routes.ts`
- Create: `server/src/routes/lead.routes.ts`
- Create: `server/src/routes/post.routes.ts`
- Modify: `server/src/app.ts` (register all)

**Context:** These are the remaining backend routes. Membership routes handle recording payments and renewals. Dashboard route returns aggregated stats in a single call. Lead and post routes are straightforward CRUD.

**Step 1: Create membership routes**

Create `server/src/routes/membership.routes.ts`:

```typescript
import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { Membership } from '../models/Membership'
import { Member } from '../models/Member'
import { requireAuth } from '../middleware/auth'
import { requireOwner } from '../middleware/roleGuard'
import { requireGymAccess } from '../middleware/gymAccess'
import { validate } from '../middleware/validate'

const router = Router({ mergeParams: true })

const PLAN_DAYS: Record<string, number> = {
  monthly: 30, quarterly: 90, half_yearly: 180, yearly: 365,
}

const recordPaymentSchema = z.object({
  member_id: z.string().min(1, 'Member ID required'),
  plan_type: z.enum(['monthly', 'quarterly', 'half_yearly', 'yearly']),
  amount: z.number().positive('Amount must be positive'),
  payment_method: z.enum(['cash', 'upi', 'card', 'online']).default('cash'),
})

// POST /api/gym/:gymId/memberships — record payment
router.post('/', requireAuth, requireOwner, requireGymAccess, validate(recordPaymentSchema), async (req: Request, res: Response) => {
  try {
    const { member_id, plan_type, amount, payment_method } = req.body
    const gymId = req.params.gymId

    // Verify member belongs to this gym
    const member = await Member.findOne({ _id: member_id, gym: gymId })
    if (!member) return res.status(404).json({ error: 'Member not found in this gym' })

    // Expire any existing active memberships
    await Membership.updateMany(
      { member: member_id, gym: gymId, status: 'active' },
      { status: 'expired' }
    )

    const now = new Date()
    const startDate = new Date(now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }))
    const expiryDate = new Date(startDate)
    expiryDate.setDate(expiryDate.getDate() + (PLAN_DAYS[plan_type] || 30))

    const membership = await Membership.create({
      member: member_id,
      gym: gymId,
      plan_type,
      amount,
      start_date: startDate,
      expiry_date: expiryDate,
      payment_method,
      status: 'active',
      paid_at: now,
    })

    // Ensure member is marked active
    await Member.findByIdAndUpdate(member_id, { is_active: true })

    res.status(201).json(membership)
  } catch (err) {
    console.error('record payment error:', err)
    res.status(500).json({ error: 'Failed to record payment' })
  }
})

// GET /api/gym/:gymId/memberships/renewals — members expiring within 7 days or already expired
router.get('/renewals', requireAuth, requireOwner, requireGymAccess, async (req: Request, res: Response) => {
  try {
    const gymId = req.params.gymId
    const today = new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }))
    const sevenDaysLater = new Date(today)
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)

    const memberships = await Membership.find({
      gym: gymId,
      status: 'active',
      expiry_date: { $lte: sevenDaysLater },
    })
      .populate('member', 'name phone')
      .sort({ expiry_date: 1 })
      .lean()

    // Deduplicate by member (keep latest expiry)
    const byMember: Record<string, any> = {}
    for (const ms of memberships) {
      const mid = (ms.member as any)._id.toString()
      if (!byMember[mid] || ms.expiry_date > byMember[mid].expiry_date) {
        byMember[mid] = {
          ...ms,
          member_name: (ms.member as any).name,
          member_phone: (ms.member as any).phone,
        }
      }
    }

    res.json(Object.values(byMember))
  } catch (err) {
    console.error('renewals error:', err)
    res.status(500).json({ error: 'Failed to fetch renewals' })
  }
})

export default router
```

**Step 2: Create dashboard routes**

Create `server/src/routes/dashboard.routes.ts`:

```typescript
import { Router, Request, Response } from 'express'
import { Member } from '../models/Member'
import { Membership } from '../models/Membership'
import { Attendance } from '../models/Attendance'
import { Lead } from '../models/Lead'
import { requireAuth } from '../middleware/auth'
import { requireOwner } from '../middleware/roleGuard'
import { requireGymAccess } from '../middleware/gymAccess'

const router = Router({ mergeParams: true })

// GET /api/gym/:gymId/dashboard
router.get('/', requireAuth, requireOwner, requireGymAccess, async (req: Request, res: Response) => {
  try {
    const gymId = req.params.gymId
    const now = new Date()
    const today = new Date(now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }))
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const sevenDaysLater = new Date(today)
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)
    const twoWeeksAgo = new Date(today)
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

    const [
      totalMembers,
      overdueCount,
      expiringCount,
      newLeadsCount,
      monthRevenue,
      todayAttendance,
      recentMembers,
      activeIds,
      recentCheckins,
    ] = await Promise.all([
      Member.countDocuments({ gym: gymId, is_active: true }),
      Membership.countDocuments({ gym: gymId, status: 'active', expiry_date: { $lt: today } }),
      Membership.countDocuments({ gym: gymId, status: 'active', expiry_date: { $gte: today, $lte: sevenDaysLater } }),
      Lead.countDocuments({ gym: gymId, status: 'new' }),
      Membership.aggregate([
        { $match: { gym: req.gym!._id, paid_at: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Attendance.countDocuments({ gym: gymId, check_in_date: today }),
      Member.find({ gym: gymId, is_active: true })
        .sort({ created_at: -1 })
        .limit(5)
        .lean(),
      Member.find({ gym: gymId, is_active: true }).select('_id').lean(),
      Attendance.find({ gym: gymId, checked_in_at: { $gte: twoWeeksAgo } })
        .select('member')
        .lean(),
    ])

    // Get latest membership for recent members
    const recentIds = recentMembers.map(m => m._id)
    const recentMemberships = await Membership.find({
      member: { $in: recentIds },
      gym: gymId,
    }).sort({ expiry_date: -1 }).lean()

    const msMap: Record<string, any> = {}
    for (const ms of recentMemberships) {
      const mid = ms.member.toString()
      if (!msMap[mid]) msMap[mid] = ms
    }

    const recentWithMs = recentMembers.map(m => ({
      ...m,
      latest_membership: msMap[m._id.toString()] || null,
    }))

    // Compute inactive (active members who haven't checked in for 2+ weeks)
    const recentSet = new Set(recentCheckins.map(r => r.member.toString()))
    const inactiveCount = activeIds.filter(m => !recentSet.has(m._id.toString())).length

    res.json({
      totalMembers,
      activeMembers: totalMembers,
      overdueCount,
      expiringCount,
      inactiveCount,
      newLeadsCount,
      monthRevenue: monthRevenue[0]?.total || 0,
      todayAttendance,
      recentMembers: recentWithMs,
    })
  } catch (err) {
    console.error('dashboard error:', err)
    res.status(500).json({ error: 'Failed to load dashboard' })
  }
})

export default router
```

**Step 3: Create lead routes**

Create `server/src/routes/lead.routes.ts`:

```typescript
import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { Lead } from '../models/Lead'
import { requireAuth } from '../middleware/auth'
import { requireOwner } from '../middleware/roleGuard'
import { requireGymAccess } from '../middleware/gymAccess'
import { validate } from '../middleware/validate'

const router = Router({ mergeParams: true })

const createLeadSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be 10 digits'),
  goal: z.string().optional(),
  source: z.enum(['gym_page', 'referral', 'trial', 'walkin', 'other']).default('walkin'),
  notes: z.string().optional(),
})

const updateLeadSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().regex(/^\d{10}$/).optional(),
  goal: z.string().optional(),
  status: z.enum(['new', 'contacted', 'converted', 'lost']).optional(),
  notes: z.string().optional(),
})

// GET /api/gym/:gymId/leads
router.get('/', requireAuth, requireOwner, requireGymAccess, async (req: Request, res: Response) => {
  try {
    const { status } = req.query
    const query: any = { gym: req.params.gymId }
    if (status && status !== 'all') query.status = status

    const leads = await Lead.find(query).sort({ created_at: -1 }).lean()
    res.json(leads)
  } catch {
    res.status(500).json({ error: 'Failed to fetch leads' })
  }
})

// POST /api/gym/:gymId/leads
router.post('/', requireAuth, requireOwner, requireGymAccess, validate(createLeadSchema), async (req: Request, res: Response) => {
  try {
    const lead = await Lead.create({
      ...req.body,
      gym: req.params.gymId,
    })
    res.status(201).json(lead)
  } catch {
    res.status(500).json({ error: 'Failed to create lead' })
  }
})

// PUT /api/gym/:gymId/leads/:leadId
router.put('/:leadId', requireAuth, requireOwner, requireGymAccess, validate(updateLeadSchema), async (req: Request, res: Response) => {
  try {
    const lead = await Lead.findOneAndUpdate(
      { _id: req.params.leadId, gym: req.params.gymId },
      req.body,
      { new: true }
    )
    if (!lead) return res.status(404).json({ error: 'Lead not found' })
    res.json(lead)
  } catch {
    res.status(500).json({ error: 'Failed to update lead' })
  }
})

export default router
```

**Step 4: Create post routes**

Create `server/src/routes/post.routes.ts`:

```typescript
import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { GymPost } from '../models/GymPost'
import { requireAuth } from '../middleware/auth'
import { requireOwner } from '../middleware/roleGuard'
import { requireGymAccess } from '../middleware/gymAccess'
import { validate } from '../middleware/validate'

const router = Router({ mergeParams: true })

const createPostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  body: z.string().optional(),
  post_type: z.enum(['challenge', 'event', 'offer', 'announcement']).default('announcement'),
  starts_at: z.string().optional(),
  ends_at: z.string().optional(),
  is_published: z.boolean().default(true),
})

const updatePostSchema = createPostSchema.partial()

// GET /api/gym/:gymId/posts
router.get('/', requireAuth, requireOwner, requireGymAccess, async (req: Request, res: Response) => {
  try {
    const posts = await GymPost.find({ gym: req.params.gymId })
      .sort({ created_at: -1 })
      .lean()
    res.json(posts)
  } catch {
    res.status(500).json({ error: 'Failed to fetch posts' })
  }
})

// POST /api/gym/:gymId/posts
router.post('/', requireAuth, requireOwner, requireGymAccess, validate(createPostSchema), async (req: Request, res: Response) => {
  try {
    const post = await GymPost.create({
      ...req.body,
      gym: req.params.gymId,
      author: req.user!.userId,
    })
    res.status(201).json(post)
  } catch {
    res.status(500).json({ error: 'Failed to create post' })
  }
})

// PUT /api/gym/:gymId/posts/:postId
router.put('/:postId', requireAuth, requireOwner, requireGymAccess, validate(updatePostSchema), async (req: Request, res: Response) => {
  try {
    const post = await GymPost.findOneAndUpdate(
      { _id: req.params.postId, gym: req.params.gymId },
      req.body,
      { new: true }
    )
    if (!post) return res.status(404).json({ error: 'Post not found' })
    res.json(post)
  } catch {
    res.status(500).json({ error: 'Failed to update post' })
  }
})

// DELETE /api/gym/:gymId/posts/:postId
router.delete('/:postId', requireAuth, requireOwner, requireGymAccess, async (req: Request, res: Response) => {
  try {
    const post = await GymPost.findOneAndDelete({ _id: req.params.postId, gym: req.params.gymId })
    if (!post) return res.status(404).json({ error: 'Post not found' })
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Failed to delete post' })
  }
})

export default router
```

**Step 5: Register all routes in app.ts**

Add to `server/src/app.ts` after existing route registrations:

```typescript
import memberRoutes from './routes/member.routes'
import membershipRoutes from './routes/membership.routes'
import dashboardRoutes from './routes/dashboard.routes'
import leadRoutes from './routes/lead.routes'
import postRoutes from './routes/post.routes'

app.use('/api/gym/:gymId/members', memberRoutes)
app.use('/api/gym/:gymId/memberships', membershipRoutes)
app.use('/api/gym/:gymId/dashboard', dashboardRoutes)
app.use('/api/gym/:gymId/leads', leadRoutes)
app.use('/api/gym/:gymId/posts', postRoutes)
```

**Step 6: Verify TypeScript compiles**

Run: `cd /Users/raghuchahar/Desktop/repcount/server && npx tsc --noEmit`

**Step 7: Commit**

```bash
cd /Users/raghuchahar/Desktop/repcount
git add server/src/routes/membership.routes.ts server/src/routes/dashboard.routes.ts server/src/routes/lead.routes.ts server/src/routes/post.routes.ts server/src/app.ts
git commit -m "feat(server): membership, dashboard, lead, post routes"
```

---

### Task 4: Client API Layer + Owner Layout

**Files:**
- Create: `client/src/api/gym.ts`
- Create: `client/src/api/members.ts`
- Create: `client/src/api/memberships.ts`
- Create: `client/src/api/leads.ts`
- Create: `client/src/api/posts.ts`
- Create: `client/src/components/layout/OwnerLayout.tsx`
- Modify: `client/src/App.tsx` (add OwnerLayout wrapper + route stubs)

**Context:** Create Axios API wrappers for all M2 endpoints. Create an OwnerLayout component with header ("RepCount" / "Owner Panel") and BottomNav. Update App.tsx to wrap all `/owner/*` routes in OwnerLayout and add route stubs for each page.

**Step 1: Create API files**

Create `client/src/api/gym.ts`:
```typescript
import api from './axios'

export async function getMyGym() {
  const { data } = await api.get('/gym/mine')
  return data
}

export async function createGym(gymData: any) {
  const { data } = await api.post('/gym', gymData)
  return data
}

export async function updateGym(gymId: string, gymData: any) {
  const { data } = await api.put(`/gym/${gymId}`, gymData)
  return data
}
```

Create `client/src/api/members.ts`:
```typescript
import api from './axios'

export async function getMembers(gymId: string, params?: { search?: string; filter?: string }) {
  const { data } = await api.get(`/gym/${gymId}/members`, { params })
  return data
}

export async function getMember(gymId: string, memberId: string) {
  const { data } = await api.get(`/gym/${gymId}/members/${memberId}`)
  return data
}

export async function addMember(gymId: string, memberData: any) {
  const { data } = await api.post(`/gym/${gymId}/members`, memberData)
  return data
}

export async function updateMember(gymId: string, memberId: string, memberData: any) {
  const { data } = await api.put(`/gym/${gymId}/members/${memberId}`, memberData)
  return data
}
```

Create `client/src/api/memberships.ts`:
```typescript
import api from './axios'

export async function recordPayment(gymId: string, paymentData: { member_id: string; plan_type: string; amount: number; payment_method: string }) {
  const { data } = await api.post(`/gym/${gymId}/memberships`, paymentData)
  return data
}

export async function getRenewals(gymId: string) {
  const { data } = await api.get(`/gym/${gymId}/memberships/renewals`)
  return data
}

export async function getDashboard(gymId: string) {
  const { data } = await api.get(`/gym/${gymId}/dashboard`)
  return data
}
```

Create `client/src/api/leads.ts`:
```typescript
import api from './axios'

export async function getLeads(gymId: string, status?: string) {
  const { data } = await api.get(`/gym/${gymId}/leads`, { params: status && status !== 'all' ? { status } : undefined })
  return data
}

export async function createLead(gymId: string, leadData: any) {
  const { data } = await api.post(`/gym/${gymId}/leads`, leadData)
  return data
}

export async function updateLead(gymId: string, leadId: string, leadData: any) {
  const { data } = await api.put(`/gym/${gymId}/leads/${leadId}`, leadData)
  return data
}
```

Create `client/src/api/posts.ts`:
```typescript
import api from './axios'

export async function getPosts(gymId: string) {
  const { data } = await api.get(`/gym/${gymId}/posts`)
  return data
}

export async function createPost(gymId: string, postData: any) {
  const { data } = await api.post(`/gym/${gymId}/posts`, postData)
  return data
}

export async function updatePost(gymId: string, postId: string, postData: any) {
  const { data } = await api.put(`/gym/${gymId}/posts/${postId}`, postData)
  return data
}

export async function deletePost(gymId: string, postId: string) {
  const { data } = await api.delete(`/gym/${gymId}/posts/${postId}`)
  return data
}
```

**Step 2: Create OwnerLayout**

Create `client/src/components/layout/OwnerLayout.tsx`:
```tsx
import { Outlet } from 'react-router-dom'
import { BottomNav, ownerNavItems } from './BottomNav'

export default function OwnerLayout() {
  return (
    <div className="pb-20">
      <header className="sticky top-0 z-40 bg-bg-primary border-b border-border px-4 py-3 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-accent-orange">RepCount</h1>
          <span className="text-xs text-text-secondary">Owner Panel</span>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <BottomNav items={ownerNavItems} />
    </div>
  )
}
```

**Step 3: Update App.tsx with nested owner routes**

Replace `client/src/App.tsx` with:
```tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/shared/ProtectedRoute'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import Login from '@/pages/Login'
import VerifyOtp from '@/pages/VerifyOtp'
import OwnerLayout from '@/components/layout/OwnerLayout'
import OwnerDashboard from '@/pages/owner/Dashboard'
import MembersPage from '@/pages/owner/Members'
import AddMemberPage from '@/pages/owner/AddMember'
import MemberDetailPage from '@/pages/owner/MemberDetail'
import RenewalsPage from '@/pages/owner/Renewals'
import LeadsPage from '@/pages/owner/Leads'
import PostsPage from '@/pages/owner/Posts'
import CreatePostPage from '@/pages/owner/CreatePost'
import SettingsPage from '@/pages/owner/Settings'
import MemberHome from '@/pages/member/Home'

function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={user.role === 'owner' ? '/owner' : '/m'} replace />
}

export default function App() {
  return (
    <div className="max-w-mobile mx-auto min-h-screen">
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify" element={<VerifyOtp />} />

        <Route path="/owner" element={
          <ProtectedRoute requiredRole="owner">
            <OwnerLayout />
          </ProtectedRoute>
        }>
          <Route index element={<OwnerDashboard />} />
          <Route path="members" element={<MembersPage />} />
          <Route path="members/add" element={<AddMemberPage />} />
          <Route path="members/:id" element={<MemberDetailPage />} />
          <Route path="renewals" element={<RenewalsPage />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route path="posts" element={<PostsPage />} />
          <Route path="posts/create" element={<CreatePostPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="/m" element={
          <ProtectedRoute requiredRole="member">
            <MemberHome />
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
```

**Step 4: Create stub pages so TypeScript compiles**

Create each page as a minimal stub first. These will be replaced in Tasks 5-7.

`client/src/pages/owner/Members.tsx`:
```tsx
export default function MembersPage() {
  return <div className="p-4"><h2 className="text-lg font-bold text-text-primary">Members</h2><p className="text-text-muted text-sm">Loading...</p></div>
}
```

`client/src/pages/owner/AddMember.tsx`:
```tsx
export default function AddMemberPage() {
  return <div className="p-4"><h2 className="text-lg font-bold text-text-primary">Add Member</h2></div>
}
```

`client/src/pages/owner/MemberDetail.tsx`:
```tsx
export default function MemberDetailPage() {
  return <div className="p-4"><h2 className="text-lg font-bold text-text-primary">Member Detail</h2></div>
}
```

`client/src/pages/owner/Renewals.tsx`:
```tsx
export default function RenewalsPage() {
  return <div className="p-4"><h2 className="text-lg font-bold text-text-primary">Renewals</h2></div>
}
```

`client/src/pages/owner/Leads.tsx`:
```tsx
export default function LeadsPage() {
  return <div className="p-4"><h2 className="text-lg font-bold text-text-primary">Leads</h2></div>
}
```

`client/src/pages/owner/Posts.tsx`:
```tsx
export default function PostsPage() {
  return <div className="p-4"><h2 className="text-lg font-bold text-text-primary">Posts</h2></div>
}
```

`client/src/pages/owner/CreatePost.tsx`:
```tsx
export default function CreatePostPage() {
  return <div className="p-4"><h2 className="text-lg font-bold text-text-primary">Create Post</h2></div>
}
```

`client/src/pages/owner/Settings.tsx`:
```tsx
export default function SettingsPage() {
  return <div className="p-4"><h2 className="text-lg font-bold text-text-primary">Settings</h2></div>
}
```

**Step 5: Verify both compile**

Run: `cd /Users/raghuchahar/Desktop/repcount/server && npx tsc --noEmit && cd ../client && npx tsc --noEmit`

**Step 6: Commit**

```bash
cd /Users/raghuchahar/Desktop/repcount
git add client/src/api/gym.ts client/src/api/members.ts client/src/api/memberships.ts client/src/api/leads.ts client/src/api/posts.ts client/src/components/layout/OwnerLayout.tsx client/src/App.tsx client/src/pages/owner/
git commit -m "feat(client): owner API layer, OwnerLayout, nested routes with page stubs"
```

---

### Task 5: Dashboard + Settings Pages

**Files:**
- Modify: `client/src/pages/owner/Dashboard.tsx` (full rewrite)
- Modify: `client/src/pages/owner/Settings.tsx` (full rewrite)

**Context:** Port the original Next.js dashboard and settings pages. Replace Supabase queries with API calls (`getDashboard`, `getMyGym`, `createGym`, `updateGym`). Replace `Link` from `next/link` with `Link` from `react-router-dom`. The dashboard needs the gym ID for all API calls — get it from `getMyGym()` on mount. If no gym exists, show the "Set Up Your Gym" CTA linking to `/owner/settings`. Settings page creates or updates the gym.

The original dashboard shows:
- Revenue card (month revenue, today's check-ins, total/active members)
- Alert cards (overdue, expiring, new leads, inactive 2wk+) — each links to `/owner/members?filter=X` or `/owner/leads`
- Quick actions grid (Add Member, Renewals, Import, New Post)
- Recent members list with latest membership status badge

The original settings page shows:
- Basic info (name, slug, address, phone, description textarea)
- Timings (opening, closing)
- Pricing (monthly, quarterly, half_yearly, yearly)
- UPI ID
- Facilities (toggle chips from FACILITIES_OPTIONS)
- Save button, Logout button

Port these 1:1 but swap Supabase for the API layer. Use `useAuth()` for logout. Add a `gymId` state that persists across the page — either from `getMyGym()` response or from gym creation response.

**Step 1: Write Dashboard.tsx**

Replace `client/src/pages/owner/Dashboard.tsx` with the full port. Use `getDashboard(gymId)` for stats and `getMyGym()` to get gymId. Use `Link` from `react-router-dom`. Match the original UI exactly (revenue card, alert cards, quick actions, recent members).

**Step 2: Write Settings.tsx**

Replace `client/src/pages/owner/Settings.tsx` with the full port. Use `getMyGym()` to load, `createGym(data)` or `updateGym(gymId, data)` to save. Include `useAuth()` logout. Keep all form fields identical to original.

**Step 3: Verify client compiles**

Run: `cd /Users/raghuchahar/Desktop/repcount/client && npx tsc --noEmit`

**Step 4: Commit**

```bash
cd /Users/raghuchahar/Desktop/repcount
git add client/src/pages/owner/Dashboard.tsx client/src/pages/owner/Settings.tsx
git commit -m "feat(client): owner Dashboard + Settings pages (ported from Next.js)"
```

---

### Task 6: Members Pages (list, add, detail)

**Files:**
- Modify: `client/src/pages/owner/Members.tsx` (full rewrite)
- Modify: `client/src/pages/owner/AddMember.tsx` (full rewrite)
- Modify: `client/src/pages/owner/MemberDetail.tsx` (full rewrite)

**Context:** Port the original Next.js member pages. Members page shows searchable/filterable list with status badges. Add Member page has form with basic info + payment + optional details toggle. Member Detail page shows profile card, quick actions (record payment, WhatsApp, call), payment form, current plan, payment history, recent attendance, member details.

Key differences from original:
- Use `getMyGym()` to get gymId, then `getMembers(gymId)`, `addMember(gymId, data)`, `getMember(gymId, memberId)`
- Use `recordPayment(gymId, paymentData)` for the payment form in member detail
- Use `Link` and `useNavigate`/`useParams` from `react-router-dom` instead of `next/link` and `next/navigation`
- Use `useSearchParams` from `react-router-dom` for filter param on members list
- Use `todayIST()` and `daysSince()` from `@/utils/helpers` for date computations
- Use `generateWhatsAppLink` and `templates` from `@/utils/whatsapp` for WhatsApp actions
- Use `GOALS`, `PLAN_TYPES`, `DIET_PREFS` from `@/utils/constants`
- Use `formatCurrency` from `@/utils/helpers`

**Step 1: Write Members.tsx**

Full port: search, filter chips (all/overdue/expiring/active), member list with avatars, status badges, days-to-expiry text. Use `getMyGym()` + `getMembers(gymId)`.

**Step 2: Write AddMember.tsx**

Full port: basic info (name, phone), payment (plan type grid, amount, payment method), optional details toggle (dob, goal, diet, notes). On submit call `addMember(gymId, data)`, navigate to `/owner/members`.

**Step 3: Write MemberDetail.tsx**

Full port: member header card (name, phone, goal badge, status badge), quick actions (Record Payment, WhatsApp/Call), expandable payment form, current plan card, payment history, recent attendance chips, member details card. Use `getMember(gymId, memberId)` and `recordPayment(gymId, data)`.

**Step 4: Verify client compiles**

Run: `cd /Users/raghuchahar/Desktop/repcount/client && npx tsc --noEmit`

**Step 5: Commit**

```bash
cd /Users/raghuchahar/Desktop/repcount
git add client/src/pages/owner/Members.tsx client/src/pages/owner/AddMember.tsx client/src/pages/owner/MemberDetail.tsx
git commit -m "feat(client): Members list, Add Member, Member Detail pages"
```

---

### Task 7: Renewals, Leads, Posts Pages

**Files:**
- Modify: `client/src/pages/owner/Renewals.tsx` (full rewrite)
- Modify: `client/src/pages/owner/Leads.tsx` (full rewrite)
- Modify: `client/src/pages/owner/Posts.tsx` (full rewrite)
- Modify: `client/src/pages/owner/CreatePost.tsx` (full rewrite)

**Context:** Port the remaining owner pages from Next.js originals.

Renewals page: shows members expiring within 7 days or already expired. Each card has name, phone, amount, plan type, overdue/expiring badge, WhatsApp + Call buttons. Uses `getRenewals(gymId)` and `getMyGym()` for gym name/UPI.

Leads page: filterable list (all/new/contacted/converted). Each card has name, phone, source, goal, status badge, WhatsApp + Call buttons, "Mark Contacted" quick action. Uses `getLeads(gymId, status)` and `updateLead(gymId, leadId, { status })`.

Posts page: list of posts with type badge, date, title, body preview, date range. "+ Create" button links to `/owner/posts/create`. Uses `getPosts(gymId)`.

Create Post page: form with post type grid, title, description textarea, optional start/end dates for challenges/events/offers. Uses `createPost(gymId, data)`, navigates to `/owner/posts` on success.

**Step 1: Write Renewals.tsx**

Full port using `getRenewals(gymId)`. Include WhatsApp templates for overdue/renewal reminders.

**Step 2: Write Leads.tsx**

Full port using `getLeads(gymId)` and `updateLead()`. Include filter chips, WhatsApp/Call buttons.

**Step 3: Write Posts.tsx**

Full port using `getPosts(gymId)`. Show post type badges with emoji/color from POST_TYPES.

**Step 4: Write CreatePost.tsx**

Full port using `createPost(gymId, data)`. Post type grid, title, body, conditional date fields.

**Step 5: Verify client compiles**

Run: `cd /Users/raghuchahar/Desktop/repcount/client && npx tsc --noEmit`

**Step 6: Commit**

```bash
cd /Users/raghuchahar/Desktop/repcount
git add client/src/pages/owner/Renewals.tsx client/src/pages/owner/Leads.tsx client/src/pages/owner/Posts.tsx client/src/pages/owner/CreatePost.tsx
git commit -m "feat(client): Renewals, Leads, Posts, CreatePost pages"
```

---

### Task 8: End-to-End Test

**Files:** None created. This is a manual testing task.

**Context:** Start both servers, test the complete owner flow via curl and browser.

**Step 1: Start servers**

```bash
cd /Users/raghuchahar/Desktop/repcount
# Kill any existing processes on ports 5001/5173
lsof -ti:5001 | xargs kill -9 2>/dev/null
npm run dev
```

**Step 2: Test backend via curl**

```bash
# Login as test user
curl -s -X POST http://localhost:5001/api/auth/send-otp -H "Content-Type: application/json" -d '{"phone":"+919999999999"}'
VERIFY=$(curl -s -X POST http://localhost:5001/api/auth/verify-otp -H "Content-Type: application/json" -d '{"phone":"+919999999999","otp":"123456"}' -c /tmp/rc_cookies.txt)
TOKEN=$(echo $VERIFY | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

# Promote to owner in MongoDB
mongosh repcount --quiet --eval 'db.users.updateOne({phone:"+919999999999"},{$set:{role:"owner"}})'

# Refresh to get new token with owner role
REFRESH=$(curl -s -X POST http://localhost:5001/api/auth/refresh -b /tmp/rc_cookies.txt -c /tmp/rc_cookies.txt)
TOKEN=$(echo $REFRESH | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")
AUTH="Authorization: Bearer $TOKEN"

# Create gym
curl -s -X POST http://localhost:5001/api/gym -H "Content-Type: application/json" -H "$AUTH" -d '{"name":"Iron Paradise","slug":"iron-paradise","city":"Agra"}'

# Get my gym
curl -s http://localhost:5001/api/gym/mine -H "$AUTH" | python3 -m json.tool

# Get gymId, then test member/dashboard/lead/post routes
```

**Step 3: Verify in browser**

Open http://localhost:5173, login with test phone, verify owner dashboard loads with stats, navigate through all owner pages.

**Step 4: Commit if any fixes needed**

```bash
git add -A
git commit -m "fix: M2 end-to-end test fixes"
```
