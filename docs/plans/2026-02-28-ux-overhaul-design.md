# UX Overhaul — Design Doc

**Goal:** Fix all UX bugs and polish the app across owner and member experiences.

---

## 1. Navigation & Global UX

### 1a. Clickable Logo
- OwnerLayout: "RepCount" links to `/owner`
- MemberLayout: "RepCount" links to `/m`

### 1b. Gym Selector Fix
- Replace `window.location.reload()` with React state update
- Store selected gym in context, re-fetch data via `useEffect` on `activeGymId`

### 1c. VerifyOTP Improvements
- Add "Resend OTP" button with 30s cooldown timer
- On refresh (no `location.state.phone`), redirect to `/login`
- Show masked phone: "OTP sent to +91 99999***99"

### 1d. Login Wording
- "Create an account" → "Don't have an account? Register"

### 1e. Global Error States
- Reusable `<ErrorCard message={} onRetry={} />` component
- Apply to all pages that fetch data

### 1f. Toast Notification System
- Simple toast context for success/error messages app-wide
- Replaces inline disappearing messages

---

## 2. Owner Panel UX

### 2a. Member Detail Refresh
- After recording payment, re-fetch member data so "Current Plan" updates immediately

### 2b. Settings Unsaved Changes
- Track form dirty state, show yellow "Unsaved changes" bar
- Warn before navigating away

### 2c. Renewals Search & Sort
- Add search by name/phone
- Sort: most overdue first, expiring soonest, alphabetical

### 2d. Leads Conversion & Filters
- "Convert to Member" button → creates Member, marks Lead as `converted`
- Filter by source (app_request, referral, owner_invite, website)

### 2e. Posts Edit/Delete
- Edit button → opens CreatePost form pre-filled
- Delete button → confirmation dialog
- New API endpoints: PUT and DELETE for posts

### 2f. Editable Member Details
- "Edit" button on Member Detail page
- Inline editing for name, phone, goal, diet preference

### 2g. Check-in Confirmation
- Members list: "Tap again to confirm" instead of instant check-in

### 2h. Dashboard Auto-Refresh
- Re-fetch stats when navigating back to Dashboard

---

## 3. Member UX

### 3a. Check-in Clarity
- Primary: "Check In" (scan gym QR)
- Secondary: "Show QR to staff"
- One-line explanation under each

### 3b. Leaderboard Time Periods
- Tabs: "This Week" | "This Month" | "All Time"
- Backend: add `period` query param to leaderboard endpoint

### 3c. Diet/Workout Done Feedback
- Button text → "Done for today ✓" when completed
- Green state persists until next day

### 3d. Profile Editability
- Allow editing name and phone from Profile page

### 3e. Member Leave Gym
- "Leave Gym" in Profile with confirmation
- Removes member-gym association

---

## 4. Polish & Infrastructure

### 4a. Skeleton Loaders
- Replace spinners on: Dashboard, Members list, Member Detail, Feed, Leaderboard

### 4b. Pagination
- 20 items/page on: Members list, Leads, Posts, Payment history, Attendance records

### 4c. Form Validation Summaries
- AddMember and Settings: error count at top, scroll to first error

### 4d. Session Timeout Warning
- Banner 5 min before token expiry: "Session expiring soon" + "Stay logged in" button

---

## Architecture Notes

- Toast system: React context + portal, no external dependency
- Skeleton loaders: simple CSS pulse animations, no library
- Pagination: server-side with `?page=1&limit=20` query params
- All changes are client-side except: posts edit/delete endpoints, leaderboard period param, pagination params, lead conversion endpoint
- Leave gym: new `DELETE /api/me/gym/:gymId` endpoint
