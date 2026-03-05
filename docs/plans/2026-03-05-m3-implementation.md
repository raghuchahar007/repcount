# GymRep M3 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship gym directory, plan types, timing slots, attendance improvements, auth fixes, join-request-only flow, gym claim system, and profile pages.

**Architecture:** Backend-first (Express + Mongoose), then frontend (React + Vite). GymRep has zero tests — Task 1 bootstraps Vitest on the server. All model changes require `npm run drop-indexes` on the VPS after deploy.

**⚠️ Live data warning:** One gym is already onboarded. Task 1.5 (data migration) MUST run on the VPS BEFORE deploying new code. It migrates `opening_time`/`closing_time` → `timing_slots` and flat `pricing` → nested pricing per plan type. Skipping this loses existing gym's timing and pricing data.

**Tech Stack:** Express 4, Mongoose, React 18, Vite, Tailwind v4, TypeScript strict, JWT auth, pnpm

**Design doc:** `docs/plans/2026-03-05-m3-design.md`

---

## Task 1: Bootstrap Vitest on server

**Files:**
- Modify: `server/package.json`
- Create: `server/src/tests/gym.test.ts`

**Step 1: Install Vitest**
```bash
cd server && npm install --save-dev vitest
```

**Step 2: Add test script to `server/package.json`**
```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
}
```

**Step 3: Create first smoke test**
```typescript
// server/src/tests/gym.test.ts
import { describe, it, expect } from 'vitest'

describe('gym utils', () => {
  it('normalizes city name', () => {
    expect('  Mumbai  '.trim().toLowerCase()).toBe('mumbai')
  })
})
```

**Step 4: Run test**
```bash
cd server && npm test
```
Expected: PASS

**Step 5: Commit**
```bash
git add server/package.json server/src/tests/
git commit -m "chore: bootstrap vitest on server"
```

---

---

## Task 1.5: Data migration script for existing gyms ⚠️ RUN ON VPS BEFORE DEPLOYING

**This task runs BEFORE any code changes deploy. It migrates live data.**

**Files:**
- Create: `server/src/scripts/migrate-gym-schema.ts`

**Step 1: Create migration script**
```typescript
// server/src/scripts/migrate-gym-schema.ts
// Run BEFORE deploying new code: npx ts-node src/scripts/migrate-gym-schema.ts

import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config()

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!)
  const db = mongoose.connection.db!

  const gyms = await db.collection('gyms').find({}).toArray()
  console.log(`Found ${gyms.length} gym(s) to migrate`)

  for (const gym of gyms) {
    const updates: Record<string, any> = {}

    // 1. Migrate opening_time/closing_time → timing_slots
    if (gym.opening_time || gym.closing_time) {
      updates.timing_mode = 'slots'
      updates.timing_slots = [{
        label: 'Open Hours',
        open: gym.opening_time || '06:00',
        close: gym.closing_time || '22:00',
      }]
      updates.$unset = { opening_time: '', closing_time: '' }
      console.log(`  ${gym.name}: migrating timing ${gym.opening_time}–${gym.closing_time} → slot`)
    } else {
      updates.timing_mode = 'slots'
      updates.timing_slots = [
        { label: 'Morning', open: '06:00', close: '12:00' },
        { label: 'Evening', open: '16:00', close: '22:00' },
      ]
      console.log(`  ${gym.name}: no timing set, using defaults`)
    }

    // 2. Migrate flat pricing → nested pricing per plan type
    // Before: { monthly: 1200, quarterly: 3000, half_yearly: 5500, yearly: 10000 }
    // After:  { strength: { monthly: 1200, ... }, strength_cardio: { monthly: 1200, ... } }
    const flat = gym.pricing || {}
    const isFlat = typeof flat.monthly === 'number' || typeof flat.quarterly === 'number'

    if (isFlat) {
      updates.pricing = {
        strength: {
          monthly: flat.monthly || 0,
          quarterly: flat.quarterly || 0,
          half_yearly: flat.half_yearly || 0,
          yearly: flat.yearly || 0,
        },
        strength_cardio: {
          monthly: flat.monthly || 0,
          quarterly: flat.quarterly || 0,
          half_yearly: flat.half_yearly || 0,
          yearly: flat.yearly || 0,
        },
      }
      console.log(`  ${gym.name}: migrating flat pricing to nested`)
    }

    // 3. Set default plan_types if missing
    if (!gym.plan_types || gym.plan_types.length === 0) {
      updates.plan_types = [
        { id: 'strength', name: 'Strength' },
        { id: 'strength_cardio', name: 'Strength + Cardio' },
      ]
    }

    if (Object.keys(updates).length > 0) {
      const { $unset, ...set } = updates
      const op: any = { $set: set }
      if ($unset) op.$unset = $unset
      await db.collection('gyms').updateOne({ _id: gym._id }, op)
      console.log(`  ${gym.name}: ✓ migrated`)
    }
  }

  console.log('\nMigration complete.')
  await mongoose.disconnect()
}

main().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
```

**Step 2: Add script to `server/package.json`**
```json
"migrate-gym-schema": "ts-node src/scripts/migrate-gym-schema.ts"
```

**Step 3: Test locally against dev DB**
```bash
cd server && npm run migrate-gym-schema
```
Verify: check MongoDB — existing gym(s) should now have `timing_slots`, nested `pricing`, `plan_types`. Old `opening_time`/`closing_time` fields removed.

**Step 4: Run on VPS BEFORE deploying new code**
```bash
ssh root@65.20.86.56
cd /var/www/gymrep/server
npm run migrate-gym-schema
```
Verify in MongoDB Atlas that the gym document looks correct.

**Step 5: Commit**
```bash
git add server/src/scripts/migrate-gym-schema.ts server/package.json
git commit -m "script: migrate gym timing and pricing to new schema format"
```

---

## Task 2: GymClaim model

**Files:**
- Create: `server/src/models/GymClaim.ts`
- Create: `server/src/tests/gymClaim.test.ts`

**Step 1: Write failing test**
```typescript
// server/src/tests/gymClaim.test.ts
import { describe, it, expect } from 'vitest'
import { GymClaim } from '../models/GymClaim'

describe('GymClaim model', () => {
  it('exports GymClaim model', () => {
    expect(GymClaim).toBeDefined()
  })
})
```

**Step 2: Run — expect fail**
```bash
cd server && npm test
```

