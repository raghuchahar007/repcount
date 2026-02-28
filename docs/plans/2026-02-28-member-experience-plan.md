# Member Experience Improvements — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix broken no-gym experience, add gym discovery with join requests, badges, referrals, workout/diet tracking, and daily motivation quotes.

**Architecture:** Reuse Lead model for join requests (new source types). New DailyLog model for workout/diet completion. Badge awarding runs as a server-side function after check-in. Motivation quotes are client-only constants. All member pages get a shared NoGymCard fallback.

**Tech Stack:** Express 4, Mongoose, React 18, React Router v6, Tailwind CSS v4, Vite

---

### Task 1: NoGymCard shared component

**Files:**
- Create: `client/src/components/shared/NoGymCard.tsx`

**Step 1: Create the NoGymCard component**

```tsx
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'

export function NoGymCard({ feature }: { feature?: string }) {
  return (
    <div className="p-4 flex flex-col items-center justify-center min-h-[60vh]">
      <Card>
        <div className="text-center py-6">
          <span className="text-5xl block mb-4">🏋️</span>
          <h2 className="text-lg font-bold text-text-primary mb-2">No Gym Yet</h2>
          <p className="text-text-secondary text-sm mb-4">
            {feature
              ? `Join a gym to unlock ${feature}`
              : 'Join a gym to get started'}
          </p>
          <Link
            to="/m/discover"
            className="inline-block bg-accent-orange text-white font-semibold text-sm px-6 py-2.5 rounded-xl"
          >
            Discover Gyms
          </Link>
        </div>
      </Card>
    </div>
  )
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd client && npx tsc --noEmit`
Expected: 0 errors

**Step 3: Commit**

```bash
git add client/src/components/shared/NoGymCard.tsx
git commit -m "feat: add NoGymCard shared component"
```

---

### Task 2: Wire NoGymCard into all member pages

**Files:**
- Modify: `client/src/pages/member/Home.tsx` — change NO_GYM redirect to `/m/discover`
- Modify: `client/src/pages/member/Profile.tsx` — add NO_GYM handling
- Modify: `client/src/pages/member/Diet.tsx` — add NO_GYM handling
- Modify: `client/src/pages/member/Workout.tsx` — add NO_GYM handling
- Modify: `client/src/pages/member/Feed.tsx` — add NO_GYM handling
- Modify: `client/src/pages/member/Leaderboard.tsx` — add NO_GYM handling

**Step 1: Update Home.tsx**

Change the NO_GYM error handler from navigating to `/m/join-gym` to `/m/discover`:

In `Home.tsx`, find:
```tsx
if (err?.response?.data?.code === 'NO_GYM') {
  navigate('/m/join-gym', { replace: true })
  return
}
```
Replace with:
```tsx
if (err?.response?.data?.code === 'NO_GYM') {
  navigate('/m/discover', { replace: true })
  return
}
```

**Step 2: Update Profile.tsx**

Add import at top:
```tsx
import { NoGymCard } from '@/components/shared/NoGymCard'
```

In the error handler of `getProfile()`, detect NO_GYM and set a state flag. Add early return:
```tsx
const [noGym, setNoGym] = useState(false)
```

In the catch block:
```tsx
.catch((err: any) => {
  if (err?.response?.data?.code === 'NO_GYM') {
    setNoGym(true)
  } else {
    setError('Failed to load profile')
  }
})
```

After loading check, before error check:
```tsx
if (noGym) return <NoGymCard feature="your profile" />
```

**Step 3: Update Diet.tsx**

Same pattern — add `noGym` state, catch `NO_GYM`, return `<NoGymCard feature="diet plans" />`.

**Step 4: Update Workout.tsx**

Same pattern — `<NoGymCard feature="workout plans" />`.

**Step 5: Update Feed.tsx**

Same pattern — `<NoGymCard feature="the gym feed" />`.

**Step 6: Update Leaderboard.tsx**

Same pattern — `<NoGymCard feature="the leaderboard" />`.

**Step 7: Verify TypeScript compiles**

Run: `cd client && npx tsc --noEmit`
Expected: 0 errors

**Step 8: Commit**

```bash
git add client/src/pages/member/
git commit -m "feat: graceful no-gym states across all member pages"
```

---

### Task 3: Public gym list endpoint + Discover Gyms page

**Files:**
- Modify: `server/src/routes/public.routes.ts` — add `GET /api/public/gyms`
- Create: `client/src/pages/member/DiscoverGyms.tsx`
- Modify: `client/src/api/me.ts` — add `discoverGyms()` function
- Modify: `client/src/App.tsx` — add `/m/discover` route

