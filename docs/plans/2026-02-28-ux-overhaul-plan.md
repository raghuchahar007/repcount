# UX Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all UX bugs and polish the entire app — navigation, auth flow, owner panel, member experience, and infrastructure.

**Architecture:** All changes are client-side React except 4 server additions: leaderboard period param, pagination params on list endpoints, lead conversion endpoint, and member leave-gym endpoint. Toast system and skeleton loaders use plain React — no external libraries.

**Tech Stack:** React 18, React Router v6, Tailwind CSS v4, Express 4, Mongoose

---

## Parallel Execution Groups

Tasks within the same group are independent and can run in parallel. Groups must be sequential (Group A before B before C).

### Group A — Shared Infrastructure (must go first, other tasks depend on these)

---

### Task 1: Toast Notification System

**Files:**
- Create: `client/src/contexts/ToastContext.tsx`
- Modify: `client/src/App.tsx`

**Step 1: Create ToastContext**

```tsx
// client/src/contexts/ToastContext.tsx
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

interface ToastContextType {
  toast: (message: string, type?: 'success' | 'error' | 'info') => void
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

let toastId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-[90%] max-w-sm">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-xl text-sm font-medium text-white shadow-lg animate-fade-in ${
              t.type === 'success' ? 'bg-status-green' :
              t.type === 'error' ? 'bg-status-red' : 'bg-status-blue'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
```

**Step 2: Add fade-in animation to index.css**

In `client/src/index.css`, add after the `@theme` block:

```css
@keyframes fade-in {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fade-in 0.2s ease-out;
}
```

**Step 3: Wrap App with ToastProvider**

In `client/src/App.tsx`, wrap the `<BrowserRouter>` content with `<ToastProvider>`:

```tsx
import { ToastProvider } from './contexts/ToastContext'

// Inside the return:
<BrowserRouter>
  <ToastProvider>
    <AuthProvider>
      {/* existing routes */}
    </AuthProvider>
  </ToastProvider>
</BrowserRouter>
```

**Step 4: Verify tsc compiles**

Run: `cd client && npx tsc --noEmit`

**Step 5: Commit**

```bash
git add client/src/contexts/ToastContext.tsx client/src/index.css client/src/App.tsx
git commit -m "feat: add toast notification system"
```

---

### Task 2: Reusable ErrorCard Component

**Files:**
- Create: `client/src/components/shared/ErrorCard.tsx`

**Step 1: Create ErrorCard**

```tsx
// client/src/components/shared/ErrorCard.tsx
interface ErrorCardProps {
  message: string
  onRetry?: () => void
}

export default function ErrorCard({ message, onRetry }: ErrorCardProps) {
  return (
    <div className="bg-status-red/10 border border-status-red/20 rounded-2xl p-6 text-center">
      <p className="text-status-red text-sm mb-3">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-status-red/20 text-status-red rounded-xl text-sm font-medium"
        >
          Try Again
        </button>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add client/src/components/shared/ErrorCard.tsx
git commit -m "feat: add reusable ErrorCard component with retry"
```

---

### Task 3: Skeleton Loader Components

**Files:**
- Create: `client/src/components/shared/Skeleton.tsx`

**Step 1: Create Skeleton primitives**

```tsx
// client/src/components/shared/Skeleton.tsx

export function SkeletonBox({ className = '' }: { className?: string }) {
  return <div className={`bg-bg-hover rounded-xl animate-pulse ${className}`} />
}

export function SkeletonCard() {
  return (
    <div className="bg-bg-card rounded-2xl p-4 space-y-3">
      <SkeletonBox className="h-4 w-3/4" />
      <SkeletonBox className="h-3 w-1/2" />
    </div>
  )
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-bg-card rounded-2xl p-4 flex items-center gap-3">
          <SkeletonBox className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonBox className="h-4 w-2/3" />
            <SkeletonBox className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-4 p-4">
      <SkeletonBox className="h-24 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBox key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
      <SkeletonBox className="h-8 w-1/3" />
      <SkeletonList count={3} />
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add client/src/components/shared/Skeleton.tsx
git commit -m "feat: add skeleton loader components"
```

---

### Group B — Parallel tasks (all independent, run simultaneously)

---

### Task 4: Clickable Logo in Both Layouts

**Files:**
- Modify: `client/src/components/layout/OwnerLayout.tsx`
- Modify: `client/src/components/layout/MemberLayout.tsx`

**Step 1: OwnerLayout — make logo a link**