**Step 3: Create model**
```typescript
// server/src/models/GymClaim.ts
import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IGymClaim extends Document {
  gym: Types.ObjectId
  claimant_name: string
  claimant_phone: string
  claimant_email: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: Date
}

const gymClaimSchema = new Schema<IGymClaim>({
  gym: { type: Schema.Types.ObjectId, ref: 'Gym', required: true },
  claimant_name: { type: String, required: true },
  claimant_phone: { type: String, required: true },
  claimant_email: { type: String, required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  created_at: { type: Date, default: Date.now },
})

gymClaimSchema.index({ gym: 1, status: 1 })
gymClaimSchema.index({ created_at: -1 })

export const GymClaim = mongoose.model<IGymClaim>('GymClaim', gymClaimSchema)
```

**Step 4: Run test — expect pass**
```bash
cd server && npm test
```

**Step 5: Commit**
```bash
git add server/src/models/GymClaim.ts server/src/tests/gymClaimModel.test.ts
git commit -m "feat: add GymClaim model"
```

---

## Task 3: Gym model — plan_types, timing_slots, remove opening/closing_time

**Files:**
- Modify: `server/src/models/Gym.ts`
- Create: `server/src/tests/gymModel.test.ts`

**Step 1: Write failing test**
```typescript
// server/src/tests/gymModel.test.ts
import { describe, it, expect } from 'vitest'

const DEFAULT_PLAN_TYPES = [
  { id: 'strength', name: 'Strength' },
  { id: 'strength_cardio', name: 'Strength + Cardio' },
]
const DEFAULT_TIMING_SLOTS = [
  { label: 'Morning', open: '06:00', close: '12:00' },
  { label: 'Evening', open: '16:00', close: '22:00' },
]

describe('Gym defaults', () => {
  it('has correct default plan types', () => {
    expect(DEFAULT_PLAN_TYPES).toHaveLength(2)
    expect(DEFAULT_PLAN_TYPES[0].id).toBe('strength')
  })
  it('has correct default timing slots', () => {
    expect(DEFAULT_TIMING_SLOTS[0].label).toBe('Morning')
    expect(DEFAULT_TIMING_SLOTS[1].open).toBe('16:00')
  })
})
```

**Step 2: Run — expect pass** (pure logic test, no DB needed)

**Step 3: Update `server/src/models/Gym.ts`**

Remove `opening_time` and `closing_time` fields. Add:
```typescript
// Add these interfaces at top of file
interface PlanType {
  id: string
  name: string
}
interface TimingSlot {
  label: string
  open: string
  close: string
}

// In IGym interface, replace opening_time/closing_time with:
timing_mode: 'slots' | '24x7'
timing_slots: TimingSlot[]
plan_types: PlanType[]
pricing: Record<string, Record<string, number>>

// In gymSchema, replace opening_time/closing_time with:
timing_mode: { type: String, enum: ['slots', '24x7'], default: 'slots' },
timing_slots: {
  type: [{
    label: { type: String, required: true },
    open: { type: String, required: true },
    close: { type: String, required: true },
  }],
  default: [
    { label: 'Morning', open: '06:00', close: '12:00' },
    { label: 'Evening', open: '16:00', close: '22:00' },
  ]
},
plan_types: {
  type: [{ id: String, name: String }],
  default: [
    { id: 'strength', name: 'Strength' },
    { id: 'strength_cardio', name: 'Strength + Cardio' },
  ]
},
// pricing stays as Schema.Types.Mixed, no change needed
```

**Step 4: Update `IGym` export** — ensure `opening_time`/`closing_time` are removed from the TypeScript interface too.

**Step 5: Search for all usages of opening_time/closing_time**
```bash
grep -r "opening_time\|closing_time" server/src --include="*.ts"
```
Fix any references found (likely in gym.routes.ts create/update schemas).

**Step 6: Commit**
```bash
git add server/src/models/Gym.ts server/src/tests/gymModel.test.ts
git commit -m "feat: add plan_types and timing_slots to Gym model"
```

---

## Task 4: Gym model — name+city uniqueness + 1 gym per owner

**Files:**
- Modify: `server/src/models/Gym.ts`
- Modify: `server/src/routes/gym.routes.ts`
- Create: `server/src/tests/gymUniqueness.test.ts`

**Step 1: Write test for uniqueness logic**
```typescript
// server/src/tests/gymUniqueness.test.ts
import { describe, it, expect } from 'vitest'

function normalizeCity(city: string): string {
  return city.trim().toLowerCase()
}

describe('gym city normalization', () => {
  it('trims and lowercases city', () => {
    expect(normalizeCity('  Mumbai  ')).toBe('mumbai')
    expect(normalizeCity('Delhi')).toBe('delhi')
  })
})
```

**Step 2: Run — expect pass**

**Step 3: Add compound unique index to `server/src/models/Gym.ts`**
```typescript
// At bottom of gymSchema, after existing indexes:
gymSchema.index({ name: 1, city: 1 }, { unique: true, sparse: true, collation: { locale: 'en', strength: 2 } })
```
Note: `strength: 2` = case-insensitive comparison.

**Step 4: Update gym create route in `server/src/routes/gym.routes.ts`**

In the `POST /` handler, before creating gym, add these two checks:
```typescript
// Check: owner already has a gym
const existingGym = await Gym.findOne({ owner: req.user.id })
if (existingGym) {
  return res.status(409).json({ error: 'You already have a gym registered' })
}

// Check: name+city conflict (if city provided)
if (req.body.city) {
  const cityNormalized = req.body.city.trim().toLowerCase()
  const conflict = await Gym.findOne({
    name: { $regex: new RegExp(`^${req.body.name}$`, 'i') },
    city: cityNormalized,
  })
  if (conflict) {
    return res.status(409).json({ error: 'A gym with this name already exists in this city' })
  }
}

// Normalize city before save
if (req.body.city) req.body.city = req.body.city.trim().toLowerCase()
```

**Step 5: Run tests**
```bash
cd server && npm test
```

**Step 6: Commit**
```bash
git add server/src/models/Gym.ts server/src/routes/gym.routes.ts server/src/tests/gymUniqueness.test.ts
git commit -m "feat: name+city uniqueness and 1-gym-per-owner constraint"
```

---

## Task 5: Membership model — add plan_type_name

**Files:**
- Modify: `server/src/models/Membership.ts`
- Modify: `server/src/routes/membership.routes.ts`