**Step 1: Add public gyms endpoint**

In `server/src/routes/public.routes.ts`, add before the existing routes:

```typescript
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
```

**Step 2: Add client API function**

In `client/src/api/me.ts`, add:

```typescript
export async function discoverGyms(q?: string) {
  const { data } = await api.get('/public/gyms', { params: q ? { q } : {} })
  return data
}
```

**Step 3: Create DiscoverGyms page**

Create `client/src/pages/member/DiscoverGyms.tsx`:

```tsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { discoverGyms } from '@/api/me'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

interface GymPreview {
  _id: string
  name: string
  slug: string
  city?: string
  address?: string
  facilities?: string[]
  pricing?: Record<string, number>
}

export default function DiscoverGymsPage() {
  const [gyms, setGyms] = useState<GymPreview[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true)
      discoverGyms(search || undefined)
        .then(setGyms)
        .catch(() => {})
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const lowestPrice = (pricing?: Record<string, number>) => {
    if (!pricing) return null
    const vals = Object.values(pricing).filter(Boolean)
    return vals.length ? Math.min(...vals) : null
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold text-text-primary">Discover Gyms</h2>
      <Input
        placeholder="Search by name or city..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <LoadingSpinner text="Finding gyms..." />
      ) : gyms.length === 0 ? (
        <Card>
          <p className="text-text-muted text-sm text-center py-4">
            No gyms found. Try a different search.
          </p>
        </Card>
      ) : (
        gyms.map((gym) => (
          <Link key={gym._id} to={`/gym/${gym.slug}`}>
            <Card>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-text-primary">{gym.name}</p>
                  {(gym.city || gym.address) && (
                    <p className="text-text-secondary text-xs mt-0.5">
                      {gym.city || gym.address}
                    </p>
                  )}
                  {gym.facilities && gym.facilities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {gym.facilities.slice(0, 4).map((f) => (
                        <span key={f} className="text-[10px] px-2 py-0.5 rounded-full bg-bg-hover text-text-secondary border border-border">
                          {f}
                        </span>
                      ))}
                      {gym.facilities.length > 4 && (
                        <span className="text-[10px] text-text-muted">+{gym.facilities.length - 4}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-right ml-3">
                  {lowestPrice(gym.pricing) && (
                    <p className="text-accent-orange font-bold text-sm">
                      from ₹{lowestPrice(gym.pricing)}
                    </p>
                  )}
                  <span className="text-text-muted text-lg">&rarr;</span>
                </div>
              </div>
            </Card>
          </Link>
        ))
      )}
    </div>
  )
}
```

**Step 4: Add route in App.tsx**

Import:
```tsx
import DiscoverGymsPage from '@/pages/member/DiscoverGyms'
```

Add route inside `/m` layout (after `join-gym` route):
```tsx
<Route path="discover" element={<DiscoverGymsPage />} />
```

**Step 5: Verify TypeScript compiles**

Run: `cd client && npx tsc --noEmit && cd ../server && npx tsc --noEmit`
Expected: 0 errors on both

**Step 6: Commit**

```bash
git add server/src/routes/public.routes.ts client/src/pages/member/DiscoverGyms.tsx client/src/api/me.ts client/src/App.tsx
git commit -m "feat: gym discovery page with search"
```

---

### Task 4: Join request flow (Lead-based)

**Files:**
- Modify: `server/src/models/Lead.ts` — add `app_request` and `owner_invite` sources, `user` field
- Modify: `server/src/routes/public.routes.ts` — add `POST /api/public/gym/:slug/request-join`
- Modify: `server/src/routes/me.routes.ts` — add `GET /me/join-status`
- Modify: `client/src/api/me.ts` — add `requestJoinGym()`, `getJoinStatus()`
- Modify: `client/src/pages/public/GymPage.tsx` — add "Request to Join" button for logged-in members

**Step 1: Update Lead model**

In `server/src/models/Lead.ts`:

Add `user` field to ILead interface:
```typescript
export interface ILead extends Document {
  gym: Types.ObjectId
  name: string
  phone: string
  user: Types.ObjectId | null  // add this
  goal: string | null
  source: 'gym_page' | 'referral' | 'trial' | 'walkin' | 'other' | 'app_request' | 'owner_invite'
  referrer: Types.ObjectId | null
  status: 'new' | 'contacted' | 'converted' | 'lost'
  notes: string | null
  created_at: Date
}
```

