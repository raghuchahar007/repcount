# Registration Flow + Multi-Gym Member Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add role selection for new users (owner vs member), member self-join gym by slug, multi-gym support with gym switcher, and multiple test phone numbers.

**Architecture:** After OTP verification, new users are redirected to a role selection screen. Members can join gyms by slug. Member context middleware supports a `gymId` param for multi-gym. OTP service accepts a comma-separated list of test phones that all share the same test OTP.

**Tech Stack:** Express 4, Mongoose, React 18, React Router v6, Zod, Tailwind CSS v4

---

### Task 1: Multi-Phone Test OTP Support

**Files:**
- Modify: `server/src/services/otp.service.ts`
- Modify: `server/.env`
- Modify: `server/.env.example`

**What to build:**

Change the OTP service from single test phone to a list of test phones.

**`otp.service.ts`** — replace lines 1-2 and update checks:
```typescript
const TEST_PHONES = new Set(
  (process.env.TEST_PHONES || process.env.TEST_PHONE || '+919999999999')
    .split(',')
    .map(p => p.trim())
)
const TEST_OTP = process.env.TEST_OTP || '123456'
```

Update `sendOtp` (line 11): `if (TEST_PHONES.has(phone))` instead of `if (phone === TEST_PHONE)`

Update `verifyOtp` (line 21): `if (TEST_PHONES.has(phone) && otp === TEST_OTP)` instead of `if (phone === TEST_PHONE && otp === TEST_OTP)`

**`.env`** — replace TEST_PHONE with TEST_PHONES:
```
TEST_PHONES=+919999999999,+919999999901,+919999999902,+919999999903,+919999999904,+919999999905,+919999999906,+919999999907
```

The intended assignments (for test seeding later):
- `+919999999999` — existing owner (Iron Paradise)
- `+919999999901` — owner #2
- `+919999999902` — owner #3
- `+919999999903` — member #1
- `+919999999904` — member #2
- `+919999999905` — member #3
- `+919999999906` — member #4
- `+919999999907` — member #5

**`.env.example`** — same but with placeholder:
```
TEST_PHONES=+919999999999,+919999999901
```

**Verify:** `cd server && npx tsc --noEmit`

**Commit:** `feat(server): support multiple test phone numbers for OTP bypass`

---

### Task 2: Server — set-role + join-gym + my-gyms endpoints

**Files:**
- Modify: `server/src/routes/auth.routes.ts` (add set-role endpoint, return isNewUser)
- Modify: `server/src/routes/me.routes.ts` (add join-gym + my-gyms endpoints)
- Modify: `server/src/middleware/memberContext.ts` (support gymId param for multi-gym)

**What to build:**

**2a. `auth.routes.ts` changes:**

In verify-otp handler, track if user is new:
```typescript
let isNewUser = false
let user = await User.findOne({ phone })
if (!user) {
  user = await User.create({ phone })  // NO default role — role is null until chosen
  isNewUser = true
}
```

Add `isNewUser` to response:
```typescript
res.json({
  accessToken,
  isNewUser,
  user: { id: user._id, phone: user.phone, role: user.role, full_name: user.full_name },
})
```

Add new endpoint — `PUT /api/auth/set-role`:
```typescript
const setRoleSchema = z.object({
  role: z.enum(['owner', 'member']),
})

router.put('/set-role', validate(setRoleSchema), async (req: Request, res: Response) => {
  // Need auth for this
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access token required' })
  }
  try {
    const payload = verifyAccessToken(authHeader.split(' ')[1])
    const user = await User.findById(payload.userId)
    if (!user) return res.status(404).json({ error: 'User not found' })

    // Only allow setting role if not already set (new users)
    if (user.role) {
      return res.status(400).json({ error: 'Role already set' })
    }

    user.role = req.body.role
    await user.save()

    // Re-issue tokens with updated role
    const tokenPayload = { userId: user._id.toString(), phone: user.phone, role: user.role }
    const accessToken = signAccessToken(tokenPayload)
    const refreshToken = signRefreshToken(tokenPayload)

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    })

    // If member, auto-link existing Member record
    if (user.role === 'member') {
      const tenDigitPhone = user.phone.replace('+91', '')
      await Member.updateOne(
        { phone: tenDigitPhone, user: null },
        { $set: { user: user._id } }
      )
    }

    res.json({
      accessToken,
      user: { id: user._id, phone: user.phone, role: user.role, full_name: user.full_name },
    })
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
})
```