**Step 1: Add field to `server/src/models/Membership.ts`**
```typescript
// In IMembership interface:
plan_type_name: string | null

// In membershipSchema:
plan_type_name: { type: String, default: null },
```

**Step 2: Update membership create route in `server/src/routes/membership.routes.ts`**

In the create membership Zod schema, add:
```typescript
plan_type_name: z.string().optional(),
```

In the create handler, pass it to the Membership constructor:
```typescript
plan_type_name: req.body.plan_type_name || null,
```

**Step 3: Commit**
```bash
git add server/src/models/Membership.ts server/src/routes/membership.routes.ts
git commit -m "feat: add plan_type_name to Membership model"
```

---

## Task 6: Public gyms API endpoint

**Files:**
- Modify: `server/src/routes/public.routes.ts`
- Create: `server/src/tests/publicGyms.test.ts`

**Step 1: Write test**
```typescript
// server/src/tests/publicGyms.test.ts
import { describe, it, expect } from 'vitest'

function buildGymCard(gym: any) {
  return {
    slug: gym.slug,
    name: gym.name,
    city: gym.city,
    logo_url: gym.logo_url,
    facilities: gym.facilities,
    timing_mode: gym.timing_mode,
    timing_slots: gym.timing_slots,
  }
}

describe('buildGymCard', () => {
  it('returns correct shape', () => {
    const gym = {
      slug: 'test-gym',
      name: 'Test Gym',
      city: 'mumbai',
      logo_url: null,
      facilities: ['Cardio'],
      timing_mode: 'slots',
      timing_slots: [{ label: 'Morning', open: '06:00', close: '12:00' }],
      owner: 'secret',
      pricing: {},
    }
    const card = buildGymCard(gym)
    expect(card).not.toHaveProperty('owner')
    expect(card).not.toHaveProperty('pricing')
    expect(card.slug).toBe('test-gym')
  })
})
```

**Step 2: Run — expect pass**

**Step 3: Add route to `server/src/routes/public.routes.ts`**
```typescript
// GET /api/public/gyms — list active gyms for directory
router.get('/gyms', async (req: Request, res: Response) => {
  try {
    const gyms = await Gym.find({ isActive: true })
      .select('slug name city logo_url facilities timing_mode timing_slots description')
      .sort({ created_at: -1 })
      .lean()
    res.json({ data: gyms })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch gyms' })
  }
})
```

Note: Check if `Gym` model has `isActive` field — if not, just remove that filter.

**Step 4: Run tests**
```bash
cd server && npm test
```

**Step 5: Commit**
```bash
git add server/src/routes/public.routes.ts server/src/tests/publicGyms.test.ts
git commit -m "feat: GET /api/public/gyms endpoint for gym directory"
```

---

## Task 7: Attendance — duplicate check-in fix

**Files:**
- Modify: `server/src/routes/attendance.routes.ts`
- Create: `server/src/tests/attendance.test.ts`

**Step 1: Find the QR check-in endpoint**
```bash
grep -n "check.in\|checkin\|scan" server/src/routes/attendance.routes.ts | head -20
```

**Step 2: Write test for duplicate detection logic**
```typescript
// server/src/tests/attendance.test.ts
import { describe, it, expect } from 'vitest'

function isDuplicateKeyError(err: any): boolean {
  return err?.code === 11000
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

describe('attendance utils', () => {
  it('detects duplicate key error', () => {
    expect(isDuplicateKeyError({ code: 11000 })).toBe(true)
    expect(isDuplicateKeyError({ code: 500 })).toBe(false)
  })
  it('formats check-in time', () => {
    const d = new Date('2026-03-05T09:14:00')
    expect(formatTime(d)).toMatch(/9:14/)
  })
})
```

**Step 3: Run — expect pass**

**Step 4: Update the check-in handler**

Find the attendance save block and wrap with duplicate detection:
```typescript
try {
  await attendance.save()
  return res.json({ success: true, message: 'Checked in successfully' })
} catch (err: any) {
  if (err?.code === 11000) {
    // Already checked in today — find the existing record for time
    const existing = await Attendance.findOne({
      member: memberId,
      gym: gymId,
      check_in_date: todayDate,
    })
    const timeStr = existing
      ? existing.checked_in_at.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
      : 'earlier today'
    return res.status(200).json({
      already_checked_in: true,
      message: `Already checked in today at ${timeStr}`,
    })
  }
  throw err
}
```

**Step 5: Run tests**
```bash
cd server && npm test
```

**Step 6: Commit**
```bash
git add server/src/routes/attendance.routes.ts server/src/tests/attendance.test.ts
git commit -m "fix: friendly message on duplicate check-in"
```

---

## Task 8: Attendance — today's list + busy hours APIs

**Files:**
- Modify: `server/src/routes/attendance.routes.ts`

**Step 1: Add today's check-ins endpoint**
```typescript
// GET /api/gym/:gymId/attendance/today
router.get('/today', requireAuth, requireOwner, requireGymAccess, async (req, res) => {
  try {
    const { gymId } = req.params
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const records = await Attendance.find({ gym: gymId, check_in_date: today })
      .populate('member', 'name phone')
      .sort({ checked_in_at: -1 })
      .lean()

    res.json({ data: records, count: records.length })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch today attendance' })
  }
})
```

**Step 2: Add busy hours endpoint**
```typescript
// GET /api/gym/:gymId/attendance/busy-hours
router.get('/busy-hours', requireAuth, requireOwner, requireGymAccess, async (req, res) => {
  try {
    const { gymId } = req.params
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const result = await Attendance.aggregate([
      { $match: { gym: new mongoose.Types.ObjectId(gymId), checked_in_at: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $hour: '$checked_in_at' }, count: { $sum: 1 } } },
      { $sort: { '_id': 1 } },
    ])

    // Fill in missing hours with 0
    const hours = Array.from({ length: 24 }, (_, h) => {
      const found = result.find((r: any) => r._id === h)
      return { hour: h, count: found ? found.count : 0 }
    })

    res.json({ data: hours })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch busy hours' })
  }
})
```

**Step 3: Commit**
```bash
git add server/src/routes/attendance.routes.ts
git commit -m "feat: today check-ins and busy hours attendance APIs"
```

---

## Task 9: Join gym → request only (backend)

**Files:**
- Modify: `server/src/routes/me.routes.ts` (or wherever `joinGym` is defined)