Update schema source enum:
```typescript
source: { type: String, enum: ['gym_page', 'referral', 'trial', 'walkin', 'other', 'app_request', 'owner_invite'], default: 'other' },
```

Add user field to schema:
```typescript
user: { type: Schema.Types.ObjectId, ref: 'User', default: null },
```

Add unique index for user+gym to prevent duplicate requests:
```typescript
leadSchema.index({ gym: 1, user: 1 }, { unique: true, sparse: true })
```

**Step 2: Add request-join endpoint**

In `server/src/routes/public.routes.ts`, add import for `requireAuth`:
```typescript
import { requireAuth } from '../middleware/auth'
import { User } from '../models/User'
```

Add new endpoint:
```typescript
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
```

**Step 3: Add join-status endpoint for member**

In `server/src/routes/me.routes.ts`, add before the `requireMember` middleware chain (alongside check-in and gyms):

```typescript
// GET /me/join-status — Check pending join requests
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
```

Add Lead import at top of me.routes.ts:
```typescript
import { Lead } from '../models/Lead'
```

**Step 4: Add client API functions**

In `client/src/api/me.ts`, add:

```typescript
export async function requestJoinGym(slug: string) {
  const { data } = await api.post(`/public/gym/${slug}/request-join`)
  return data
}

export async function getJoinStatus() {
  const { data } = await api.get('/me/join-status')
  return data
}
```

**Step 5: Update GymPage.tsx**

In `client/src/pages/public/GymPage.tsx`, add a "Request to Join" button section that shows for logged-in members. Import `useAuth` and `requestJoinGym`. Add a button after the pricing section that:
- Checks if user is logged in and has role `member`
- Shows "Request to Join" button
- On click, calls `requestJoinGym(slug)`
- Shows success message "Request sent! The gym owner will review it."
- Shows "Already requested" if 409

**Step 6: Verify TypeScript compiles**

Run: `cd client && npx tsc --noEmit && cd ../server && npx tsc --noEmit`
Expected: 0 errors

**Step 7: Commit**

```bash
git add server/src/models/Lead.ts server/src/routes/public.routes.ts server/src/routes/me.routes.ts client/src/api/me.ts client/src/pages/public/GymPage.tsx
git commit -m "feat: join request flow via Lead model"
```

---

### Task 5: Owner approve/reject join requests

**Files:**
- Modify: `server/src/routes/lead.routes.ts` — add `PUT /approve` and `PUT /reject` actions
- Modify: `client/src/api/owner.ts` — add `approveJoinRequest()`, `rejectJoinRequest()`
- Modify: `client/src/pages/owner/Dashboard.tsx` — add join requests alert card
- Create: `client/src/pages/owner/JoinRequests.tsx` — approve/reject UI
- Modify: `client/src/App.tsx` — add `/owner/join-requests` route

**Step 1: Add approve/reject endpoints**

In `server/src/routes/lead.routes.ts`, add imports:
```typescript
import { Member } from '../models/Member'
import { User } from '../models/User'
```

Add new endpoints:
```typescript
// PUT /api/gym/:gymId/leads/:leadId/approve — Approve join request
router.put(
  '/:leadId/approve',
  requireAuth, requireOwner, requireGymAccess,
  async (req: Request, res: Response) => {
    try {
      const { leadId, gymId } = req.params
      const lead = await Lead.findOne({ _id: leadId, gym: gymId, source: 'app_request' })
      if (!lead) return res.status(404).json({ error: 'Join request not found' })
      if (lead.status === 'converted') return res.status(409).json({ error: 'Already approved' })

      // Create member record
      const existing = await Member.findOne({ gym: gymId, phone: lead.phone })
      if (existing) {
        // Link user if not already linked
        if (!existing.user && lead.user) {
          existing.user = lead.user
          await existing.save()
        }
      } else {
        await Member.create({
          gym: gymId,
          user: lead.user,
          name: lead.name,
          phone: lead.phone,
          goal: lead.goal || 'general',
        })
      }

      lead.status = 'converted'
      await lead.save()

      res.json({ message: 'Member approved' })
    } catch (err: any) {
      console.error('approve join error:', err)
      res.status(500).json({ error: 'Failed to approve' })
    }
  },
)

// PUT /api/gym/:gymId/leads/:leadId/reject — Reject join request
router.put(
  '/:leadId/reject',
  requireAuth, requireOwner, requireGymAccess,
  async (req: Request, res: Response) => {
    try {
      const { leadId, gymId } = req.params
      const lead = await Lead.findOneAndUpdate(
        { _id: leadId, gym: gymId, source: 'app_request' },
        { status: 'lost' },
        { new: true },
      )
      if (!lead) return res.status(404).json({ error: 'Join request not found' })
      res.json({ message: 'Request rejected' })
    } catch (err: any) {
      console.error('reject join error:', err)
      res.status(500).json({ error: 'Failed to reject' })
    }
  },
)
```

