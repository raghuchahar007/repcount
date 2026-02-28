# Auth Overhaul + Theme Refresh — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add email/password auth alongside phone/OTP, refresh the theme to electric red with bold/energetic vibe.

**Architecture:** Add `email` and `password_hash` fields to User model. New `/auth/register` and `/auth/login` endpoints using bcryptjs. Login page gets two tabs (Email/Phone). Theme swap is CSS variable changes + global rename of `accent-orange` → `accent-primary`.

**Tech Stack:** Express 4, Mongoose, bcryptjs, React 18, Tailwind CSS v4

---

### Task 1: Theme color swap — CSS variables

**Files:**
- Modify: `client/src/index.css`

**Step 1: Update the @theme block**

Replace the current `@theme` block with:

```css
@theme {
  --color-bg-primary: #0A0A0A;
  --color-bg-card: #141414;
  --color-bg-hover: #1E1E1E;

  --color-accent-primary: #FF3B3B;
  --color-accent-primary-dark: #E02D2D;
  --color-accent-orange: #FF3B3B;
  --color-accent-orange-dark: #E02D2D;

  --color-status-green: #4ade80;
  --color-status-red: #ef4444;
  --color-status-yellow: #fbbf24;
  --color-status-blue: #60a5fa;
  --color-status-purple: #a855f7;

  --color-text-primary: #FFFFFF;
  --color-text-secondary: #9CA3AF;
  --color-text-muted: #6B7280;

  --color-border: #1E1E1E;
  --color-border-light: #2A2A2A;

  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

  --max-width-mobile: 480px;
}
```

NOTE: We keep `accent-orange` as an alias for `accent-primary` so nothing breaks. We'll rename usages in the next task.

**Step 2: Verify build**

Run: `cd client && npm run build`
Expected: Build succeeds, no errors

**Step 3: Commit**

```bash
git add client/src/index.css
git commit -m "feat: theme refresh — electric red accent, deeper blacks"
```

---

### Task 2: Rename accent-orange → accent-primary across codebase

**Files:**
- Modify: All files in `client/src/` that reference `accent-orange`

**Step 1: Find all usages**

Run: `grep -r "accent-orange" client/src/ --include="*.tsx" --include="*.ts" -l`

This will give you every file. In each file, replace ALL occurrences of `accent-orange` with `accent-primary`.

Common patterns to replace:
- `text-accent-orange` → `text-accent-primary`
- `bg-accent-orange` → `bg-accent-primary`
- `border-accent-orange` → `border-accent-primary`
- `ring-accent-orange` → `ring-accent-primary`
- `focus:border-accent-orange` → `focus:border-accent-primary`

**Step 2: Remove the alias from index.css**

After all references are updated, remove the old alias lines from `@theme`:
```css
  /* DELETE these two lines: */
  --color-accent-orange: #FF3B3B;
  --color-accent-orange-dark: #E02D2D;
```

**Step 3: Verify build**

Run: `cd client && npx tsc --noEmit && npm run build`
Expected: 0 errors

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: rename accent-orange to accent-primary"
```

---

### Task 3: Install bcryptjs + Update User model

**Files:**
- Modify: `server/src/models/User.ts`
- Run: `cd server && npm install bcryptjs && npm install -D @types/bcryptjs`

**Step 1: Install bcryptjs**

```bash
cd server && npm install bcryptjs && npm install -D @types/bcryptjs
```

**Step 2: Update User model**

Replace the entire file with:

```typescript
import mongoose, { Schema, Document } from 'mongoose'

export interface IUser extends Document {
  phone: string | null
  email: string | null
  password_hash: string | null
  role: 'owner' | 'member' | 'admin' | null
  full_name: string | null
  avatar_url: string | null
  created_at: Date
}

const userSchema = new Schema<IUser>({
  phone: { type: String, default: null, sparse: true, unique: true },
  email: { type: String, default: null, sparse: true, unique: true },
  password_hash: { type: String, default: null },
  role: { type: String, enum: ['owner', 'member', 'admin', null], default: null },
  full_name: { type: String, default: null },
  avatar_url: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
})

export const User = mongoose.model<IUser>('User', userSchema)
```

NOTE: `phone` changes from `required: true` to `default: null` with sparse unique index. This allows users who register with email only. Same for email — sparse unique means null values don't conflict.

**Step 3: Verify**

Run: `cd server && npx tsc --noEmit`
Expected: 0 errors (some files reference `user.phone` — they should still work since phone is still a string, just nullable)

**Step 4: Commit**

```bash
git add server/package.json server/package-lock.json server/src/models/User.ts
git commit -m "feat: add email and password_hash to User model"
```

---

### Task 4: Register endpoint

**Files:**
- Modify: `server/src/routes/auth.routes.ts`

**Step 1: Add register endpoint**

Add import at top:
```typescript
import bcrypt from 'bcryptjs'
```

Add the registration endpoint after the send-otp route:

```typescript
// POST /api/auth/register
const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().regex(/^\+91\d{10}$/).optional(),
})