**Step 1: Find the direct join endpoint**
```bash
grep -n "joinGym\|join" server/src/routes/me.routes.ts | head -20
```

**Step 2: Add cancel-request endpoint**
```typescript
// DELETE /api/me/join-request/:gymId — cancel a pending join request
router.delete('/join-request/:gymId', requireAuth, async (req, res) => {
  try {
    const lead = await Lead.findOneAndDelete({
      gym: req.params.gymId,
      user: req.user.id,
      source: 'app_request',
      status: 'new',
    })
    if (!lead) return res.status(404).json({ error: 'No pending request found' })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel request' })
  }
})
```

**Step 3: Add get-pending-requests endpoint**
```typescript
// GET /api/me/join-requests — get pending join requests for current user
router.get('/join-requests', requireAuth, async (req, res) => {
  try {
    const requests = await Lead.find({
      user: req.user.id,
      source: 'app_request',
      status: 'new',
    }).populate('gym', 'name city slug').lean()
    res.json({ data: requests })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch requests' })
  }
})
```

**Step 4: Remove or disable the direct `joinGym` handler** (check if it's distinct from `requestToJoin` — if they're the same endpoint, do nothing on backend; just update the frontend flow)

**Step 5: Commit**
```bash
git add server/src/routes/me.routes.ts
git commit -m "feat: cancel join request and get pending requests endpoints"
```

---

## Task 10: Gym claim API

**Files:**
- Create: `server/src/routes/claim.routes.ts`
- Modify: `server/src/app.ts` (register route)

**Step 1: Create claim routes**
```typescript
// server/src/routes/claim.routes.ts
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

    const claim = await GymClaim.create({
      gym: req.params.gymId,
      ...req.body,
    })
    res.status(201).json({ success: true, message: 'Claim submitted. We will review it within 2-3 business days.' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit claim' })
  }
})

export default router
```

**Step 2: Register in `server/src/app.ts`**

Find where public routes are registered and add:
```typescript
import claimRoutes from './routes/claim.routes'
// ...
app.use('/api/public/gym', claimRoutes)
```

**Step 3: Add super admin claims list endpoint** (in whatever file handles super-admin/admin routes)
```typescript
// GET /api/admin/claims — list pending claims (admin only, check your auth middleware pattern)
// POST /api/admin/claims/:claimId/transfer — transfer gym ownership
//   body: { new_owner_email: string }
```

Check `server/src/routes/` for any existing admin route file. If none, add to a new `admin.routes.ts`.

**Transfer ownership handler:**
```typescript
router.post('/claims/:claimId/transfer', requireAuth, /* requireAdmin if exists */, async (req, res) => {
  const { new_owner_email } = req.body
  const claim = await GymClaim.findById(req.params.claimId)
  if (!claim) return res.status(404).json({ error: 'Claim not found' })

  const newOwner = await User.findOne({ email: new_owner_email })
  if (!newOwner) return res.status(404).json({ error: 'User not found with that email' })

  await Gym.findByIdAndUpdate(claim.gym, { owner: newOwner._id })
  await GymClaim.findByIdAndUpdate(req.params.claimId, { status: 'approved' })

  res.json({ success: true })
})
```

**Step 4: Commit**
```bash
git add server/src/routes/claim.routes.ts server/src/app.ts
git commit -m "feat: gym claim submission and super admin transfer ownership"
```

---

## Task 11: Auth fixes — frontend (6 bugs)

**Files:**
- Modify: `client/src/pages/Login.tsx`
- Modify: `client/src/pages/Register.tsx`
- Modify: `client/src/pages/VerifyOtp.tsx`
- Modify: `client/src/pages/ChooseRole.tsx`

**Step 1: Login.tsx — redirect if logged in + remove phone tab**

At top of `Login` component, add:
```typescript
const { user, loading } = useAuth()
// Existing: const { login } = useAuth() — merge into one destructure

useEffect(() => {
  if (!loading && user) {
    navigate(user.role === 'owner' ? '/owner' : '/m', { replace: true })
  }
}, [user, loading, navigate])
```

Remove the phone tab entirely: delete the tab switcher div (lines ~69-86), delete `handlePhoneSubmit` function, delete phone state variables, delete the `tab === 'phone'` branch. Keep only the email form.

**Step 2: Register.tsx — redirect if logged in**

Add the same `useEffect` redirect at top of `Register` component:
```typescript
const { user, loading } = useAuth()

useEffect(() => {
  if (!loading && user) {
    navigate(user.role === 'owner' ? '/owner' : '/m', { replace: true })
  }
}, [user, loading, navigate])
```

**Step 3: VerifyOtp.tsx — redirect if no phone in state**

At top of component:
```typescript
const location = useLocation()
const phone = location.state?.phone

useEffect(() => {
  if (!phone) navigate('/login', { replace: true })
}, [phone, navigate])
```

**Step 4: ChooseRole.tsx — redirect if role already set**

Add at top:
```typescript
const { user, loading } = useAuth()

useEffect(() => {
  if (!loading && user?.role) {
    navigate(user.role === 'owner' ? '/owner' : '/m', { replace: true })
  }
}, [user, loading, navigate])
```

**Step 5: Fix phone error message in Register.tsx**

Find the catch block in the registration submit handler. Change:
```typescript
// Before:
setError(err.response?.data?.error || 'Registration failed')

// After:
const msg = err.response?.data?.error || ''
if (msg.includes('phone') || (err.response?.status === 409 && msg.includes('already'))) {
  setError('This phone number is already registered')
} else if (err.response?.status === 409) {
  setError('This email is already registered')
} else {
  setError(msg || 'Registration failed')
}
```

**Step 6: Verify sparse unique index on User.phone (server)**
```bash
# SSH to VPS and run in mongo shell or check the drop-indexes script ran cleanly
grep -n "phone" server/src/models/User.ts
```
Confirm it shows `sparse: true, unique: true`. If the old non-sparse index is still there, re-run:
```bash
cd server && npm run drop-indexes
```

**Step 7: Commit**
```bash
git add client/src/pages/Login.tsx client/src/pages/Register.tsx client/src/pages/VerifyOtp.tsx client/src/pages/ChooseRole.tsx
git commit -m "fix: auth redirect guards, remove phone login tab, improve error messages"
```

---

## Task 12: Public landing page (gym directory)

**Files:**
- Create: `client/src/pages/public/LandingPage.tsx`
- Modify: `client/src/App.tsx`
- Modify: `client/src/api/public.ts`