**Step 2: Add client API functions**

In `client/src/api/owner.ts` (check existing file, add if missing):
```typescript
import api from './axios'

export async function approveJoinRequest(gymId: string, leadId: string) {
  const { data } = await api.put(`/gym/${gymId}/leads/${leadId}/approve`)
  return data
}

export async function rejectJoinRequest(gymId: string, leadId: string) {
  const { data } = await api.put(`/gym/${gymId}/leads/${leadId}/reject`)
  return data
}
```

**Step 3: Create JoinRequests page**

Create `client/src/pages/owner/JoinRequests.tsx`:

```tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyGym } from '@/api/gym'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { approveJoinRequest, rejectJoinRequest } from '@/api/owner'
import { formatDate } from '@/utils/helpers'
import api from '@/api/axios'

interface JoinRequest {
  _id: string
  name: string
  phone: string
  goal?: string
  created_at: string
  status: string
}

export default function JoinRequestsPage() {
  const [requests, setRequests] = useState<JoinRequest[]>([])
  const [gymId, setGymId] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const gym = await getMyGym()
      setGymId(gym._id)
      const { data } = await api.get(`/gym/${gym._id}/leads`, {
        params: { status: 'new', source: 'app_request' },
      })
      setRequests(data.filter((l: any) => l.source === 'app_request'))
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(leadId: string) {
    setActionLoading(leadId)
    try {
      await approveJoinRequest(gymId, leadId)
      setRequests((prev) => prev.filter((r) => r._id !== leadId))
    } catch {
      // ignore
    } finally {
      setActionLoading(null)
    }
  }

  async function handleReject(leadId: string) {
    setActionLoading(leadId)
    try {
      await rejectJoinRequest(gymId, leadId)
      setRequests((prev) => prev.filter((r) => r._id !== leadId))
    } catch {
      // ignore
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) return <LoadingSpinner text="Loading requests..." />

  return (
    <div className="p-4 space-y-4">
      <button onClick={() => navigate(-1)} className="text-text-secondary text-sm">
        ← Back
      </button>
      <h2 className="text-lg font-bold text-text-primary">Join Requests</h2>

      {requests.length === 0 ? (
        <Card>
          <p className="text-text-muted text-sm text-center py-4">No pending requests</p>
        </Card>
      ) : (
        requests.map((req) => (
          <Card key={req._id}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-text-primary">{req.name}</p>
                <p className="text-text-secondary text-xs">{req.phone}</p>
                <p className="text-text-muted text-xs mt-0.5">{formatDate(req.created_at)}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleApprove(req._id)}
                  loading={actionLoading === req._id}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleReject(req._id)}
                  loading={actionLoading === req._id}
                >
                  Reject
                </Button>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  )
}
```

**Step 4: Update Dashboard to show join requests count**

In `client/src/pages/owner/Dashboard.tsx`, the dashboard already fetches stats. The server dashboard endpoint needs to include join request count. Add to the dashboard route in the server (`server/src/routes/dashboard.routes.ts` or wherever it lives):

```typescript
const joinRequests = await Lead.countDocuments({ gym: gymId, source: 'app_request', status: 'new' })
```

Include `joinRequests` in the response. On the client Dashboard, add an alert card:
```tsx
{stats.joinRequests > 0 && (
  <Link to="/owner/join-requests">
    <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-3 flex items-center gap-3">
      <span className="text-2xl">🙋</span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-text-primary">{stats.joinRequests} join request{stats.joinRequests > 1 ? 's' : ''}</p>
        <p className="text-text-secondary text-xs">Tap to review</p>
      </div>
      <span className="text-text-muted">&rarr;</span>
    </div>
  </Link>
)}
```

**Step 5: Add route in App.tsx**

Import:
```tsx
import JoinRequestsPage from '@/pages/owner/JoinRequests'
```

Add inside `/owner` routes:
```tsx
<Route path="join-requests" element={<JoinRequestsPage />} />
```

**Step 6: Update lead.routes.ts filter**

