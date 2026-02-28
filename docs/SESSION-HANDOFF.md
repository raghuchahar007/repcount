# Session Handoff — 2026-02-28

## What Was Done This Session

### 1. Auth Overhaul + Theme Refresh (11 commits)
- **Theme:** Swapped orange accent (#F97316) to electric red (#FF3B3B), deeper blacks, renamed `accent-orange` → `accent-primary` across 28 files
- **User model:** Added `email` (sparse unique), `password_hash` fields; phone now nullable
- **Auth endpoints:** `POST /api/auth/register` (name+email+password+optional phone), `POST /api/auth/login` (email+password)
- **Client:** Login page with Email/Phone tabs, Registration page, updated AuthContext
- **Infra:** `drop-stale-indexes.ts` script for fixing MongoDB indexes after schema change
- Design doc: `docs/plans/2026-02-28-auth-theme-design.md`
- Plan: `docs/plans/2026-02-28-auth-theme-plan.md`

### 2. Full UX Overhaul (24 commits)
- Design doc: `docs/plans/2026-02-28-ux-overhaul-design.md`
- Plan: `docs/plans/2026-02-28-ux-overhaul-plan.md`

**Infrastructure (shared components):**
- Toast notification system (`ToastContext.tsx`) — app-wide success/error/info toasts
- Reusable `ErrorCard` component with retry button
- Skeleton loader components (`SkeletonDashboard`, `SkeletonList`, `SkeletonCard`)

**Navigation & Auth fixes:**
- RepCount logo clickable in both OwnerLayout and MemberLayout
- Gym selector uses React navigation instead of `window.location.reload()`
- VerifyOTP: resend OTP with 30s cooldown, masked phone display, redirect on refresh
- Login page: "Don't have an account? Register" wording

**Owner panel improvements:**
- Settings: unsaved changes indicator (yellow bar)
- Dashboard: auto-refresh on window focus
- Members list: two-tap check-in confirmation
- Renewals: search by name/phone + sort (most overdue / A-Z)
- Leads: "Convert to Member" button + source filter chips
- Posts: edit and delete functionality
- Pagination on Members, Leads, Posts (server-side, 20/page)

**Member experience improvements:**
- Home: clear primary/secondary check-in hierarchy
- Leaderboard: time period tabs (This Week / This Month / All Time)
- Diet/Workout: "Done for today" green button feedback
- Profile: editable name field
- Profile: "Leave Gym" option with confirmation
- Session timeout warning 5 min before JWT expiry

**Applied across all pages:**
- Skeleton loaders replacing spinners on 10 pages
- ErrorCard with retry on all error states
- Toast notifications replacing inline success/error messages on 7 pages
- Form validation error summaries on AddMember and Settings

---

## Current State

- **Branch:** `main` (latest: `c13b98d`)
- **All pushed to origin:** Yes
- **TypeScript:** Both client and server compile with 0 errors
- **Vite build:** Passes (704KB JS + 41KB CSS)

---

## Deployment Status

- **Vultr VPS:** Running at user's server with Nginx + PM2
- **MongoDB Atlas:** Free tier, Vultr IP whitelisted
- **Needs redeployment:** Yes — server needs `git pull`, `npm install`, `npm run build`, `npm run drop-indexes`, `pm2 restart`
- The `drop-indexes` step is critical — removes stale `email_1` and `phone_1` non-sparse indexes

---

## What's Next (Priority Order)

### Immediate
1. **Redeploy to Vultr** — pull latest, rebuild, run drop-indexes, restart PM2
2. **Test on phone** — verify auth flows (register, email login, OTP login), theme, all UX fixes
3. **Fix any bugs** found during testing

### Short-term
4. **Member experience features** (from previous session, already done):
   - Gym discovery + join request flow
   - Owner invite + member referral links
   - Badge auto-awarding after check-in
   - Workout/diet completion tracking
   - Daily motivation quotes
   - No-gym graceful states

### Medium-term (M3-M6 milestones)
5. **M3: Member Features** — Notifications, activity feed improvements
6. **M4: Engagement** — Challenges, streaks, gamification
7. **M5: Public** — Landing page, SEO, public gym profiles
8. **M6: Deploy** — CI/CD, monitoring, custom domain, SSL

---

## Key Files & Architecture

### Project Structure
```
repcount/
├── client/          # React 18 + Vite + Tailwind CSS v4
│   ├── src/
│   │   ├── api/         # API layer (auth, members, me, owner, posts, etc.)
│   │   ├── components/  # Shared + layout components
│   │   ├── contexts/    # AuthContext, ToastContext
│   │   ├── pages/       # owner/* and member/* page components
│   │   └── utils/       # Constants, helpers
│   └── vite.config.ts
├── server/          # Express 4 + Mongoose
│   ├── src/
│   │   ├── middleware/  # auth, roleGuard, gymAccess, validate, errorHandler
│   │   ├── models/      # User, Gym, Member, Membership, Lead, Post, Attendance, DailyLog, Badge
│   │   ├── routes/      # auth, gym, member, membership, dashboard, lead, post, attendance, public, me
│   │   ├── services/    # otp, token, badge
│   │   └── scripts/     # seed, drop-stale-indexes
│   └── tsconfig.json
├── deploy/          # setup-server.sh, deploy.sh
└── docs/plans/      # Design docs and implementation plans
```

### Auth Flow
- JWT: access token in memory, refresh token in httpOnly cookie
- Login: email+password OR phone+OTP (two tabs)
- Registration: name + email + password + optional phone
- Role selection: after first login, choose owner or member
- Session timeout warning 5 min before expiry

### Test Accounts
- **Owners:** +919999999999, +919999999901, +919999999902 (OTP: 123456)
- **Members:** +919999999903 through +919999999907 (OTP: 123456)
- **Test email/password:** Set via `TEST_EMAIL` and `TEST_PASSWORD` env vars (not yet configured)

### Theme
- Accent: `--color-accent-primary: #FF3B3B` (electric red)
- Backgrounds: `#0A0A0A` (primary), `#141414` (card), `#1E1E1E` (hover)
- All colors in `@theme` block in `client/src/index.css`
- To swap accent, change one line in index.css