**Step 1: Add API function to `client/src/api/public.ts`**
```typescript
export async function getPublicGyms() {
  const res = await axios.get('/api/public/gyms')
  return res.data.data as GymCard[]
}

export interface GymCard {
  slug: string
  name: string
  city: string | null
  logo_url: string | null
  facilities: string[]
  timing_mode: 'slots' | '24x7'
  timing_slots: { label: string; open: string; close: string }[]
  description: string | null
}
```

**Step 2: Create `client/src/pages/public/LandingPage.tsx`**
```typescript
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getPublicGyms, GymCard } from '@/api/public'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonCard } from '@/components/shared/Skeleton'

export default function LandingPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [gyms, setGyms] = useState<GymCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPublicGyms().then(setGyms).finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-accent-primary">GymRep</h1>
        {!authLoading && (
          user
            ? <Button onClick={() => navigate(user.role === 'owner' ? '/owner' : '/m')}>Dashboard →</Button>
            : <div className="flex gap-2">
                <Link to="/login"><Button variant="ghost">Login</Button></Link>
                <Link to="/register"><Button>Register</Button></Link>
              </div>
        )}
      </div>

      {/* Hero */}
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-text-primary mb-2">Find your gym</h2>
        <p className="text-text-secondary">Gyms powered by GymRep</p>
      </div>

      {/* Gym Grid */}
      {loading ? (
        <div className="grid gap-4">
          {[1,2,3].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : gyms.length === 0 ? (
        <p className="text-center text-text-secondary py-12">No gyms listed yet.</p>
      ) : (
        <div className="grid gap-4">
          {gyms.map(gym => (
            <Link key={gym.slug} to={`/gym/${gym.slug}`}>
              <Card className="p-4 hover:border-accent-primary transition-colors">
                <div className="flex items-center gap-3">
                  {gym.logo_url
                    ? <img src={gym.logo_url} alt={gym.name} className="w-12 h-12 rounded-xl object-cover" />
                    : <div className="w-12 h-12 rounded-xl bg-bg-elevated flex items-center justify-center text-lg font-bold text-accent-primary">{gym.name[0]}</div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text-primary truncate">{gym.name}</p>
                    {gym.city && <p className="text-sm text-text-secondary capitalize">{gym.city}</p>}
                  </div>
                </div>
                {gym.facilities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {gym.facilities.slice(0, 4).map(f => (
                      <span key={f} className="text-xs bg-bg-elevated text-text-secondary px-2 py-0.5 rounded-full">{f}</span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-text-secondary mt-2">
                  {gym.timing_mode === '24x7' ? '24×7 open' : gym.timing_slots.map(s => `${s.label} ${s.open}–${s.close}`).join(' · ')}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 3: Update `client/src/App.tsx`**

Import LandingPage and update the root route:
```typescript
import LandingPage from '@/pages/public/LandingPage'

// Replace <Route path="/" element={<RootRedirect />} /> with:
<Route path="/" element={<LandingPage />} />

// RootRedirect is no longer needed for "/", but keep it if used elsewhere — else delete
```

**Step 4: Run dev server and verify**
```bash
cd client && pnpm dev
```
Open `localhost:5173` — should show gym directory (empty if no gyms seeded).

**Step 5: Commit**
```bash
git add client/src/pages/public/LandingPage.tsx client/src/App.tsx client/src/api/public.ts
git commit -m "feat: public gym directory landing page"
```

---

## Task 13: Settings — timing slots UI

**Files:**
- Modify: `client/src/pages/owner/Settings.tsx`
- Modify: `client/src/api/gym.ts`

**Step 1: Update `getMyGym` and `updateGym` types in `client/src/api/gym.ts`** to include `timing_mode`, `timing_slots`, `plan_types`, `pricing` (remove `opening_time`/`closing_time`).

**Step 2: In `Settings.tsx`, replace opening/closing time fields with timing section**

Add state:
```typescript
const [timingMode, setTimingMode] = useState<'slots' | '24x7'>('slots')
const [timingSlots, setTimingSlots] = useState([
  { label: 'Morning', open: '06:00', close: '12:00' },
  { label: 'Evening', open: '16:00', close: '22:00' },
])
```

Populate from API response (in `loadGym`):
```typescript
setTimingMode(gym.timing_mode || 'slots')
setTimingSlots(gym.timing_slots || [...defaultSlots])
```

Render timing section (below existing form fields):
```typescript
<div className="space-y-3">
  <label className="block text-sm text-text-secondary">Timing</label>

  {/* 24x7 toggle */}
  <label className="flex items-center gap-3 cursor-pointer">
    <input
      type="checkbox"
      checked={timingMode === '24x7'}
      onChange={e => setTimingMode(e.target.checked ? '24x7' : 'slots')}
      className="w-4 h-4"
    />
    <span className="text-sm text-text-primary">24×7 Open</span>
  </label>

  {timingMode === 'slots' && (
    <div className="space-y-2">
      {timingSlots.map((slot, idx) => (
        <div key={idx} className="flex gap-2 items-center">
          <input
            className="bg-bg-card border border-border-light rounded-lg px-3 py-2 text-sm w-24"
            placeholder="Label"
            value={slot.label}
            onChange={e => {
              const updated = [...timingSlots]
              updated[idx] = { ...updated[idx], label: e.target.value }
              setTimingSlots(updated)
            }}
          />
          <input type="time" value={slot.open} className="bg-bg-card border border-border-light rounded-lg px-3 py-2 text-sm"
            onChange={e => { const u = [...timingSlots]; u[idx] = {...u[idx], open: e.target.value}; setTimingSlots(u) }} />
          <span className="text-text-secondary text-sm">to</span>
          <input type="time" value={slot.close} className="bg-bg-card border border-border-light rounded-lg px-3 py-2 text-sm"
            onChange={e => { const u = [...timingSlots]; u[idx] = {...u[idx], close: e.target.value}; setTimingSlots(u) }} />
          {timingSlots.length > 1 && (
            <button onClick={() => setTimingSlots(timingSlots.filter((_, i) => i !== idx))}
              className="text-status-red text-sm">✕</button>
          )}
        </div>
      ))}
      {timingSlots.length < 4 && (
        <button onClick={() => setTimingSlots([...timingSlots, { label: '', open: '06:00', close: '22:00' }])}
          className="text-accent-primary text-sm">+ Add slot</button>
      )}
    </div>
  )}