The GET leads endpoint already supports `?status=` filter. Add support for `?source=` filter too:
```typescript
if (req.query.source && typeof req.query.source === 'string') {
  filter.source = req.query.source
}
```

**Step 7: Verify TypeScript compiles**

Run: `cd client && npx tsc --noEmit && cd ../server && npx tsc --noEmit`
Expected: 0 errors

**Step 8: Commit**

```bash
git add server/src/routes/lead.routes.ts client/src/pages/owner/JoinRequests.tsx client/src/api/owner.ts client/src/pages/owner/Dashboard.tsx client/src/App.tsx
git commit -m "feat: owner approve/reject join requests"
```

---

### Task 6: Pending join request state on member home

**Files:**
- Modify: `client/src/pages/member/Home.tsx` — show pending status
- Modify: `client/src/pages/member/DiscoverGyms.tsx` — show requested status on gym cards

**Step 1: Update DiscoverGyms page**

After the gym list loads, also call `getJoinStatus()` to get pending requests. Mark gyms that have pending requests with a "Requested" badge instead of the arrow.

Add state and effect:
```tsx
const [pendingSlugs, setPendingSlugs] = useState<Set<string>>(new Set())

useEffect(() => {
  getJoinStatus()
    .then((leads: any[]) => {
      const slugs = new Set(leads.map((l: any) => l.gym?.slug).filter(Boolean))
      setPendingSlugs(slugs)
    })
    .catch(() => {})
}, [])
```

In the gym card, check `pendingSlugs.has(gym.slug)` and show "Pending" badge instead of arrow.

**Step 2: Verify and commit**

Run: `cd client && npx tsc --noEmit`

```bash
git add client/src/pages/member/DiscoverGyms.tsx
git commit -m "feat: show pending request status on discover page"
```

---

### Task 7: Owner invite link + Member referral link

**Files:**
- Modify: `client/src/pages/owner/Settings.tsx` — add "Invite Member" with share link
- Modify: `client/src/pages/member/Profile.tsx` — add "Refer a Friend" card
- Modify: `client/src/pages/public/GymPage.tsx` — read `ref` query param and pass to join request

**Step 1: Add invite button to owner Settings**

After the Gym QR section in Settings.tsx, add:

```tsx
{gymId && form.slug && (
  <Card className="p-4 space-y-3">
    <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Invite Members</p>
    <p className="text-text-secondary text-xs">Share this link for people to request joining your gym</p>
    <div className="flex gap-2">
      <input
        readOnly
        value={`${window.location.origin}/gym/${form.slug}?ref=owner`}
        className="flex-1 bg-bg-primary border border-border rounded-lg px-3 py-2 text-xs text-text-primary"
      />
      <Button
        size="sm"
        onClick={() => {
          const url = `${window.location.origin}/gym/${form.slug}?ref=owner`
          if (navigator.share) {
            navigator.share({ title: `Join ${form.name}`, url })
          } else {
            navigator.clipboard.writeText(url)
            setSuccess('Link copied!')
            setTimeout(() => setSuccess(''), 2000)
          }
        }}
      >
        Share
      </Button>
    </div>
  </Card>
)}
```

**Step 2: Add referral card to member Profile**

In Profile.tsx, after the badges section, add a "Refer a Friend" card. The member needs the gym slug — fetch it from the profile data or gym data.

```tsx
{data?.gym?.slug && (
  <Card>
    <h3 className="text-sm font-semibold text-text-secondary mb-2">Refer a Friend</h3>
    <p className="text-text-secondary text-xs mb-3">Invite friends to join {data.gym.name}</p>
    <Button
      size="sm"
      fullWidth
      onClick={() => {
        const url = `${window.location.origin}/gym/${data.gym.slug}?ref=${data.member._id}`
        if (navigator.share) {
          navigator.share({ title: `Join ${data.gym.name}`, text: 'Check out my gym on RepCount!', url })
        } else {
          navigator.clipboard.writeText(url)
        }
      }}
    >
      Share Invite Link
    </Button>
  </Card>
)}
```

**Step 3: Update GymPage to read ref param**

In `GymPage.tsx`, read `ref` from URL search params:
```tsx
const [searchParams] = useSearchParams()
const ref = searchParams.get('ref')
```

When creating the join request, pass ref to the endpoint. Update the `request-join` endpoint to accept an optional `referrer` body param:
```typescript
// In public.routes.ts request-join handler:
const { referrer } = req.body
if (referrer && referrer !== 'owner') {
  lead.referrer = referrer // member ID
  lead.source = 'referral'
} else if (referrer === 'owner') {
  lead.source = 'owner_invite'
}
```