In `OwnerLayout.tsx`, import `Link` from `react-router-dom` and replace the header `<div>` containing "RepCount" with:

```tsx
import { Link, Outlet } from 'react-router-dom'

// Replace the RepCount text div with:
<Link to="/owner" className="flex flex-col">
  <span className="text-lg font-bold text-text-primary">RepCount</span>
  <span className="text-[10px] text-text-muted -mt-1">Owner Panel</span>
</Link>
```

**Step 2: MemberLayout — make logo a link**

In `MemberLayout.tsx`, replace the "RepCount" text with:

```tsx
<Link to="/m" className="text-lg font-bold text-text-primary">RepCount</Link>
```

**Step 3: Verify and commit**

```bash
cd client && npx tsc --noEmit
git add client/src/components/layout/OwnerLayout.tsx client/src/components/layout/MemberLayout.tsx
git commit -m "fix: make RepCount logo clickable in both layouts"
```

---

### Task 5: VerifyOTP — Resend OTP + Refresh Handling

**Files:**
- Modify: `client/src/pages/VerifyOtp.tsx`

**Step 1: Add resend OTP with cooldown + redirect on refresh**

Replace the full VerifyOtp component. Key changes:
- If no `location.state?.phone`, redirect to `/login`
- Add "Resend OTP" button with 30s countdown timer
- Show masked phone number
- Use `useToast` for feedback

The component should:
1. Check `location.state?.phone` on mount — if missing, `navigate('/login')`
2. Show masked phone: `+91 ${phone.slice(3,5)}****${phone.slice(-2)}`
3. Add resend button below OTP inputs: disabled for 30s, shows countdown
4. On resend: call `sendOtp(phone)`, reset timer, show toast "OTP sent!"
5. Keep existing 6-digit auto-submit logic

**Step 2: Verify and commit**

```bash
cd client && npx tsc --noEmit
git add client/src/pages/VerifyOtp.tsx
git commit -m "fix: add resend OTP, cooldown timer, refresh redirect"
```

---

### Task 6: Login Page Wording Fix

**Files:**
- Modify: `client/src/pages/Login.tsx`

**Step 1: Fix wording**

Find the "Create an account" link at the bottom of Login.tsx and change to:

```tsx
<p className="text-center text-sm text-text-secondary">
  Don't have an account?{' '}
  <Link to="/register" className="text-accent-primary font-medium">Register</Link>
</p>
```

**Step 2: Commit**

```bash
git add client/src/pages/Login.tsx
git commit -m "fix: improve login page register link wording"
```

---

### Task 7: Gym Selector — No Reload

**Files:**
- Modify: `client/src/components/layout/MemberLayout.tsx`

**Step 1: Replace reload with state update**

In MemberLayout.tsx, the gym selector `onChange` currently does `window.location.reload()`. Replace with:

```tsx
// Instead of window.location.reload(), just update localStorage and trigger re-render:
const handleGymChange = (gymId: string) => {
  localStorage.setItem('active_gym', gymId)
  setActiveGym(gymId)
  // Navigate to /m to refresh all member data from the new gym context
  navigate('/m')
}
```

This navigates to `/m` (member home) which re-mounts and fetches fresh data for the new gym.

**Step 2: Verify and commit**

```bash
cd client && npx tsc --noEmit
git add client/src/components/layout/MemberLayout.tsx
git commit -m "fix: gym selector uses navigation instead of page reload"
```

---

### Task 8: Member Detail — Refresh After Payment

**Files:**
- Modify: `client/src/pages/owner/MemberDetail.tsx`

**Step 1: Re-fetch member data after payment**

In MemberDetail.tsx, after the payment form's successful submit (the `recordPayment` call), add a re-fetch of the member data:

```tsx
// After successful payment, re-fetch member:
const res = await recordPayment(gymId, paymentData)
// ... existing success handling ...
// Re-fetch member data to update Current Plan section:
const updated = await getMember(gymId, memberId)
setMember(updated)
setShowPaymentForm(false)
toast('Payment recorded!', 'success')
```

Import `useToast` and use it instead of inline success messages.

**Step 2: Verify and commit**

```bash
cd client && npx tsc --noEmit
git add client/src/pages/owner/MemberDetail.tsx
git commit -m "fix: refresh member data after recording payment"
```

---

### Task 9: Settings — Unsaved Changes Indicator

**Files:**
- Modify: `client/src/pages/owner/Settings.tsx`

**Step 1: Track dirty state**

Add a `isDirty` state that compares current form values against initial values loaded from API. Show a yellow bar when dirty:

```tsx
const [initialForm, setInitialForm] = useState<typeof form | null>(null)

// After loading gym data:
setInitialForm({ ...gymData })

// Compute dirty:
const isDirty = initialForm && JSON.stringify(form) !== JSON.stringify(initialForm)

// Render bar above form when dirty:
{isDirty && (
  <div className="bg-status-yellow/20 text-status-yellow text-sm font-medium px-4 py-2 rounded-xl text-center">
    You have unsaved changes
  </div>
)}
```

Also use `useToast` for save success/error instead of inline messages.

**Step 2: Verify and commit**

```bash
cd client && npx tsc --noEmit
git add client/src/pages/owner/Settings.tsx
git commit -m "feat: show unsaved changes indicator in Settings"
```

---

### Task 10: Renewals — Search & Sort

**Files:**
- Modify: `client/src/pages/owner/Renewals.tsx`

**Step 1: Add search and sort**

Add a search input and sort dropdown to the Renewals page:

```tsx
const [search, setSearch] = useState('')
const [sort, setSort] = useState<'overdue' | 'expiring' | 'name'>('overdue')

// Filter:
const filtered = renewals.filter(m =>
  m.name.toLowerCase().includes(search.toLowerCase()) ||
  m.phone?.includes(search)
)

// Sort:
const sorted = [...filtered].sort((a, b) => {
  if (sort === 'overdue') return (a.daysLeft ?? 999) - (b.daysLeft ?? 999)
  if (sort === 'expiring') return (a.daysLeft ?? 999) - (b.daysLeft ?? 999)
  return a.name.localeCompare(b.name)
})
```

Add search input and sort chips above the list.

**Step 2: Verify and commit**

```bash
cd client && npx tsc --noEmit
git add client/src/pages/owner/Renewals.tsx
git commit -m "feat: add search and sort to Renewals page"
```

---

### Task 11: Leads — Convert to Member + Source Filter

**Files:**
- Modify: `client/src/pages/owner/Leads.tsx`
- Modify: `client/src/api/owner.ts`
- Modify: `server/src/routes/lead.routes.ts` (if needed for convert endpoint)

**Step 1: Add "Convert" button**

For leads with status `contacted` or `new`, add a "Convert" button that:
1. Calls `POST /api/gym/:gymId/leads/:leadId/convert`
2. Backend creates a Member record from the Lead data, marks Lead as `converted`
3. UI updates optimistically

**Step 2: Add source filter chips**

Add filter chips for source: All, App Request, Referral, Owner Invite, Website.

**Step 3: Server endpoint for lead conversion**

In `lead.routes.ts`, add:

```tsx
// POST /gym/:gymId/leads/:leadId/convert
router.post('/:leadId/convert', async (req, res) => {
  const lead = await Lead.findOne({ _id: req.params.leadId, gym: req.params.gymId })
  if (!lead) return res.status(404).json({ error: 'Lead not found' })
  if (lead.status === 'converted') return res.status(400).json({ error: 'Already converted' })

  const member = await Member.create({
    gym: lead.gym,
    name: lead.name,
    phone: lead.phone,
    source: lead.source,
  })
  lead.status = 'converted'
  await lead.save()
  res.json({ member, lead })
})
```

**Step 4: Verify and commit**

```bash
cd client && npx tsc --noEmit && cd ../server && npx tsc --noEmit
git add -A
git commit -m "feat: lead conversion to member + source filter"
```

---

### Task 12: Posts — Edit & Delete

**Files:**
- Modify: `client/src/pages/owner/Posts.tsx`
- Modify: `client/src/pages/owner/CreatePost.tsx`
- Modify: `client/src/api/owner.ts` (or `client/src/api/posts.ts` — check which exists)

**Step 1: Add edit/delete buttons to Posts list**

Each post card gets an edit icon (pencil) and delete icon (trash). Edit navigates to `/owner/posts/edit/:postId`. Delete shows a confirm dialog, then calls `deletePost(gymId, postId)`.

**Step 2: Make CreatePost support edit mode**

If route is `/owner/posts/edit/:postId`:
1. Fetch existing post data
2. Pre-fill the form
3. On submit, call `updatePost()` instead of `createPost()`
4. Title: "Edit Post" instead of "Create Post"

**Step 3: Add edit route to App.tsx**

```tsx
<Route path="posts/edit/:postId" element={<CreatePost />} />
```

**Step 4: Verify and commit**

```bash
cd client && npx tsc --noEmit
git add -A
git commit -m "feat: add edit and delete for posts"
```