</div>
```

Include `timing_mode` and `timing_slots` in the save payload.

**Step 3: Commit**
```bash
git add client/src/pages/owner/Settings.tsx client/src/api/gym.ts
git commit -m "feat: timing slots editor in gym settings"
```

---

## Task 14: Settings — plan types + pricing UI

**Files:**
- Modify: `client/src/pages/owner/Settings.tsx`

**Step 1: Add plan types state**
```typescript
const [planTypes, setPlanTypes] = useState([
  { id: 'strength', name: 'Strength' },
  { id: 'strength_cardio', name: 'Strength + Cardio' },
])
const [pricing, setPricing] = useState<Record<string, Record<string, number>>>({})
const DURATIONS = ['monthly', 'quarterly', 'half_yearly', 'yearly']
const DURATION_LABELS: Record<string, string> = {
  monthly: 'Monthly', quarterly: 'Quarterly', half_yearly: '6 Months', yearly: 'Yearly'
}
```

**Step 2: Render pricing grid**
```typescript
<div className="space-y-4">
  <label className="block text-sm text-text-secondary">Plans & Pricing</label>
  {planTypes.map((pt) => (
    <div key={pt.id} className="bg-bg-elevated rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2">
        <input
          className="bg-bg-card border border-border-light rounded-lg px-3 py-1.5 text-sm flex-1"
          value={pt.name}
          onChange={e => setPlanTypes(planTypes.map(p => p.id === pt.id ? {...p, name: e.target.value} : p))}
        />
        {planTypes.length > 1 && (
          <button onClick={() => setPlanTypes(planTypes.filter(p => p.id !== pt.id))}
            className="text-status-red text-sm">✕</button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {DURATIONS.map(dur => (
          <div key={dur} className="flex items-center gap-2">
            <span className="text-xs text-text-secondary w-16">{DURATION_LABELS[dur]}</span>
            <input
              type="number"
              className="bg-bg-card border border-border-light rounded-lg px-2 py-1 text-sm w-full"
              placeholder="₹0"
              value={pricing[pt.id]?.[dur] || ''}
              onChange={e => setPricing({
                ...pricing,
                [pt.id]: { ...(pricing[pt.id] || {}), [dur]: Number(e.target.value) }
              })}
            />
          </div>
        ))}
      </div>
    </div>
  ))}
  <button
    onClick={() => {
      const id = `plan_${Date.now()}`
      setPlanTypes([...planTypes, { id, name: 'New Plan' }])
    }}
    className="text-accent-primary text-sm">+ Add plan type</button>
</div>
```

Include `plan_types` and `pricing` in the save payload.

**Step 3: Fix settings stay-after-save**

In the save handler, after successful API response, update state from the response directly:
```typescript
const updated = await updateGym(gymId, payload)
// Update local form from response (not re-fetch)
setTimingMode(updated.timing_mode)
setTimingSlots(updated.timing_slots)
setPlanTypes(updated.plan_types)
setPricing(updated.pricing)
setInitialForm(JSON.stringify(getFormSnapshot())) // reset dirty tracker
toast('Saved ✓', 'success')
```

Do NOT call `loadGym()` again after save.

**Step 4: Commit**
```bash
git add client/src/pages/owner/Settings.tsx
git commit -m "feat: plan types and pricing grid in gym settings + fix stay-after-save"
```

---

## Task 15: Attendance UI — today's list + busy hours

**Files:**
- Modify: `client/src/pages/owner/Dashboard.tsx`
- Modify: `client/src/api/owner.ts`

**Step 1: Add API calls to `client/src/api/owner.ts`**
```typescript
export async function getTodayAttendance(gymId: string) {
  const res = await axios.get(`/api/gym/${gymId}/attendance/today`)
  return res.data as { data: any[], count: number }
}

export async function getBusyHours(gymId: string) {
  const res = await axios.get(`/api/gym/${gymId}/attendance/busy-hours`)
  return res.data.data as { hour: number, count: number }[]
}
```

**Step 2: Add today's check-ins widget to Dashboard**

In `Dashboard.tsx`, after the existing stats cards, add a collapsible "Today's Check-ins" card:
```typescript
const [todayAttendance, setTodayAttendance] = useState<{name:string, checked_in_at:string}[]>([])
const [showToday, setShowToday] = useState(false)

// In loadData():
const att = await getTodayAttendance(gym._id)
setTodayAttendance(att.data.map((r:any) => ({
  name: r.member?.name || 'Unknown',
  checked_in_at: new Date(r.checked_in_at).toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit', hour12:true})
})))
```

Render:
```typescript
<Card className="p-4">
  <button
    onClick={() => setShowToday(v => !v)}
    className="w-full flex items-center justify-between"
  >
    <span className="font-semibold text-text-primary">Today's Check-ins</span>
    <span className="text-accent-primary font-bold">{todayAttendance.length}</span>
  </button>
  {showToday && (
    <div className="mt-3 space-y-2">
      {todayAttendance.length === 0
        ? <p className="text-text-secondary text-sm">No check-ins yet today</p>
        : todayAttendance.map((r, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-text-primary">{r.name}</span>
            <span className="text-text-secondary">{r.checked_in_at}</span>
          </div>
        ))}
    </div>
  )}
</Card>
```

**Step 3: Add busy hours bar chart**

Simple CSS bar chart (no charting library needed):
```typescript
// In Dashboard, add:
const [busyHours, setBusyHours] = useState<{hour:number, count:number}[]>([])

// In loadData():
const bh = await getBusyHours(gym._id)
setBusyHours(bh)

// Render — only show hours 5am-11pm to reduce noise:
const maxCount = Math.max(...busyHours.map(h => h.count), 1)
const relevantHours = busyHours.filter(h => h.hour >= 5 && h.hour <= 23)

<Card className="p-4">
  <p className="font-semibold text-text-primary mb-3">Busy Hours (last 30 days)</p>
  <div className="flex items-end gap-1 h-16">
    {relevantHours.map(h => (
      <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
        <div
          className="w-full bg-accent-primary rounded-t-sm"
          style={{ height: `${(h.count / maxCount) * 100}%`, minHeight: h.count > 0 ? '4px' : '0' }}
        />
        <span className="text-[10px] text-text-secondary">{h.hour > 12 ? `${h.hour-12}p` : `${h.hour}a`}</span>
      </div>
    ))}
  </div>
</Card>
```

**Step 4: Commit**
```bash
git add client/src/pages/owner/Dashboard.tsx client/src/api/owner.ts
git commit -m "feat: today check-ins and busy hours widgets on dashboard"
```

---

## Task 16: QR scanner — friendly duplicate message

**Files:**
- Modify: `client/src/pages/owner/ScanCheckin.tsx`

**Step 1: Find where check-in API response is handled**
```bash
grep -n "checkin\|check_in\|scan" client/src/pages/owner/ScanCheckin.tsx | head -20
```

**Step 2: Handle `already_checked_in` in response**

In the success handler for the check-in API call:
```typescript
const result = await checkin(gymId, memberId)
if (result.already_checked_in) {
  toast(result.message, 'warning') // "Already checked in today at 9:14 AM"
} else {
  toast('Checked in!', 'success')
}
```

**Step 3: Commit**
```bash
git add client/src/pages/owner/ScanCheckin.tsx
git commit -m "fix: show friendly message when member already checked in today"
```

---

## Task 17: Join gym — request-only UI

**Files:**
- Modify: `client/src/pages/member/JoinGym.tsx`
- Modify: `client/src/api/me.ts`

**Step 1: Add API functions to `client/src/api/me.ts`**
```typescript
export async function requestToJoinGym(slug: string) {
  const res = await axios.post('/api/me/join-gym-request', { slug })
  return res.data
}

export async function cancelJoinRequest(gymId: string) {
  const res = await axios.delete(`/api/me/join-request/${gymId}`)
  return res.data
}

export async function getPendingJoinRequests() {
  const res = await axios.get('/api/me/join-requests')
  return res.data.data
}
```

**Step 2: Update `JoinGym.tsx`**

Replace `handleJoin` with `handleRequest`:
```typescript
const [requested, setRequested] = useState(false)
const [requestedGymId, setRequestedGymId] = useState('')

async function handleRequest() {
  if (!preview) return
  setJoining(true)
  setError('')
  try {
    const result = await requestToJoinGym(preview.slug)
    setRequestedGymId(result.gymId)
    setRequested(true)
  } catch (err: any) {
    setError(err.response?.data?.error || 'Failed to send request')
  } finally {
    setJoining(false)
  }
}
```

Show pending state after request:
```typescript
{requested ? (
  <Card className="p-4 text-center space-y-3">
    <p className="text-text-primary font-medium">Request sent!</p>
    <p className="text-text-secondary text-sm">Waiting for gym owner to approve.</p>
    <Button variant="ghost" onClick={async () => {
      await cancelJoinRequest(requestedGymId)
      setRequested(false)
      setPreview(null)
    }}>Cancel Request</Button>
  </Card>
) : (
  // existing preview + request button
  preview && (
    <Button onClick={handleRequest} loading={joining} fullWidth>
      Request to Join
    </Button>
  )
)}
```

**Step 3: Check if `requestToJoinGym` needs backend endpoint**

Look for existing `join-gym-request` route in `server/src/routes/me.routes.ts`. If the old `joinGym` handler exists and creates a Lead with `source: 'app_request'`, just reuse it — just rename the API call on the frontend. If it does direct member creation, update it to create a Lead instead.

**Step 4: Commit**
```bash
git add client/src/pages/member/JoinGym.tsx client/src/api/me.ts
git commit -m "feat: join gym is now request-only with pending state"
```

---

## Task 18: Member profile — active membership card

**Files:**
- Modify: `client/src/pages/member/Profile.tsx`

**Step 1: Add days-remaining util**
```typescript
function daysUntil(dateStr: string): number {
  return Math.max(0, Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
}
```

**Step 2: Add membership card at top of profile**

Find the active membership (the one with latest `expiry_date` that is in the future):
```typescript
const activeMembership = data?.memberships
  ?.filter(m => new Date(m.expiry_date) > new Date())
  ?.sort((a, b) => new Date(b.expiry_date).getTime() - new Date(a.expiry_date).getTime())[0]
```

Render before the rest of the profile:
```typescript
{activeMembership ? (
  <Card className="p-4 border border-accent-primary/30 bg-accent-primary/5">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-xs text-text-secondary uppercase tracking-wide">Active Plan</p>
        <p className="font-bold text-text-primary mt-0.5">
          {activeMembership.plan_type_name || activeMembership.plan_type}
        </p>
        <p className="text-sm text-text-secondary mt-1">
          Expires {formatDate(activeMembership.expiry_date)}
        </p>
      </div>
      <div className="text-right">
        <p className="text-2xl font-bold text-accent-primary">{daysUntil(activeMembership.expiry_date)}</p>
        <p className="text-xs text-text-secondary">days left</p>
      </div>
    </div>
  </Card>
) : (
  <Card className="p-4 text-center">
    <p className="text-text-secondary text-sm">No active membership</p>
  </Card>
)}
```

**Step 3: Commit**
```bash
git add client/src/pages/member/Profile.tsx
git commit -m "feat: active membership card on member profile"
```

---

## Task 19: Owner profile page

**Files:**
- Create: `client/src/pages/owner/Profile.tsx`
- Modify: `client/src/App.tsx`
- Modify: `client/src/components/layout/OwnerLayout.tsx` (add Profile link to nav)

**Step 1: Create `client/src/pages/owner/Profile.tsx`**
```typescript
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { getMyGym } from '@/api/gym'
import { updateProfile } from '@/api/me'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function OwnerProfile() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [gym, setGym] = useState<{ name: string; city: string; slug: string } | null>(null)
  const [name, setName] = useState(user?.full_name || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getMyGym().then(g => setGym({ name: g.name, city: g.city, slug: g.slug })).catch(() => {})
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      await updateProfile({ name })
      toast('Profile updated', 'success')
    } catch {
      toast('Failed to update', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-text-primary">My Profile</h1>

      <Card className="p-4 space-y-4">
        <Input label="Name" value={name} onChange={e => setName(e.target.value)} />
        <div>
          <label className="block text-sm text-text-secondary mb-1">Email</label>
          <p className="text-text-primary">{user?.email || '—'}</p>
        </div>
        <Button onClick={handleSave} loading={saving} fullWidth>Save</Button>
      </Card>

      {gym && (
        <Card className="p-4 space-y-3">
          <p className="font-semibold text-text-primary">{gym.name}</p>
          {gym.city && <p className="text-sm text-text-secondary capitalize">{gym.city}</p>}
          <a
            href={`/gym/${gym.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary text-sm font-medium"
          >
            View public page →
          </a>
        </Card>
      )}
    </div>
  )
}
```

**Step 2: Add route in `App.tsx`**
```typescript
import OwnerProfile from '@/pages/owner/Profile'
// In owner routes:
<Route path="profile" element={<OwnerProfile />} />
```

**Step 3: Add Profile link in `OwnerLayout.tsx` nav**

Find the nav items array and add:
```typescript
{ path: '/owner/profile', label: 'Profile', icon: UserIcon }
```

**Step 4: Commit**
```bash
git add client/src/pages/owner/Profile.tsx client/src/App.tsx client/src/components/layout/OwnerLayout.tsx
git commit -m "feat: owner profile page with view public gym link"
```

---

## Task 20: Gym claim form (public gym page)

**Files:**
- Modify: `client/src/pages/public/GymPage.tsx`
- Modify: `client/src/api/public.ts`

**Step 1: Add claim API call**
```typescript
// client/src/api/public.ts
export async function submitGymClaim(gymId: string, data: {
  claimant_name: string
  claimant_phone: string
  claimant_email: string
  reason: string
}) {
  const res = await axios.post(`/api/public/gym/${gymId}/claim`, data)
  return res.data
}
```

**Step 2: Add claim section to bottom of GymPage**

At the bottom of `GymPage.tsx`, below all existing content:
```typescript
const [showClaim, setShowClaim] = useState(false)
const [claimForm, setClaimForm] = useState({ claimant_name:'', claimant_phone:'', claimant_email:'', reason:'' })
const [claimSent, setClaimSent] = useState(false)
const [claimLoading, setClaimLoading] = useState(false)

// Render at bottom:
<div className="mt-12 pt-6 border-t border-border-light">
  {!showClaim ? (
    <button onClick={() => setShowClaim(true)} className="text-xs text-text-secondary underline">
      Claim this gym
    </button>
  ) : claimSent ? (
    <p className="text-sm text-text-secondary text-center">
      Claim submitted. We'll review it within 2–3 business days.
    </p>
  ) : (
    <div className="space-y-3">
      <p className="text-sm font-medium text-text-primary">Claim this gym</p>
      <p className="text-xs text-text-secondary">If you own this gym and didn't register it, fill this form.</p>
      <Input label="Your Name" value={claimForm.claimant_name}
        onChange={e => setClaimForm({...claimForm, claimant_name: e.target.value})} />
      <Input label="Phone" value={claimForm.claimant_phone}
        onChange={e => setClaimForm({...claimForm, claimant_phone: e.target.value})} />
      <Input label="Email" type="email" value={claimForm.claimant_email}
        onChange={e => setClaimForm({...claimForm, claimant_email: e.target.value})} />
      <div>
        <label className="block text-sm text-text-secondary mb-1">Reason</label>
        <textarea
          className="w-full bg-bg-card border border-border-light rounded-xl px-4 py-3 text-sm"
          rows={3}
          placeholder="I am the owner of this gym and..."
          value={claimForm.reason}
          onChange={e => setClaimForm({...claimForm, reason: e.target.value})}
        />
      </div>
      <Button
        fullWidth
        loading={claimLoading}
        onClick={async () => {
          setClaimLoading(true)
          try {
            await submitGymClaim(gymData._id, claimForm)
            setClaimSent(true)
          } catch {
            toast('Failed to submit claim', 'error')
          } finally {
            setClaimLoading(false)
          }
        }}
      >Submit Claim</Button>
    </div>
  )}
</div>
```

Note: `gymData._id` — check how GymPage stores the gym object (may need to include `_id` in the public gym API response).

**Step 3: Commit**
```bash
git add client/src/pages/public/GymPage.tsx client/src/api/public.ts
git commit -m "feat: gym claim form on public gym page"
```

---

## Task 21: Super admin — claims list

**Files:**
- Create: `client/src/pages/super-admin/Claims.tsx` (or wherever super-admin pages live — check `client/src/pages/` for the pattern)

**Step 1: Find super-admin page pattern**
```bash
ls client/src/pages/
```
Look for a `super-admin/` or `admin/` directory.

**Step 2: Create Claims page using the same pattern as other super-admin pages**

The page should:
- Fetch `GET /api/admin/claims?status=pending`
- Show claim cards: gym name, claimant info, reason, date
- Two buttons per claim: "Transfer Ownership" (opens modal to enter new owner email) + "Reject"
- On transfer: `POST /api/admin/claims/:claimId/transfer` with `{ new_owner_email }`
- On reject: `PATCH /api/admin/claims/:claimId` with `{ status: 'rejected' }`

**Step 3: Add to super-admin nav/routes**

**Step 4: Commit**
```bash
git add client/src/pages/super-admin/Claims.tsx
git commit -m "feat: claims management page in super admin"
```

---

## Task 22: Build + deploy

**Step 1: TypeScript check**
```bash
cd client && npx tsc --noEmit
cd server && npx tsc --noEmit
```
Fix all errors before proceeding.

**Step 2: Build client**
```bash
cd client && pnpm build
```

**Step 3: Run server tests**
```bash
cd server && npm test
```
All should pass.

**Step 4: Run data migration on VPS FIRST (before deploy)**
```bash
ssh root@65.20.86.56
cd /var/www/gymrep/server && npm run migrate-gym-schema
```
Verify existing gym data looks correct in MongoDB Atlas before proceeding.

**Step 5: Deploy to VPS**
```bash
cd ~/studio/products/gymrep && bash deploy/deploy.sh 65.20.86.56
```

**Step 6: Run drop-indexes on VPS (REQUIRED — Gym model changed)**
```bash
ssh root@65.20.86.56
cd /var/www/gymrep/server && npm run drop-indexes
pm2 restart repcount
```

**Step 7: Smoke test existing gym**
- Visit gymrep.in → confirm gym directory shows the onboarded gym
- Log in as owner → Settings → confirm timing slots + pricing grid shows migrated data (not blank)
- Log in as a member → confirm profile and check-in still work

**Step 8: Update state files**
```bash
# Update ~/studio/state/gymrep/sprint.md — mark all stories complete
# Update ~/studio/state/gymrep/status.md — mark M3 shipped
```

**Step 9: Final commit**
```bash
cd ~/studio && git add state/gymrep/ && git commit -m "state: M3 shipped"
```