**Step 4: Verify and commit**

Run: `cd client && npx tsc --noEmit && cd ../server && npx tsc --noEmit`

```bash
git add client/src/pages/owner/Settings.tsx client/src/pages/member/Profile.tsx client/src/pages/public/GymPage.tsx server/src/routes/public.routes.ts
git commit -m "feat: owner invite link and member referral sharing"
```

---

### Task 8: Badge auto-awarding

**Files:**
- Create: `server/src/services/badge.service.ts`
- Modify: `server/src/routes/me.routes.ts` — call badge check after check-in

**Step 1: Create badge service**

Create `server/src/services/badge.service.ts`:

```typescript
import { Member } from '../models/Member'
import { Attendance } from '../models/Attendance'
import { Types } from 'mongoose'

interface BadgeRule {
  type: string
  check: (memberId: Types.ObjectId, gymId: Types.ObjectId) => Promise<boolean>
}

const BADGE_RULES: BadgeRule[] = [
  {
    type: 'first_checkin',
    check: async (memberId) => {
      const count = await Attendance.countDocuments({ member: memberId })
      return count >= 1
    },
  },
  {
    type: 'week_warrior',
    check: async (memberId, gymId) => {
      // Check if member has 7 consecutive days of attendance
      const recent = await Attendance.find({ member: memberId, gym: gymId })
        .sort({ check_in_date: -1 })
        .limit(7)
        .lean()
      if (recent.length < 7) return false
      // Check if the 7 most recent are consecutive
      for (let i = 0; i < 6; i++) {
        const d1 = new Date(recent[i].check_in_date).getTime()
        const d2 = new Date(recent[i + 1].check_in_date).getTime()
        const diffDays = (d1 - d2) / (1000 * 60 * 60 * 24)
        if (Math.round(diffDays) !== 1) return false
      }
      return true
    },
  },
  {
    type: 'month_master',
    check: async (memberId, gymId) => {
      const recent = await Attendance.find({ member: memberId, gym: gymId })
        .sort({ check_in_date: -1 })
        .limit(30)
        .lean()
      if (recent.length < 30) return false
      for (let i = 0; i < 29; i++) {
        const d1 = new Date(recent[i].check_in_date).getTime()
        const d2 = new Date(recent[i + 1].check_in_date).getTime()
        const diffDays = (d1 - d2) / (1000 * 60 * 60 * 24)
        if (Math.round(diffDays) !== 1) return false
      }
      return true
    },
  },
  {
    type: 'century',
    check: async (memberId) => {
      const count = await Attendance.countDocuments({ member: memberId })
      return count >= 100
    },
  },
  {
    type: 'early_bird',
    check: async (memberId) => {
      const earlyCount = await Attendance.countDocuments({
        member: memberId,
        $expr: { $lt: [{ $hour: '$checked_in_at' }, 7] },
      })
      return earlyCount >= 5
    },
  },
]

export async function checkAndAwardBadges(memberId: Types.ObjectId, gymId: Types.ObjectId): Promise<string[]> {
  const member = await Member.findById(memberId)
  if (!member) return []

  const existingTypes = new Set(member.badges.map((b) => b.badge_type))
  const newBadges: string[] = []

  for (const rule of BADGE_RULES) {
    if (existingTypes.has(rule.type)) continue
    try {
      const earned = await rule.check(memberId, gymId)
      if (earned) {
        member.badges.push({ badge_type: rule.type, earned_at: new Date() })
        newBadges.push(rule.type)
      }
    } catch (err) {
      console.error(`badge check failed for ${rule.type}:`, err)
    }
  }

  if (newBadges.length > 0) {
    await member.save()
  }

  return newBadges
}
```

**Step 2: Call after check-in**

In `server/src/routes/me.routes.ts`, import the badge service:
```typescript
import { checkAndAwardBadges } from '../services/badge.service'
```

After the attendance record is created in both the self check-in endpoint (`POST /check-in`) and the owner check-in endpoint, add:
```typescript
const newBadges = await checkAndAwardBadges(member._id, gym._id)
```

Include `newBadges` in the response so the client can show a toast.

**Step 3: Verify TypeScript compiles**

Run: `cd server && npx tsc --noEmit`
Expected: 0 errors

**Step 4: Commit**

```bash
git add server/src/services/badge.service.ts server/src/routes/me.routes.ts
git commit -m "feat: auto-award badges after check-in"
```