---

### Task 13: Check-in Confirmation on Members List

**Files:**
- Modify: `client/src/pages/owner/Members.tsx`

**Step 1: Add tap-to-confirm pattern**

Replace instant check-in with a two-tap pattern:
1. First tap: button turns yellow with "Tap to confirm"
2. Second tap within 3s: performs check-in
3. After 3s: resets back to original state

```tsx
const [confirmingId, setConfirmingId] = useState<string | null>(null)

const handleCheckIn = (memberId: string) => {
  if (confirmingId === memberId) {
    // Second tap — do the check-in
    performCheckIn(memberId)
    setConfirmingId(null)
  } else {
    // First tap — show confirmation
    setConfirmingId(memberId)
    setTimeout(() => setConfirmingId(prev => prev === memberId ? null : prev), 3000)
  }
}
```

**Step 2: Verify and commit**

```bash
cd client && npx tsc --noEmit
git add client/src/pages/owner/Members.tsx
git commit -m "feat: add check-in confirmation tap on Members list"
```

---

### Task 14: Dashboard Auto-Refresh

**Files:**
- Modify: `client/src/pages/owner/Dashboard.tsx`

**Step 1: Re-fetch on focus/navigation**

Add a re-fetch when the page gains focus (user navigates back):

```tsx
useEffect(() => {
  fetchDashboard()
  // Re-fetch when tab becomes visible (user navigated back)
  const handleFocus = () => fetchDashboard()
  window.addEventListener('focus', handleFocus)
  return () => window.removeEventListener('focus', handleFocus)
}, [gymId])
```

**Step 2: Verify and commit**

```bash
cd client && npx tsc --noEmit
git add client/src/pages/owner/Dashboard.tsx
git commit -m "feat: auto-refresh dashboard on focus"
```

---

### Task 15: Member Home — Check-in Clarity

**Files:**
- Modify: `client/src/pages/member/Home.tsx`

**Step 1: Reorganize check-in section**

Replace the two equal-sized check-in options with:
1. Primary action: "Scan Gym QR to Check In" — large button
2. Secondary: "Or show your QR to staff" — smaller text link below
3. One-line description under primary: "Point your camera at the QR code at the gym entrance"

**Step 2: Verify and commit**

```bash
cd client && npx tsc --noEmit
git add client/src/pages/member/Home.tsx
git commit -m "fix: clarify check-in options with primary/secondary hierarchy"
```

---

### Task 16: Leaderboard Time Periods

**Files:**
- Modify: `client/src/pages/member/Leaderboard.tsx`
- Modify: `client/src/api/me.ts`
- Modify: `server/src/routes/me.routes.ts`

**Step 1: Server — add period query param**

In the leaderboard endpoint (`GET /me/leaderboard`), accept `?period=week|month|all`:

```tsx
const period = (req.query.period as string) || 'month'
let startDate: Date
const now = new Date()
if (period === 'week') {
  startDate = new Date(now)
  startDate.setDate(now.getDate() - 7)
} else if (period === 'all') {
  startDate = new Date(0) // all time
} else {
  startDate = new Date(now.getFullYear(), now.getMonth(), 1) // month
}
// Use startDate in the attendance aggregation query
```

**Step 2: Client API — pass period**

```tsx
export const getLeaderboard = (period = 'month') =>
  api.get(`/me/leaderboard?period=${period}`).then(r => r.data)
```

**Step 3: Client — tab UI**

Add three tabs at top: "This Week" | "This Month" | "All Time". Selected tab calls `getLeaderboard(period)`.

**Step 4: Verify and commit**

```bash
cd client && npx tsc --noEmit && cd ../server && npx tsc --noEmit
git add -A
git commit -m "feat: leaderboard time periods (week/month/all)"
```

---

### Task 17: Diet/Workout Done Feedback

**Files:**
- Modify: `client/src/pages/member/Diet.tsx`
- Modify: `client/src/pages/member/Workout.tsx`

**Step 1: Improve button feedback**

In both pages, when `completed` is true, change the button:
- Text: "Done for today" with a checkmark
- Style: green background instead of accent
- Disabled appearance but still tappable to undo

```tsx
<button
  onClick={handleToggle}
  className={completed
    ? 'w-full py-3 rounded-2xl font-semibold text-white bg-status-green'
    : 'w-full py-3 rounded-2xl font-semibold text-white bg-accent-primary'
  }
>
  {completed ? '✓ Done for today' : type === 'diet' ? 'Mark Diet as Done' : 'Mark Workout as Done'}
</button>
```