router.post('/register', validate(registerSchema), async (req: Request, res: Response) => {
  try {
    const { name, email, password, phone } = req.body

    // Check email uniqueness
    const existingEmail = await User.findOne({ email: email.toLowerCase() })
    if (existingEmail) {
      return res.status(409).json({ error: 'Email already registered' })
    }

    // Check phone uniqueness if provided
    if (phone) {
      const existingPhone = await User.findOne({ phone })
      if (existingPhone) {
        return res.status(409).json({ error: 'Phone number already registered' })
      }
    }

    const password_hash = await bcrypt.hash(password, 10)

    const user = await User.create({
      email: email.toLowerCase(),
      password_hash,
      full_name: name,
      phone: phone || null,
    })

    const tokenPayload = {
      userId: user._id.toString(),
      phone: user.phone || '',
      role: user.role || '',
    }

    const accessToken = signAccessToken(tokenPayload)
    const refreshToken = signRefreshToken(tokenPayload)

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    })

    res.status(201).json({
      isNewUser: true,
      accessToken,
      user: {
        id: user._id,
        phone: user.phone,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
      },
    })
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Email or phone already registered' })
    }
    console.error('register error:', err)
    res.status(500).json({ error: 'Registration failed' })
  }
})
```

**Step 2: Add email/password login endpoint**

```typescript
// POST /api/auth/login
const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
})

router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const isMatch = await bcrypt.compare(password, user.password_hash)
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    // Auto-link member record if exists
    if (user.role === 'member' && user.phone) {
      const tenDigitPhone = user.phone.replace('+91', '')
      await Member.updateOne(
        { phone: tenDigitPhone, user: null },
        { $set: { user: user._id } }
      )
    }

    const tokenPayload = {
      userId: user._id.toString(),
      phone: user.phone || '',
      role: user.role || '',
    }

    const accessToken = signAccessToken(tokenPayload)
    const refreshToken = signRefreshToken(tokenPayload)

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    })

    res.json({
      accessToken,
      user: {
        id: user._id,
        phone: user.phone,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
      },
    })
  } catch (err: any) {
    console.error('login error:', err)
    res.status(500).json({ error: 'Login failed' })
  }
})
```

**Step 3: Update refresh endpoint to include email in response**

In the existing refresh handler, add `email: user.email` to the user response object.

**Step 4: Fix phone references**

Since `user.phone` can now be null, update the verify-otp handler's `tokenPayload` to use `phone: user.phone || ''`.

Also update the set-role handler similarly.

**Step 5: Verify**

Run: `cd server && npx tsc --noEmit`
Expected: 0 errors

**Step 6: Commit**

```bash
git add server/src/routes/auth.routes.ts
git commit -m "feat: add register and email/password login endpoints"
```

---

### Task 5: Client auth API + AuthContext updates

**Files:**
- Modify: `client/src/api/auth.ts`
- Modify: `client/src/contexts/AuthContext.tsx`

**Step 1: Add client API functions**

In `client/src/api/auth.ts`, add:

```typescript
export async function register(name: string, email: string, password: string, phone?: string) {
  const { data } = await api.post('/auth/register', { name, email, password, phone: phone || undefined })
  setAccessToken(data.accessToken)
  return data
}

export async function loginWithEmail(email: string, password: string) {
  const { data } = await api.post('/auth/login', { email, password })
  setAccessToken(data.accessToken)
  return data
}
```

**Step 2: Update AuthUser interface**

In `client/src/contexts/AuthContext.tsx`, add `email` to the AuthUser interface:

```typescript
interface AuthUser {
  id: string
  phone: string | null
  email: string | null
  role: 'owner' | 'member' | 'admin' | null
  full_name: string | null
}
```

**Step 3: Verify**

Run: `cd client && npx tsc --noEmit`

**Step 4: Commit**

```bash
git add client/src/api/auth.ts client/src/contexts/AuthContext.tsx
git commit -m "feat: client auth API for register and email login"
```

---

### Task 6: New Login page with tabs

**Files:**
- Rewrite: `client/src/pages/Login.tsx`

**Step 1: Rewrite Login page**

Replace the entire file with a two-tab login page:

```tsx
import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { sendOtp, loginWithEmail } from '@/api/auth'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

type Tab = 'email' | 'phone'