Import `verifyAccessToken` from token.service at top.

**Also update User model** — make role optional for new users:
- Modify: `server/src/models/User.ts`
- Change role field: `default: null` instead of `default: 'member'`
- Update interface: `role: 'owner' | 'member' | 'admin' | null`

**2b. `me.routes.ts` additions:**

Add `GET /api/me/gyms` — list all gyms where member has records:
```typescript
router.get('/gyms', async (req: Request, res: Response) => {
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
```

Add `POST /api/me/join-gym` — member joins a gym by slug:
```typescript
const joinGymSchema = z.object({
  slug: z.string().min(1, 'Gym slug required'),
})

router.post('/join-gym', validate(joinGymSchema), async (req: Request, res: Response) => {
  try {
    const gym = await Gym.findOne({ slug: req.body.slug }).lean()
    if (!gym) return res.status(404).json({ error: 'Gym not found' })

    const phone = req.user!.phone.replace('+91', '')
    const existing = await Member.findOne({ gym: gym._id, phone })
    if (existing) {
      // Link user if not linked
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
```

Add import for `User`, `Gym`, `Types` at top of me.routes.ts.

**2c. `memberContext.ts` update — multi-gym support:**

Accept `gymId` from query param or `x-gym-id` header:
```typescript
export async function requireMemberContext(req: Request, res: Response, next: NextFunction) {
  try {
    const gymId = req.query.gymId as string || req.headers['x-gym-id'] as string

    let member
    if (gymId) {
      member = await Member.findOne({ user: req.user!.userId, gym: gymId })
    } else {
      // Default: most recently joined gym
      member = await Member.findOne({ user: req.user!.userId }).sort({ join_date: -1 })
    }

    if (!member) {
      return res.status(404).json({ error: 'Member profile not found', code: 'NO_GYM' })
    }
    req.member = member
    next()
  } catch {
    return res.status(500).json({ error: 'Failed to load member profile' })
  }
}
```

The `code: 'NO_GYM'` lets the client distinguish "no gym at all" (show join-gym) from other errors.

**Verify:** `cd server && npx tsc --noEmit`

**Commit:** `feat(server): registration role selection, join-gym, multi-gym member context`

---

### Task 3: Client — Choose Role Page

**Files:**
- Create: `client/src/pages/ChooseRole.tsx`
- Modify: `client/src/pages/VerifyOtp.tsx` (handle isNewUser redirect)
- Modify: `client/src/App.tsx` (add route)
- Modify: `client/src/api/auth.ts` (add setRole function)
- Modify: `client/src/contexts/AuthContext.tsx` (handle null role)

**What to build:**

**3a. `auth.ts`** — add setRole:
```typescript
export async function setRole(role: 'owner' | 'member') {
  const { data } = await api.put('/auth/set-role', { role })
  setAccessToken(data.accessToken)
  return data
}
```

**3b. `AuthContext.tsx`** — update AuthUser interface to allow null role:
```typescript
interface AuthUser {
  id: string
  phone: string
  role: 'owner' | 'member' | 'admin' | null
  full_name: string | null
}
```

Update `RootRedirect` in App.tsx to handle null role:
```typescript
if (!user) return <Navigate to="/login" replace />
if (!user.role) return <Navigate to="/choose-role" replace />
return <Navigate to={user.role === 'owner' ? '/owner' : '/m'} replace />
```

**3c. `VerifyOtp.tsx`** — handle isNewUser in the verify response:
```typescript
const data = await verifyOtp(phone, otpString)
login(data.accessToken, data.user)
if (data.isNewUser || !data.user.role) {
  navigate('/choose-role', { replace: true })
} else if (data.user.role === 'owner') {
  navigate('/owner', { replace: true })
} else {
  navigate('/m', { replace: true })
}
```

