# Auth Overhaul + Theme Refresh — Design Doc

**Goal:** Add email/password login alongside phone/OTP, refresh the theme from orange to electric red with a bold/energetic cult.fit-like vibe.

---

## 1. Auth Flow

### Registration
- Single form: **Name, Email, Password, Phone (optional)**
- After registration → choose role (owner/member) → redirect to dashboard
- Email must be unique. Phone must be unique if provided.
- Password: minimum 6 characters

### Login
- Two tabs on login page: **Email/Password** | **Phone/OTP**
- Email/Password: standard email + password form
- Phone/OTP: existing flow (enter phone → enter OTP → done)
- Both methods resolve to the same User record

### User Model Changes
- Add fields: `email` (unique, sparse), `password_hash` (bcrypt)
- Keep existing: `phone` (unique, sparse), `role`, `full_name`
- A user can have email only, phone only, or both
- At least one of email or phone is required

### Account Linking
- If a user registers with email and later adds phone (or vice versa), the accounts merge
- Registration checks: if email already exists → error "email taken"
- Registration checks: if phone already exists → error "phone taken"

### Forgot Password
- MVP: "Forgot password?" link shows a message: "Contact your gym owner to reset"
- Future: email reset flow

### Pre-Login Access
- Gym discovery (`/m/discover`) and public gym pages (`/gym/:slug`) are accessible without login
- All other routes require authentication

### Dev/Test Mode
- Keep test OTP bypass for development (`TEST_PHONES` + `TEST_OTP` env vars)
- Add test email/password: env var `TEST_EMAIL` + `TEST_PASSWORD` for dev

---

## 2. Theme Refresh

### Color Palette

| Token | Old | New |
|-------|-----|-----|
| `accent-orange` → `accent-primary` | `#F97316` | `#FF3B3B` |
| `bg-primary` | `#0F0F0F` | `#0A0A0A` |
| `bg-card` | `#1A1A1A` | `#141414` |
| `bg-hover` | `#252525` | `#1E1E1E` |
| `text-primary` | `#FAFAFA` | `#FFFFFF` |
| `text-secondary` | `#A1A1AA` | `#9CA3AF` |

### Token Rename
- Rename `accent-orange` → `accent-primary` across all files
- This makes future color swaps trivial (change one CSS variable)

### Design Direction
- Bold & energetic (cult.fit-like)
- Deeper blacks for more contrast
- Electric red accent pops on dark backgrounds
- Keep existing layout, spacing, rounded corners
- All colors in `@theme` block in `index.css` — single source of truth

### Easy Color Swapping
- To try a different accent, change one line in `index.css`:
  - Blue: `--color-accent-primary: #3B82F6`
  - Green: `--color-accent-primary: #84CC16`
  - Purple: `--color-accent-primary: #8B5CF6`

---

## 3. Architecture Notes

- bcrypt for password hashing (via `bcryptjs` — pure JS, no native deps)
- Login endpoint returns same JWT tokens as OTP flow
- Registration is a new `POST /api/auth/register` endpoint
- Email login is `POST /api/auth/login` (separate from `verify-otp`)
- Discover Gyms page already works without login (public endpoint)
- GymPage already works without login (public endpoint)
- Theme changes are CSS-only + find-and-replace of `accent-orange` → `accent-primary`