---

### Task 9: DailyLog model + Workout/Diet completion tracking

**Files:**
- Create: `server/src/models/DailyLog.ts`
- Modify: `server/src/routes/me.routes.ts` — add `POST /me/log` and `GET /me/log/:date`
- Modify: `client/src/api/me.ts` — add `toggleLog()`, `getLog()`
- Modify: `client/src/pages/member/Diet.tsx` — add meal completion checkboxes
- Modify: `client/src/pages/member/Workout.tsx` — add "Mark Complete" button

**Step 1: Create DailyLog model**

Create `server/src/models/DailyLog.ts`:

```typescript
import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IDailyLog extends Document {
  member: Types.ObjectId
  gym: Types.ObjectId
  date: string  // YYYY-MM-DD
  type: 'workout' | 'diet'
  completed: boolean
}

const dailyLogSchema = new Schema<IDailyLog>({
  member: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
  gym: { type: Schema.Types.ObjectId, ref: 'Gym', required: true },
  date: { type: String, required: true },
  type: { type: String, enum: ['workout', 'diet'], required: true },
  completed: { type: Boolean, default: true },
})

dailyLogSchema.index({ member: 1, date: 1, type: 1 }, { unique: true })

export const DailyLog = mongoose.model<IDailyLog>('DailyLog', dailyLogSchema)
```

**Step 2: Add endpoints in me.routes.ts**

Import:
```typescript
import { DailyLog } from '../models/DailyLog'
```

Add endpoints (inside the member context middleware chain, after leaderboard):

```typescript
// POST /me/log — Toggle daily completion
router.post('/log', async (req: Request, res: Response) => {
  try {
    const { type, date } = req.body
    if (!['workout', 'diet'].includes(type) || !date) {
      return res.status(400).json({ error: 'type (workout|diet) and date required' })
    }
    const existing = await DailyLog.findOne({
      member: req.member!._id,
      gym: req.member!.gym,
      date,
      type,
    })
    if (existing) {
      await existing.deleteOne()
      return res.json({ completed: false })
    }
    await DailyLog.create({
      member: req.member!._id,
      gym: req.member!.gym,
      date,
      type,
    })
    res.json({ completed: true })
  } catch (err: any) {
    console.error('toggle log error:', err)
    res.status(500).json({ error: 'Failed to toggle log' })
  }
})

// GET /me/log?date=YYYY-MM-DD — Get logs for a date
router.get('/log', async (req: Request, res: Response) => {
  try {
    const date = req.query.date as string || new Date().toISOString().slice(0, 10)
    const logs = await DailyLog.find({
      member: req.member!._id,
      date,
    }).lean()
    res.json(logs)
  } catch (err: any) {
    console.error('get logs error:', err)
    res.status(500).json({ error: 'Failed to get logs' })
  }
})
```

**Step 3: Add client API functions**

In `client/src/api/me.ts`:

```typescript
export async function toggleDailyLog(type: 'workout' | 'diet', date: string) {
  const { data } = await api.post('/me/log', { type, date })
  return data
}

export async function getDailyLog(date: string) {
  const { data } = await api.get('/me/log', { params: { date } })
  return data
}
```

**Step 4: Update Diet.tsx**

Add a "Mark Diet Complete" button at the bottom of the diet plan:

```tsx
import { toggleDailyLog, getDailyLog } from '@/api/me'
import { todayIST } from '@/utils/helpers'
```

Add state:
```tsx
const [dietDone, setDietDone] = useState(false)
const [toggling, setToggling] = useState(false)
```

On mount, check today's log:
```tsx
getDailyLog(todayIST()).then((logs: any[]) => {
  setDietDone(logs.some((l: any) => l.type === 'diet'))
}).catch(() => {})
```

Add button at bottom:
```tsx
<button
  onClick={async () => {
    setToggling(true)
    try {
      const res = await toggleDailyLog('diet', todayIST())
      setDietDone(res.completed)
    } catch {}
    setToggling(false)
  }}
  disabled={toggling}
  className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors ${
    dietDone
      ? 'bg-status-green/20 text-status-green border border-status-green/30'
      : 'bg-accent-orange text-white'
  }`}
>
  {dietDone ? '✓ Diet Completed Today' : 'Mark Diet as Done'}