export default function Login() {
  const [tab, setTab] = useState<Tab>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { login } = useAuth()

  // Email form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Phone form state
  const [phone, setPhone] = useState('')

  async function handleEmailLogin(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!email || !password) return
    setLoading(true)
    try {
      const data = await loginWithEmail(email, password)
      login(data.accessToken, data.user)
      if (!data.user.role) {
        navigate('/choose-role', { replace: true })
      } else {
        navigate(data.user.role === 'owner' ? '/owner' : '/m', { replace: true })
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  async function handlePhoneSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    const cleanPhone = phone.replace(/\D/g, '').slice(-10)
    if (cleanPhone.length !== 10) {
      setError('Enter a valid 10-digit phone number')
      return
    }
    const fullPhone = `+91${cleanPhone}`
    setLoading(true)
    try {
      await sendOtp(fullPhone)
      navigate('/verify', { state: { phone: fullPhone } })
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-accent-primary mb-2">GymRep</h1>
          <p className="text-text-secondary">Your Gym, Upgraded</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-bg-card rounded-xl p-1 mb-6">
          <button
            onClick={() => { setTab('email'); setError('') }}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
              tab === 'email' ? 'bg-accent-primary text-white' : 'text-text-secondary'
            }`}
          >
            Email
          </button>
          <button
            onClick={() => { setTab('phone'); setError('') }}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
              tab === 'phone' ? 'bg-accent-primary text-white' : 'text-text-secondary'
            }`}
          >
            Phone
          </button>
        </div>

        {tab === 'email' ? (
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p className="text-status-red text-sm">{error}</p>}
            <Button type="submit" fullWidth loading={loading} disabled={!email || !password}>
              Login
            </Button>
          </form>
        ) : (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Phone Number</label>
              <div className="flex gap-2">
                <div className="bg-bg-card border border-border-light rounded-xl px-4 py-3 text-sm text-text-secondary">
                  +91
                </div>
                <Input
                  type="tel"
                  inputMode="numeric"
                  placeholder="9999999999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  autoFocus
                />
              </div>
            </div>
            {error && <p className="text-status-red text-sm">{error}</p>}
            <Button type="submit" fullWidth loading={loading} disabled={phone.replace(/\D/g, '').length < 10}>
              Send OTP
            </Button>
          </form>
        )}

        <div className="text-center mt-6">
          <Link to="/register" className="text-accent-primary text-sm font-medium">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Verify**

Run: `cd client && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add client/src/pages/Login.tsx
git commit -m "feat: login page with email/password and phone/OTP tabs"
```

---

### Task 7: Registration page

**Files:**
- Create: `client/src/pages/Register.tsx`
- Modify: `client/src/App.tsx` — add `/register` route

**Step 1: Create Register page**

```tsx
import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { register } from '@/api/auth'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { login } = useAuth()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!name.trim() || !email || !password) {
      setError('Name, email and password are required')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    const fullPhone = phone.replace(/\D/g, '').length === 10
      ? `+91${phone.replace(/\D/g, '')}`
      : undefined

    setLoading(true)
    try {
      const data = await register(name.trim(), email, password, fullPhone)
      login(data.accessToken, data.user)
      navigate('/choose-role', { replace: true })
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-accent-primary mb-2">GymRep</h1>
          <p className="text-text-secondary">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            placeholder="Rahul Sharma"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <Input
            label="Email"
            type="email"
            placeholder="rahul@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            placeholder="Min 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Phone (optional)</label>
            <div className="flex gap-2">
              <div className="bg-bg-card border border-border-light rounded-xl px-4 py-3 text-sm text-text-secondary">
                +91
              </div>
              <Input
                type="tel"
                inputMode="numeric"
                placeholder="9999999999"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              />
            </div>
          </div>

          {error && <p className="text-status-red text-sm">{error}</p>}

          <Button type="submit" fullWidth loading={loading} disabled={!name.trim() || !email || !password}>
            Create Account
          </Button>
        </form>

        <div className="text-center mt-6">
          <Link to="/login" className="text-text-secondary text-sm">
            Already have an account? <span className="text-accent-primary font-medium">Login</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Add route in App.tsx**

Import:
```tsx
import Register from '@/pages/Register'
```

Add route after `/login`:
```tsx
<Route path="/register" element={<Register />} />
```

**Step 3: Verify**

Run: `cd client && npx tsc --noEmit`

**Step 4: Commit**

```bash
git add client/src/pages/Register.tsx client/src/App.tsx
git commit -m "feat: registration page with email/password"
```

---

### Task 8: Update VerifyOtp to use accent-primary

**Files:**
- Modify: `client/src/pages/VerifyOtp.tsx`

**Step 1: Replace accent-orange reference**

Find: `focus:border-accent-orange`
Replace: `focus:border-accent-primary`

This should be the only reference if Task 2 didn't catch it already. Double-check with:
```bash
grep -r "accent-orange" client/src/
```

If any remain, fix them all.

**Step 2: Verify and commit**

```bash
cd client && npx tsc --noEmit
git add -A
git commit -m "fix: ensure all accent-orange references are updated"
```

---

### Task 9: Fix server references to nullable phone

**Files:**
- Modify: `server/src/routes/auth.routes.ts` — update verify-otp and set-role handlers
- Modify: `server/src/routes/me.routes.ts` — check member linking code
- Modify: `server/src/middleware/auth.ts` — verify no phone assumptions

**Step 1: Audit nullable phone references**

Run: `grep -rn "user.phone" server/src/ --include="*.ts"` and `grep -rn "\.phone" server/src/routes/auth.routes.ts`

For each reference to `user.phone`, ensure it handles null:
- In token payload: `phone: user.phone || ''`
- In member linking: only run if `user.phone` is truthy
- In response objects: include `email: user.email` alongside phone

**Step 2: Update verify-otp handler**

The verify-otp handler creates users by phone — that's fine, phone users always have a phone. But ensure the token payload uses `phone: user.phone || ''`.

**Step 3: Update set-role handler**

Same — ensure `phone: user.phone || ''` in token payload. Add member linking guard:
```typescript
if (newRole === 'member' && user.phone) {
  // existing linking code
}
```

**Step 4: Update refresh handler**

Add `email: user.email` to the response.

**Step 5: Verify**

Run: `cd server && npx tsc --noEmit`

**Step 6: Commit**

```bash
git add server/src/
git commit -m "fix: handle nullable phone across auth handlers"
```

---

### Task 10: Drop stale MongoDB indexes

**Files:**
- Create: `server/src/scripts/drop-stale-indexes.ts`

**Step 1: Create migration script**

```typescript
import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config()

async function dropStaleIndexes() {
  await mongoose.connect(process.env.MONGODB_URI!)
  console.log('Connected to MongoDB')

  const db = mongoose.connection.db!
  const usersCollection = db.collection('users')

  // List current indexes
  const indexes = await usersCollection.indexes()
  console.log('Current indexes:', indexes.map(i => i.name))

  // Drop email_1 if it exists (stale from old schema)
  try {
    await usersCollection.dropIndex('email_1')
    console.log('Dropped stale email_1 index')
  } catch (e: any) {
    if (e.codeName === 'IndexNotFound') {
      console.log('email_1 index not found (already dropped)')
    } else {
      throw e
    }
  }

  // Drop phone_1 if exists (will be recreated as sparse by Mongoose)
  try {
    await usersCollection.dropIndex('phone_1')
    console.log('Dropped phone_1 index (will be recreated as sparse)')
  } catch (e: any) {
    if (e.codeName === 'IndexNotFound') {
      console.log('phone_1 index not found')
    } else {
      throw e
    }
  }

  // Let Mongoose recreate indexes with new schema (sparse)
  await mongoose.connection.syncIndexes()
  console.log('Indexes synced')

  const newIndexes = await usersCollection.indexes()
  console.log('New indexes:', newIndexes.map(i => `${i.name} ${JSON.stringify(i.key)}`))

  process.exit(0)
}

dropStaleIndexes().catch(e => { console.error(e); process.exit(1) })
```

**Step 2: Add script to package.json**

In `server/package.json`, add to scripts:
```json
"drop-indexes": "npx ts-node src/scripts/drop-stale-indexes.ts"
```

**Step 3: Commit**

```bash
git add server/src/scripts/drop-stale-indexes.ts server/package.json
git commit -m "feat: add script to drop stale indexes and sync new ones"
```

---

### Task 11: Integration test — verify all flows

**Step 1: Build both**

```bash
cd server && npx tsc --noEmit
cd ../client && npx tsc --noEmit && npm run build
```

**Step 2: Test register**

```bash
curl -s -X POST http://localhost:5001/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}' | python3 -m json.tool
```
Expected: 201 with `accessToken`, `user` with email

**Step 3: Test email login**

```bash
curl -s -X POST http://localhost:5001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"password123"}' | python3 -m json.tool
```
Expected: 200 with `accessToken`

**Step 4: Test OTP still works**

```bash
curl -s -X POST http://localhost:5001/api/auth/send-otp \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+919999999999"}'

curl -s -X POST http://localhost:5001/api/auth/verify-otp \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+919999999999","otp":"123456"}' | python3 -m json.tool
```
Expected: Both succeed

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: auth overhaul + theme refresh complete"
```