**3d. `ChooseRole.tsx`** — two-card selection page:
```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { setRole } from '@/api/auth'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function ChooseRole() {
  const [selected, setSelected] = useState<'owner' | 'member' | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleContinue() {
    if (!selected) return
    setLoading(true)
    setError('')
    try {
      const data = await setRole(selected)
      login(data.accessToken, data.user)
      navigate(selected === 'owner' ? '/owner/settings' : '/m', { replace: true })
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to set role')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-primary mb-2">Welcome to GymRep</h1>
          <p className="text-text-secondary text-sm">How will you use the app?</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => setSelected('owner')}
            className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${
              selected === 'owner'
                ? 'border-accent-orange bg-accent-orange/5'
                : 'border-border-light bg-bg-card'
            }`}
          >
            <span className="text-3xl">🏋️</span>
            <h3 className="text-lg font-bold text-text-primary mt-2">I own a gym</h3>
            <p className="text-text-secondary text-sm mt-1">
              Manage members, payments, attendance, and grow your gym
            </p>
          </button>

          <button
            onClick={() => setSelected('member')}
            className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${
              selected === 'member'
                ? 'border-accent-orange bg-accent-orange/5'
                : 'border-border-light bg-bg-card'
            }`}
          >
            <span className="text-3xl">💪</span>
            <h3 className="text-lg font-bold text-text-primary mt-2">I'm a gym member</h3>
            <p className="text-text-secondary text-sm mt-1">
              Track workouts, diet, attendance, and stay motivated
            </p>
          </button>
        </div>

        {error && <p className="text-status-red text-sm text-center">{error}</p>}

        <Button
          fullWidth
          loading={loading}
          disabled={!selected}
          onClick={handleContinue}
        >
          Continue
        </Button>
      </div>
    </div>
  )
}
```

**3e. `App.tsx`** — add route:
```tsx
import ChooseRole from '@/pages/ChooseRole'
// ...
<Route path="/choose-role" element={<ChooseRole />} />
```

**Verify:** `cd client && npx tsc --noEmit`

**Commit:** `feat(client): role selection page for new users`

---

### Task 4: Client — Join Gym Page + Gym Switcher

**Files:**
- Create: `client/src/pages/member/JoinGym.tsx`
- Modify: `client/src/api/me.ts` (add joinGym, getMyGyms)
- Modify: `client/src/pages/member/Home.tsx` (handle NO_GYM → redirect to join)
- Modify: `client/src/components/layout/MemberLayout.tsx` (gym switcher in header)
- Modify: `client/src/App.tsx` (add join-gym route)

**What to build:**

**4a. `me.ts`** — add API functions:
```typescript
export async function joinGym(slug: string) {
  const { data } = await api.post('/me/join-gym', { slug })
  return data
}

export async function getMyGyms() {
  const { data } = await api.get('/me/gyms')
  return data
}
```

**4b. `JoinGym.tsx`** — page for members to join a gym by slug:
- Input field for gym slug (e.g. "iron-paradise")
- Preview gym info after entering slug (call public API)
- "Join" button → calls `joinGym(slug)`
- On success → redirect to `/m`
- Show error for invalid slug / already joined

**4c. `Home.tsx`** — handle the case where member has no gym:
- If `getHome()` returns error with `code: 'NO_GYM'`, redirect to `/m/join-gym`

**4d. `MemberLayout.tsx`** — gym switcher:
- On mount, call `getMyGyms()`
- If 2+ gyms: show dropdown in header to switch active gym
- Store active gymId in localStorage key `gymrep_active_gym`
- Pass gymId as `x-gym-id` header on all member API calls

To pass gymId on all requests, add an axios request interceptor in `me.ts` or update `axios.ts`:
```typescript
// In axios.ts request interceptor, add:
const activeGym = localStorage.getItem('gymrep_active_gym')
if (activeGym) {
  config.headers['x-gym-id'] = activeGym
}
```

**4e. `App.tsx`** — add join-gym route inside /m:
```tsx
<Route path="join-gym" element={<JoinGymPage />} />
```

**Verify:** `cd client && npx tsc --noEmit`

**Commit:** `feat(client): join-gym page, gym switcher for multi-gym members`

---

### Task 5: ProtectedRoute + RootRedirect Updates

**Files:**
- Modify: `client/src/components/shared/ProtectedRoute.tsx`
- Modify: `client/src/App.tsx` (RootRedirect)

**What to build:**

Update ProtectedRoute to handle null role:
```typescript
// If user has no role yet, redirect to choose-role
if (!user.role) {
  return <Navigate to="/choose-role" replace />
}
// Then existing role check
if (requiredRole && user.role !== requiredRole) {
  return <Navigate to="/" replace />
}
```

Update RootRedirect in App.tsx:
```typescript
function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  if (!user) return <Navigate to="/login" replace />
  if (!user.role) return <Navigate to="/choose-role" replace />
  return <Navigate to={user.role === 'owner' ? '/owner' : '/m'} replace />
}
```