</button>
```

**Step 5: Update Workout.tsx**

Same pattern — add "Mark Workout Complete" button with same toggle logic using `type: 'workout'`.

**Step 6: Verify TypeScript compiles**

Run: `cd client && npx tsc --noEmit && cd ../server && npx tsc --noEmit`
Expected: 0 errors

**Step 7: Commit**

```bash
git add server/src/models/DailyLog.ts server/src/routes/me.routes.ts client/src/api/me.ts client/src/pages/member/Diet.tsx client/src/pages/member/Workout.tsx
git commit -m "feat: daily workout/diet completion tracking"
```

---

### Task 10: Daily motivation quotes

**Files:**
- Modify: `client/src/utils/constants.ts` — add `MOTIVATION_QUOTES` array
- Modify: `client/src/pages/member/Home.tsx` — add quote card

**Step 1: Add quotes to constants**

In `client/src/utils/constants.ts`, add at the end:

```typescript
export const MOTIVATION_QUOTES = [
  "The only bad workout is the one that didn't happen.",
  "Your body can stand almost anything. It's your mind you have to convince.",
  "Strive for progress, not perfection.",
  "The pain you feel today will be the strength you feel tomorrow.",
  "Don't wish for it. Work for it.",
  "Fitness is not about being better than someone else. It's about being better than you used to be.",
  "Push yourself because no one else is going to do it for you.",
  "Success isn't always about greatness. It's about consistency.",
  "It never gets easier. You just get stronger.",
  "The secret of getting ahead is getting started.",
  "No matter how slow you go, you are still lapping everyone on the couch.",
  "Sore today, strong tomorrow.",
  "The hardest step is the first one out the door.",
  "Fall in love with taking care of yourself.",
  "Wake up with determination. Go to bed with satisfaction.",
  "You don't have to be extreme, just consistent.",
  "Your health is an investment, not an expense.",
  "The only way to finish is to start.",
  "Small steps every day lead to big results.",
  "Discipline is choosing between what you want now and what you want most.",
  "Make yourself a priority.",
  "Train insane or remain the same.",
  "A one-hour workout is 4% of your day.",
  "When you feel like quitting, think about why you started.",
  "Strong is the new everything.",
  "Believe you can and you're halfway there.",
  "Your body is a reflection of your lifestyle.",
  "Good things come to those who sweat.",
  "Don't count the days, make the days count.",
  "Champions train, losers complain.",
]
```

**Step 2: Add quote card to Home.tsx**

Import:
```tsx
import { MOTIVATION_QUOTES } from '@/utils/constants'
```

Add helper to pick daily quote:
```tsx
const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
const dailyQuote = MOTIVATION_QUOTES[dayOfYear % MOTIVATION_QUOTES.length]
```

Add card after the greeting card:
```tsx
<Card>
  <p className="text-sm text-text-secondary italic text-center">"{dailyQuote}"</p>
</Card>
```

**Step 3: Verify TypeScript compiles**

Run: `cd client && npx tsc --noEmit`

**Step 4: Commit**

```bash
git add client/src/utils/constants.ts client/src/pages/member/Home.tsx
git commit -m "feat: daily motivation quotes on member home"
```

---

### Task 11: Integration test — verify all flows

**Step 1: Build both projects**

```bash
cd server && npx tsc --noEmit
cd ../client && npx tsc --noEmit && npm run build
```

Expected: 0 errors, build succeeds

**Step 2: Test public gyms endpoint**

```bash
curl -s http://localhost:5001/api/public/gyms | python3 -m json.tool | head -20
curl -s "http://localhost:5001/api/public/gyms?q=iron" | python3 -m json.tool
```

Expected: Returns array of gyms

**Step 3: Test join request flow**

```bash
# Login as member (Rahul)
TOKEN=$(curl -s -X POST http://localhost:5001/api/auth/verify-otp -H 'Content-Type: application/json' -d '{"phone":"+919999999903","otp":"123456"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

# Request to join PowerHouse
curl -s -X POST http://localhost:5001/api/public/gym/powerhouse-gym/request-join -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Expected: `{ "message": "Join request sent" }`

**Step 4: Test badge service**

```bash
# Check-in as member
curl -s -X POST http://localhost:5001/api/me/check-in -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"gymId":"<iron-paradise-gym-id>"}' | python3 -m json.tool
```

Expected: Response includes `newBadges` array (possibly with `first_checkin`)

**Step 5: Test daily log**

```bash
curl -s -X POST http://localhost:5001/api/me/log -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"type":"workout","date":"2026-02-28"}' | python3 -m json.tool
```

Expected: `{ "completed": true }`

**Step 6: Commit final state**

```bash
git add -A
git commit -m "feat: member experience improvements — all features complete"
```