**Step 2: Verify and commit**

```bash
cd client && npx tsc --noEmit
git add client/src/pages/member/Diet.tsx client/src/pages/member/Workout.tsx
git commit -m "fix: improve diet/workout done button feedback"
```

---

### Task 18: Profile — Edit Name & Phone

**Files:**
- Modify: `client/src/pages/member/Profile.tsx`
- Modify: `server/src/routes/me.routes.ts` (if profile update doesn't already support name/phone)

**Step 1: Add name and phone to profile edit form**

In Profile.tsx, add editable fields for `full_name` and `phone` above the goal/diet preference selectors. The `updateProfile` API should already handle these fields.

Check the server `PUT /me/profile` handler — if it only updates `goal` and `diet_pref`, extend it to also update `full_name` on the User model.

**Step 2: Verify and commit**

```bash
cd client && npx tsc --noEmit && cd ../server && npx tsc --noEmit
git add -A
git commit -m "feat: allow editing name and phone from Profile"
```

---

### Task 19: Member Leave Gym

**Files:**
- Modify: `client/src/pages/member/Profile.tsx`
- Modify: `client/src/api/me.ts`
- Modify: `server/src/routes/me.routes.ts`

**Step 1: Server endpoint**

Add `DELETE /api/me/leave-gym` that removes the Member record linking the user to their current gym:

```tsx
router.delete('/leave-gym', requireAuth, requireMember, requireMemberContext, async (req, res) => {
  const member = req.memberRecord
  await Member.findByIdAndDelete(member._id)
  res.json({ success: true })
})
```

**Step 2: Client API**

```tsx
export const leaveGym = () => api.delete('/me/leave-gym').then(r => r.data)
```

**Step 3: Profile UI**

Add "Leave Gym" button at bottom of Profile (above Logout). On tap → confirmation dialog → call `leaveGym()` → navigate to `/m` (which will show Discover Gyms if no gym).

**Step 4: Verify and commit**

```bash
cd client && npx tsc --noEmit && cd ../server && npx tsc --noEmit
git add -A
git commit -m "feat: member can leave gym from Profile"
```

---

### Group C — Apply Infrastructure to All Pages (depends on Group A)

---

### Task 20: Apply ErrorCard + Skeleton Loaders to All Pages

**Files:**
- Modify: `client/src/pages/owner/Dashboard.tsx`
- Modify: `client/src/pages/owner/Members.tsx`
- Modify: `client/src/pages/owner/MemberDetail.tsx`
- Modify: `client/src/pages/owner/Renewals.tsx`
- Modify: `client/src/pages/owner/Leads.tsx`
- Modify: `client/src/pages/owner/Posts.tsx`
- Modify: `client/src/pages/member/Home.tsx`
- Modify: `client/src/pages/member/Feed.tsx`
- Modify: `client/src/pages/member/Leaderboard.tsx`
- Modify: `client/src/pages/member/Profile.tsx`

**Step 1: Replace all loading spinners with skeletons**

In every page that shows `<LoadingSpinner />` during initial load, replace with the appropriate skeleton:
- Dashboard → `<SkeletonDashboard />`
- Members, Renewals, Leads, Posts, Feed, Leaderboard → `<SkeletonList />`
- MemberDetail, Profile → `<SkeletonCard />` stack

**Step 2: Replace all inline error displays with ErrorCard**

In every page with error state, replace inline red text with:

```tsx
<ErrorCard message={error} onRetry={fetchData} />
```

Where `fetchData` is the page's data-fetching function.

**Step 3: Verify and commit**

```bash
cd client && npx tsc --noEmit
git add -A
git commit -m "feat: apply skeleton loaders and ErrorCard to all pages"
```

---

### Task 21: Apply Toasts to All Forms

**Files:**
- Modify: `client/src/pages/owner/MemberDetail.tsx`
- Modify: `client/src/pages/owner/Settings.tsx`
- Modify: `client/src/pages/owner/CreatePost.tsx`
- Modify: `client/src/pages/owner/Members.tsx` (check-in feedback)
- Modify: `client/src/pages/member/Profile.tsx`
- Modify: `client/src/pages/member/Home.tsx` (check-in)
- Modify: `client/src/pages/member/Feed.tsx` (join challenge)

**Step 1: Replace inline success/error messages with toast**

In every page that shows inline success or error messages after an action:

```tsx
const { toast } = useToast()

// After successful action:
toast('Payment recorded!')

// After error:
toast('Failed to record payment', 'error')
```

Remove the inline `successMsg` / `errorMsg` state variables and their corresponding JSX.

**Step 2: Verify and commit**

```bash
cd client && npx tsc --noEmit
git add -A
git commit -m "feat: replace inline messages with toast notifications"
```

---

### Task 22: Pagination on List Pages

**Files:**
- Modify: `server/src/routes/member.routes.ts` (members list)
- Modify: `server/src/routes/lead.routes.ts` (leads list)
- Modify: `server/src/routes/post.routes.ts` (posts list)
- Modify: `client/src/pages/owner/Members.tsx`
- Modify: `client/src/pages/owner/Leads.tsx`
- Modify: `client/src/pages/owner/Posts.tsx`
- Create: `client/src/components/shared/Pagination.tsx`

**Step 1: Server — add pagination to list endpoints**

All list endpoints accept `?page=1&limit=20`. Return `{ data: [...], total: N, page: N, totalPages: N }`.

Example for members:
```tsx
const page = parseInt(req.query.page as string) || 1
const limit = parseInt(req.query.limit as string) || 20
const skip = (page - 1) * limit
const [members, total] = await Promise.all([
  Member.find({ gym: gymId }).skip(skip).limit(limit).sort({ created_at: -1 }),
  Member.countDocuments({ gym: gymId })
])
res.json({ data: members, total, page, totalPages: Math.ceil(total / limit) })
```

**Step 2: Create Pagination component**

```tsx
// client/src/components/shared/Pagination.tsx
interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="px-3 py-1.5 rounded-lg bg-bg-card text-text-secondary text-sm disabled:opacity-30"
      >
        Prev
      </button>
      <span className="text-text-secondary text-sm">{page} / {totalPages}</span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="px-3 py-1.5 rounded-lg bg-bg-card text-text-secondary text-sm disabled:opacity-30"
      >
        Next
      </button>
    </div>
  )
}
```

**Step 3: Apply to Members, Leads, Posts pages**

Each page tracks `page` state, passes to API, renders `<Pagination />` at bottom.

**Step 4: Verify and commit**

```bash
cd client && npx tsc --noEmit && cd ../server && npx tsc --noEmit
git add -A
git commit -m "feat: add pagination to Members, Leads, Posts"
```

---

### Task 23: Form Validation Summaries

**Files:**
- Modify: `client/src/pages/owner/AddMember.tsx`
- Modify: `client/src/pages/owner/Settings.tsx`

**Step 1: Add error summary at top**

When form has validation errors, show a summary card at top:

```tsx
{errors.length > 0 && (
  <div className="bg-status-red/10 border border-status-red/20 rounded-xl p-3">
    <p className="text-status-red text-sm font-medium">{errors.length} error{errors.length > 1 ? 's' : ''} below</p>
  </div>
)}
```

Auto-scroll to first error field using `ref.scrollIntoView()`.

**Step 2: Verify and commit**

```bash
cd client && npx tsc --noEmit
git add -A
git commit -m "feat: form validation error summaries"
```

---

### Task 24: Session Timeout Warning

**Files:**
- Modify: `client/src/contexts/AuthContext.tsx`

**Step 1: Add token expiry check**

Parse the JWT access token to get `exp` claim. Set a timeout for 5 minutes before expiry. Show a banner:

```tsx
const [showExpiryWarning, setShowExpiryWarning] = useState(false)

// After setting access token, schedule warning:
const payload = JSON.parse(atob(token.split('.')[1]))
const expiresIn = payload.exp * 1000 - Date.now()
const warningTime = expiresIn - 5 * 60 * 1000 // 5 min before
if (warningTime > 0) {
  setTimeout(() => setShowExpiryWarning(true), warningTime)
}

// "Stay logged in" button calls refreshToken()
```

Expose `showExpiryWarning` and `dismissWarning` from context. Render the banner in the layout or App level.

**Step 2: Verify and commit**

```bash
cd client && npx tsc --noEmit
git add client/src/contexts/AuthContext.tsx
git commit -m "feat: session timeout warning 5 min before expiry"
```

---

### Task 25: Final Verification

**Step 1: Build both projects**

```bash
cd /Users/raghuchahar/Desktop/repcount/server && npx tsc --noEmit
cd /Users/raghuchahar/Desktop/repcount/client && npx tsc --noEmit
cd /Users/raghuchahar/Desktop/repcount/client && npx vite build
```

**Step 2: Fix any remaining TypeScript errors**

**Step 3: Push to origin**

```bash
git push origin main
```