**Verify:** `cd client && npx tsc --noEmit`

**Commit:** `feat(client): handle null role in route guards`

---

### Task 6: Seed Test Data

**Files:**
- Create: `server/src/scripts/seed.ts`

**What to build:**

A seed script that:
1. Drops existing test data (optional, behind a flag)
2. Creates test users, gyms, members, memberships, attendance, posts, and leads

**Test accounts (all use OTP: 123456):**

| Phone | Role | Name | Purpose |
|-------|------|------|---------|
| +919999999999 | owner | Raj Fitness | Owner of "Iron Paradise" (existing) |
| +919999999901 | owner | Priya Wellness | Owner of "FitZone Agra" |
| +919999999902 | owner | Amit Power | Owner of "PowerHouse Gym" |
| +919999999903 | member | Rahul Sharma | Member at Iron Paradise |
| +919999999904 | member | Sneha Patel | Member at Iron Paradise + FitZone |
| +919999999905 | member | Vikram Singh | Member at FitZone |
| +919999999906 | member | Anita Kumari | Member at PowerHouse |
| +919999999907 | member | Deepak Yadav | Member at Iron Paradise |

**Gyms:**
- Iron Paradise (slug: iron-paradise, owner: 9999999999) — already exists, skip if found
- FitZone Agra (slug: fitzone-agra, owner: 9999999901) — monthly: 800, quarterly: 2000
- PowerHouse Gym (slug: powerhouse-gym, owner: 9999999902) — monthly: 1500, quarterly: 4000

**Memberships:** Create active memberships for all members at their respective gyms.

**Attendance:** Seed 10-15 check-ins for members across the last 30 days to populate streaks and leaderboard.

**Posts:** Create 1-2 posts per gym (challenge + announcement).

**Leads:** Create 2 leads for Iron Paradise, 1 for FitZone.

**Script structure:**
```typescript
import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config()
import { User } from '../models/User'
import { Gym } from '../models/Gym'
import { Member } from '../models/Member'
import { Membership } from '../models/Membership'
import { Attendance } from '../models/Attendance'
import { GymPost } from '../models/GymPost'
import { Lead } from '../models/Lead'

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI!)
  console.log('Connected to MongoDB')

  // ... create all data, using findOneAndUpdate with upsert to be idempotent

  console.log('Seed complete!')
  process.exit(0)
}

seed().catch(err => { console.error(err); process.exit(1) })
```

Add npm script in `server/package.json`:
```json
"seed": "npx ts-node src/scripts/seed.ts"
```

**Run:** `cd server && npm run seed`

**Verify:** Check data in MongoDB: `mongosh gymrep --eval "db.users.countDocuments()"` should show 8 users.

**Commit:** `feat(server): seed script with test users, gyms, members, attendance`

---

### Task 7: Integration Test + Fixes

**Steps:**
1. Run `cd server && npx tsc --noEmit` — fix any errors
2. Run `cd client && npx tsc --noEmit` — fix any errors
3. Run seed script: `cd server && npm run seed`
4. Start dev servers: `npm run dev`
5. Test flows via curl:
   - New user registration: send-otp → verify-otp (should get isNewUser:true) → set-role
   - Owner flow: login as +919999999901 → create gym → add member
   - Member flow: login as +919999999904 → get home → get gyms (should show 2) → switch gym
   - Member join gym: login as new member → join gym by slug
   - Public: GET /api/public/gym/fitzone-agra
6. Test in browser: full registration flow for new user

**Commit:** `fix: registration + multi-gym integration fixes`

---

## Summary

| Task | Description | Creates/Modifies |
|------|-------------|-----------------|
| 1 | Multi-phone test OTP | otp.service.ts, .env |
| 2 | Server: set-role, join-gym, my-gyms, multi-gym context | auth.routes, me.routes, memberContext |
| 3 | Client: Choose Role page | ChooseRole.tsx, VerifyOtp, AuthContext, App.tsx |
| 4 | Client: Join Gym page + gym switcher | JoinGym.tsx, MemberLayout, me.ts, axios.ts |
| 5 | ProtectedRoute + RootRedirect for null role | ProtectedRoute.tsx, App.tsx |
| 6 | Seed test data (8 users, 3 gyms, memberships, attendance) | seed.ts |
| 7 | Integration test + fixes | both |
