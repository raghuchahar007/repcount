# M0: Project Setup & Architecture — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove Next.js/Supabase code, set up MERN monorepo with Express backend + React/Vite frontend, all Mongoose models, and ported shared utilities.

**Architecture:** Monorepo with `client/` (React 18 + Vite + Tailwind v4) and `server/` (Express 4 + TypeScript + Mongoose). Root `package.json` uses `concurrently` to run both. No tests in M0 — this is pure scaffolding.

**Tech Stack:** React 18, Vite 6, React Router v6, Tailwind CSS v4, Express 4, Mongoose 8, TypeScript 5, concurrently

---

### Task 1: Clean up existing Next.js files

**Files:**
- Delete: `src/` (entire directory)
- Delete: `supabase/` (entire directory)
- Delete: `next.config.js`, `tailwind.config.ts`, `tsconfig.json`, `postcss.config.mjs` (if exists)
- Delete: `public/` (will recreate in client/)
- Delete: `.env.local`
- Keep: `docs/`, `.git/`, `.gitignore`, `package.json` (will replace)

**Step 1: Delete all Next.js/Supabase files**

```bash
rm -rf src/ supabase/ next.config.js tailwind.config.ts tsconfig.json postcss.config.mjs public/ .env.local .next/ node_modules/
```

**Step 2: Verify clean state**

```bash
ls -la
# Should see: docs/ .git/ .gitignore package.json (and maybe package-lock.json)
```

**Step 3: Commit the cleanup**

```bash
git add -A
git commit -m "chore: remove Next.js + Supabase codebase for MERN migration"
```

---

### Task 2: Set up server/ Express boilerplate

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/src/server.ts`
- Create: `server/src/app.ts`
- Create: `server/src/utils/db.ts`
- Create: `server/.env.example`

**Step 1: Create server directory and initialize**

```bash
mkdir -p server/src/{models,routes,middleware,services,utils}
```

**Step 2: Create server/package.json**

```json
{
  "name": "gymrep-server",
  "version": "1.0.0",
  "scripts": {
    "dev": "npx nodemon --exec npx ts-node --esm src/server.ts",
    "build": "npx tsc",
    "start": "node dist/server.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.21.0",
    "mongoose": "^8.9.0",
    "jsonwebtoken": "^9.0.2",
    "cookie-parser": "^1.4.7",
    "zod": "^3.24.0",
    "express-rate-limit": "^7.5.0",
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/cors": "^2.8.17",
    "@types/jsonwebtoken": "^9.0.7",
    "@types/cookie-parser": "^1.4.8",
    "@types/node": "^22.0.0",
    "typescript": "^5.7.0",
    "ts-node": "^10.9.0",
    "nodemon": "^3.1.0"
  }
}
```

**Step 3: Create server/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 4: Create server/src/utils/db.ts**

```typescript
import mongoose from 'mongoose'

export async function connectDB() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('MONGODB_URI is not set')
    process.exit(1)
  }
  try {
    await mongoose.connect(uri)
    console.log('MongoDB connected')
  } catch (err) {
    console.error('MongoDB connection error:', err)
    process.exit(1)
  }
}
```

**Step 5: Create server/src/app.ts**

```typescript
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

const app = express()

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())
app.use(cookieParser())

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// TODO: Mount routes here in M1+

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err)
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  })
})

export default app
```

**Step 6: Create server/src/server.ts**

```typescript
import dotenv from 'dotenv'
dotenv.config()

import app from './app'
import { connectDB } from './utils/db'

const PORT = process.env.PORT || 5000

async function start() {
  await connectDB()
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
}

start()
```

**Step 7: Create server/.env.example**

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/gymrep
JWT_SECRET=your-secret-key-min-32-chars
JWT_REFRESH_SECRET=different-secret-key-min-32-chars
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
CLIENT_URL=http://localhost:5173
TEST_PHONE=+919999999999
TEST_OTP=123456
```

**Step 8: Install server dependencies and verify it compiles**

```bash
cd server && npm install && npx tsc --noEmit
```

Expected: 0 errors

**Step 9: Commit**

```bash
git add server/
git commit -m "feat(server): Express + TypeScript + Mongoose boilerplate"
```

---

### Task 3: Create all 8 Mongoose models

**Files:**
- Create: `server/src/models/User.ts`
- Create: `server/src/models/Gym.ts`
- Create: `server/src/models/Member.ts`
- Create: `server/src/models/Membership.ts`
- Create: `server/src/models/Attendance.ts`
- Create: `server/src/models/GymPost.ts`
- Create: `server/src/models/Lead.ts`
- Create: `server/src/models/Progress.ts`

**Step 1: Create User model** (`server/src/models/User.ts`)

```typescript
import mongoose, { Schema, Document } from 'mongoose'

export interface IUser extends Document {
  phone: string
  role: 'owner' | 'member' | 'admin'
  full_name: string | null
  avatar_url: string | null
  created_at: Date
}

const userSchema = new Schema<IUser>({
  phone: { type: String, required: true, unique: true },
  role: { type: String, enum: ['owner', 'member', 'admin'], default: 'member' },
  full_name: { type: String, default: null },
  avatar_url: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
})

userSchema.index({ phone: 1 }, { unique: true })

export const User = mongoose.model<IUser>('User', userSchema)
```

**Step 2: Create Gym model** (`server/src/models/Gym.ts`)

```typescript
import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IGym extends Document {
  owner: Types.ObjectId
  name: string
  slug: string
  city: string
  address: string | null
  phone: string | null
  description: string | null
  logo_url: string | null
  opening_time: string | null
  closing_time: string | null
  pricing: Record<string, number>
  facilities: string[]
  upi_id: string | null
  created_at: Date
}

const gymSchema = new Schema<IGym>({
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  city: { type: String, required: true },
  address: { type: String, default: null },
  phone: { type: String, default: null },
  description: { type: String, default: null },
  logo_url: { type: String, default: null },
  opening_time: { type: String, default: null },
  closing_time: { type: String, default: null },
  pricing: { type: Schema.Types.Mixed, default: {} },
  facilities: [{ type: String }],
  upi_id: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
})

gymSchema.index({ slug: 1 }, { unique: true })
gymSchema.index({ owner: 1 })

export const Gym = mongoose.model<IGym>('Gym', gymSchema)
```

**Step 3: Create Member model** (`server/src/models/Member.ts`)

```typescript
import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IBadge {
  badge_type: string
  earned_at: Date
}

export interface IMember extends Document {
  user: Types.ObjectId | null
  gym: Types.ObjectId
  name: string
  phone: string
  goal: 'weight_loss' | 'muscle_gain' | 'general'
  diet_pref: 'veg' | 'nonveg' | 'egg'
  budget: 'low' | 'medium' | 'high'
  join_date: Date
  dob: Date | null
  emergency_phone: string | null
  notes: string | null
  is_active: boolean
  badges: IBadge[]
  created_at: Date
}

const badgeSchema = new Schema<IBadge>({
  badge_type: { type: String, required: true },
  earned_at: { type: Date, default: Date.now },
}, { _id: false })

const memberSchema = new Schema<IMember>({
  user: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  gym: { type: Schema.Types.ObjectId, ref: 'Gym', required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  goal: { type: String, enum: ['weight_loss', 'muscle_gain', 'general'], default: 'general' },
  diet_pref: { type: String, enum: ['veg', 'nonveg', 'egg'], default: 'veg' },
  budget: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  join_date: { type: Date, default: Date.now },
  dob: { type: Date, default: null },
  emergency_phone: { type: String, default: null },
  notes: { type: String, default: null },
  is_active: { type: Boolean, default: true },
  badges: [badgeSchema],
  created_at: { type: Date, default: Date.now },
})

memberSchema.index({ gym: 1, is_active: 1 })
memberSchema.index({ gym: 1, phone: 1 }, { unique: true })
memberSchema.index({ user: 1 })

export const Member = mongoose.model<IMember>('Member', memberSchema)
```

**Step 4: Create Membership model** (`server/src/models/Membership.ts`)

```typescript
import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IMembership extends Document {
  member: Types.ObjectId
  gym: Types.ObjectId
  plan_type: 'monthly' | 'quarterly' | 'half_yearly' | 'yearly'
  amount: number
  start_date: Date
  expiry_date: Date
  payment_method: 'cash' | 'upi' | 'card' | 'online'
  status: 'active' | 'expired' | 'cancelled'
  paid_at: Date
  created_at: Date
}

const membershipSchema = new Schema<IMembership>({
  member: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
  gym: { type: Schema.Types.ObjectId, ref: 'Gym', required: true },
  plan_type: { type: String, enum: ['monthly', 'quarterly', 'half_yearly', 'yearly'], required: true },
  amount: { type: Number, required: true },
  start_date: { type: Date, required: true },
  expiry_date: { type: Date, required: true },
  payment_method: { type: String, enum: ['cash', 'upi', 'card', 'online'], default: 'cash' },
  status: { type: String, enum: ['active', 'expired', 'cancelled'], default: 'active' },
  paid_at: { type: Date, default: Date.now },
  created_at: { type: Date, default: Date.now },
})

membershipSchema.index({ member: 1, expiry_date: -1 })
membershipSchema.index({ gym: 1, status: 1 })
membershipSchema.index({ gym: 1, paid_at: -1 })

export const Membership = mongoose.model<IMembership>('Membership', membershipSchema)
```

**Step 5: Create Attendance model** (`server/src/models/Attendance.ts`)

```typescript
import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IAttendance extends Document {
  member: Types.ObjectId
  gym: Types.ObjectId
  check_in_date: Date
  checked_in_at: Date
}

const attendanceSchema = new Schema<IAttendance>({
  member: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
  gym: { type: Schema.Types.ObjectId, ref: 'Gym', required: true },
  check_in_date: { type: Date, required: true },
  checked_in_at: { type: Date, default: Date.now },
})

attendanceSchema.index({ member: 1, gym: 1, check_in_date: 1 }, { unique: true })
attendanceSchema.index({ gym: 1, check_in_date: -1 })
attendanceSchema.index({ member: 1, checked_in_at: -1 })

export const Attendance = mongoose.model<IAttendance>('Attendance', attendanceSchema)
```

**Step 6: Create GymPost model** (`server/src/models/GymPost.ts`)

```typescript
import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IGymPost extends Document {
  gym: Types.ObjectId
  author: Types.ObjectId
  title: string
  body: string | null
  post_type: 'challenge' | 'event' | 'offer' | 'announcement'
  image_url: string | null
  starts_at: Date | null
  ends_at: Date | null
  is_published: boolean
  participants: Types.ObjectId[]
  created_at: Date
}

const gymPostSchema = new Schema<IGymPost>({
  gym: { type: Schema.Types.ObjectId, ref: 'Gym', required: true },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  body: { type: String, default: null },
  post_type: { type: String, enum: ['challenge', 'event', 'offer', 'announcement'], required: true },
  image_url: { type: String, default: null },
  starts_at: { type: Date, default: null },
  ends_at: { type: Date, default: null },
  is_published: { type: Boolean, default: true },
  participants: [{ type: Schema.Types.ObjectId, ref: 'Member' }],
  created_at: { type: Date, default: Date.now },
})

gymPostSchema.index({ gym: 1, created_at: -1 })

export const GymPost = mongoose.model<IGymPost>('GymPost', gymPostSchema)
```

**Step 7: Create Lead model** (`server/src/models/Lead.ts`)

```typescript
import mongoose, { Schema, Document, Types } from 'mongoose'

export interface ILead extends Document {
  gym: Types.ObjectId
  name: string
  phone: string
  goal: string | null
  source: 'gym_page' | 'referral' | 'trial' | 'walkin' | 'other'
  referrer: Types.ObjectId | null
  status: 'new' | 'contacted' | 'converted' | 'lost'
  notes: string | null
  created_at: Date
}

const leadSchema = new Schema<ILead>({
  gym: { type: Schema.Types.ObjectId, ref: 'Gym', required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  goal: { type: String, default: null },
  source: { type: String, enum: ['gym_page', 'referral', 'trial', 'walkin', 'other'], default: 'other' },
  referrer: { type: Schema.Types.ObjectId, ref: 'Member', default: null },
  status: { type: String, enum: ['new', 'contacted', 'converted', 'lost'], default: 'new' },
  notes: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
})

leadSchema.index({ gym: 1, status: 1 })
leadSchema.index({ gym: 1, created_at: -1 })

export const Lead = mongoose.model<ILead>('Lead', leadSchema)
```

**Step 8: Create Progress model** (`server/src/models/Progress.ts`)

```typescript
import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IProgress extends Document {
  member: Types.ObjectId
  metric: string
  value: number
  recorded_at: Date
}

const progressSchema = new Schema<IProgress>({
  member: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
  metric: { type: String, required: true },
  value: { type: Number, required: true },
  recorded_at: { type: Date, default: Date.now },
})

progressSchema.index({ member: 1, metric: 1, recorded_at: -1 })

export const Progress = mongoose.model<IProgress>('Progress', progressSchema)
```

**Step 9: Verify all models compile**

```bash
cd server && npx tsc --noEmit
```

Expected: 0 errors

**Step 10: Commit**

```bash
git add server/src/models/
git commit -m "feat(server): add all 8 Mongoose models with indexes"
```

---

### Task 4: Set up client/ React + Vite + Tailwind v4 boilerplate

**Files:**
- Create: `client/package.json`
- Create: `client/index.html`
- Create: `client/vite.config.ts`
- Create: `client/tsconfig.json`
- Create: `client/tsconfig.node.json`
- Create: `client/src/main.tsx`
- Create: `client/src/App.tsx`
- Create: `client/src/index.css`
- Create: `client/public/manifest.json`

**Step 1: Create client directory structure**

```bash
mkdir -p client/src/{api,components/{ui,layout,shared},contexts,hooks,pages/{owner,member,gym,checkin},utils}
mkdir -p client/public
```

**Step 2: Create client/package.json**

```json
{
  "name": "gymrep-client",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0",
    "axios": "^1.7.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "tailwindcss": "^4.2.1",
    "@tailwindcss/vite": "^4.2.1",
    "typescript": "^5.7.0",
    "vite": "^6.0.0"
  }
}
```

**Step 3: Create client/vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
```

**Step 4: Create client/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src", "vite-env.d.ts"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**Step 5: Create client/tsconfig.node.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

**Step 6: Create client/index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <meta name="theme-color" content="#0a0a0a" />
  <link rel="manifest" href="/manifest.json" />
  <title>GymRep — Your Gym, Upgraded</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

**Step 7: Create client/src/index.css** (port existing globals.css)

```css
@import "tailwindcss";

@source "../src/components/**/*.{ts,tsx}";
@source "../src/pages/**/*.{ts,tsx}";
@source "../src/contexts/**/*.{ts,tsx}";

@theme {
  --color-bg-primary: #0a0a0a;
  --color-bg-card: #111111;
  --color-bg-hover: #1a1a1a;

  --color-accent-orange: #ff6b35;
  --color-accent-orange-dark: #e55a2b;

  --color-status-green: #4ade80;
  --color-status-red: #ef4444;
  --color-status-yellow: #fbbf24;
  --color-status-blue: #60a5fa;
  --color-status-purple: #a855f7;

  --color-text-primary: #ffffff;
  --color-text-secondary: #999999;
  --color-text-muted: #707070;

  --color-border: #1a1a1a;
  --color-border-light: #222222;

  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

  --max-width-mobile: 480px;
}

@layer base {
  html {
    touch-action: manipulation;
  }

  body {
    background-color: var(--color-bg-primary);
    color: var(--color-text-primary);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  button, a, [role="button"] {
    cursor: pointer;
  }
}

@utility scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
}
```

**Step 8: Create client/src/main.tsx**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
```

**Step 9: Create client/src/App.tsx** (minimal shell)

```tsx
import { Routes, Route } from 'react-router-dom'

export default function App() {
  return (
    <div className="max-w-mobile mx-auto min-h-screen">
      <Routes>
        <Route path="/" element={
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-accent-orange mb-2">GymRep</h1>
              <p className="text-text-secondary">Your Gym, Upgraded</p>
              <p className="text-text-muted text-sm mt-4">MERN Stack — M0 Complete</p>
            </div>
          </div>
        } />
      </Routes>
    </div>
  )
}
```

**Step 10: Create client/src/vite-env.d.ts**

```typescript
/// <reference types="vite/client" />
```

**Step 11: Create client/public/manifest.json**

```json
{
  "name": "GymRep",
  "short_name": "GymRep",
  "description": "Your Gym, Upgraded",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#0a0a0a"
}
```

**Step 12: Install client dependencies and verify it compiles**

```bash
cd client && npm install && npx tsc --noEmit
```

Expected: 0 errors

**Step 13: Commit**

```bash
git add client/
git commit -m "feat(client): React + Vite + Tailwind v4 boilerplate"
```

---

### Task 5: Port shared utilities to client/

**Files:**
- Create: `client/src/utils/helpers.ts` (port from utils.ts)
- Create: `client/src/utils/constants.ts` (port from constants.ts)
- Create: `client/src/utils/whatsapp.ts` (port from whatsapp.ts)
- Create: `client/src/utils/types.ts` (adapt from types.ts for MongoDB)

**Step 1: Create client/src/utils/helpers.ts** (exact port of utils.ts — no changes needed, all pure functions)

```typescript
// Date helpers — all IST-aware

/** Returns today's date as YYYY-MM-DD in IST (Asia/Kolkata) */
export function todayIST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

/** Returns today's date as ISO start-of-day in IST: YYYY-MM-DDT00:00:00+05:30 */
export function todayISTTimestamp(): string {
  return `${todayIST()}T00:00:00+05:30`
}

/** Converts a TIMESTAMPTZ ISO string to IST date string (YYYY-MM-DD) */
export function toISTDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

/** Returns current day name in IST (e.g., "Monday") */
export function currentDayIST(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Kolkata' })
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function daysUntil(date: string | Date): number {
  const nowIST = todayIST()
  const nowMs = new Date(nowIST + 'T00:00:00+05:30').getTime()
  const targetMs = new Date(new Date(date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) + 'T00:00:00+05:30').getTime()
  return Math.ceil((targetMs - nowMs) / (1000 * 60 * 60 * 24))
}

export function daysSince(date: string | Date): number {
  return -daysUntil(date)
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

export function formatPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '')
  if (clean.length === 10) return `${clean.slice(0, 5)} ${clean.slice(5)}`
  if (clean.length === 12 && clean.startsWith('91')) return `${clean.slice(2, 7)} ${clean.slice(7)}`
  return phone
}

export function getInitials(name: string): string {
  if (!name || !name.trim()) return '??'
  return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export function getMembershipStatus(expiryDate: string): 'active' | 'expiring' | 'expired' {
  const days = daysUntil(expiryDate)
  if (days < 0) return 'expired'
  if (days <= 7) return 'expiring'
  return 'active'
}
```

**Step 2: Create client/src/utils/constants.ts** (exact copy of existing constants.ts)

Copy the file as-is — no changes needed.

**Step 3: Create client/src/utils/whatsapp.ts** (exact copy of existing whatsapp.ts)

Copy the file as-is — no changes needed.

**Step 4: Create client/src/utils/types.ts** (adapted for MongoDB — string IDs, Date fields)

```typescript
// Types for GymRep MERN stack
// IDs are MongoDB ObjectId strings

export interface User {
  _id: string
  phone: string
  role: 'owner' | 'member' | 'admin'
  full_name: string | null
  avatar_url: string | null
  created_at: string
}

export interface Gym {
  _id: string
  owner: string
  name: string
  slug: string
  city: string
  address: string | null
  phone: string | null
  description: string | null
  logo_url: string | null
  opening_time: string | null
  closing_time: string | null
  pricing: Record<string, number>
  facilities: string[]
  upi_id: string | null
  created_at: string
}

export interface Badge {
  badge_type: string
  earned_at: string
}

export interface Member {
  _id: string
  user: string | null
  gym: string | Gym
  name: string
  phone: string
  goal: 'weight_loss' | 'muscle_gain' | 'general'
  diet_pref: 'veg' | 'nonveg' | 'egg'
  budget: 'low' | 'medium' | 'high'
  join_date: string
  dob: string | null
  emergency_phone: string | null
  notes: string | null
  is_active: boolean
  badges: Badge[]
  created_at: string
}

export interface Membership {
  _id: string
  member: string
  gym: string
  plan_type: 'monthly' | 'quarterly' | 'half_yearly' | 'yearly'
  amount: number
  start_date: string
  expiry_date: string
  payment_method: 'cash' | 'upi' | 'card' | 'online'
  status: 'active' | 'expired' | 'cancelled'
  paid_at: string
  created_at: string
}

export interface Attendance {
  _id: string
  member: string
  gym: string
  check_in_date: string
  checked_in_at: string
}

export interface GymPost {
  _id: string
  gym: string
  author: string
  title: string
  body: string | null
  post_type: 'challenge' | 'event' | 'offer' | 'announcement'
  image_url: string | null
  starts_at: string | null
  ends_at: string | null
  is_published: boolean
  participants: string[]
  created_at: string
}

export interface Lead {
  _id: string
  gym: string
  name: string
  phone: string
  goal: string | null
  source: 'gym_page' | 'referral' | 'trial' | 'walkin' | 'other'
  referrer: string | null
  status: 'new' | 'contacted' | 'converted' | 'lost'
  notes: string | null
  created_at: string
}

export interface Progress {
  _id: string
  member: string
  metric: string
  value: number
  recorded_at: string
}

// Composite types for UI
export interface MemberWithMembership extends Member {
  latest_membership?: Membership
  membership_status?: 'overdue' | 'expiring_soon' | 'active' | 'no_plan'
  days_overdue?: number
  last_attendance?: string
}
```

**Step 5: Verify client compiles**

```bash
cd client && npx tsc --noEmit
```

Expected: 0 errors

**Step 6: Commit**

```bash
git add client/src/utils/
git commit -m "feat(client): port shared utilities (helpers, constants, whatsapp, types)"
```

---

### Task 6: Port UI components to client/

**Files:**
- Create: `client/src/components/ui/Button.tsx`
- Create: `client/src/components/ui/Card.tsx`
- Create: `client/src/components/ui/Input.tsx`
- Create: `client/src/components/ui/Badge.tsx`
- Create: `client/src/components/layout/BottomNav.tsx`
- Create: `client/src/components/shared/LoadingSpinner.tsx`

**Step 1: Create Button.tsx** (remove `'use client'`, otherwise identical)

Port from existing, removing the `'use client'` directive (not needed in Vite/React).

**Step 2: Create Card.tsx** (identical — no Next.js deps)

Port as-is.

**Step 3: Create Input.tsx** (remove `'use client'`)

Port from existing, removing the `'use client'` directive.

**Step 4: Create Badge.tsx** (identical — no Next.js deps)

Port as-is.

**Step 5: Create BottomNav.tsx** (replace `next/link` and `next/navigation` with react-router-dom)

```tsx
import { Link, useLocation } from 'react-router-dom'

interface NavItem {
  href: string
  icon: string
  label: string
}

export function BottomNav({ items }: { items: NavItem[] }) {
  const { pathname } = useLocation()

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-mobile bg-bg-primary border-t border-border z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around px-4">
        {items.map((item) => {
          const isActive = item.href === '/m' || item.href === '/owner'
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 min-h-[48px] py-3 active:opacity-70 transition-opacity ${isActive ? 'text-accent-orange' : 'text-text-muted'}`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[11px]">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export const ownerNavItems: NavItem[] = [
  { href: '/owner', icon: '📊', label: 'Dashboard' },
  { href: '/owner/members', icon: '👥', label: 'Members' },
  { href: '/owner/leads', icon: '📥', label: 'Leads' },
  { href: '/owner/posts', icon: '📝', label: 'Posts' },
  { href: '/owner/settings', icon: '⚙️', label: 'Settings' },
]

export const memberNavItems: NavItem[] = [
  { href: '/m', icon: '🏠', label: 'Home' },
  { href: '/m/diet', icon: '🍽️', label: 'Diet' },
  { href: '/m/workout', icon: '🏋️', label: 'Workout' },
  { href: '/m/feed', icon: '📣', label: 'Feed' },
  { href: '/m/profile', icon: '👤', label: 'Profile' },
]
```

**Step 6: Create LoadingSpinner.tsx** (new shared component)

```tsx
export function LoadingSpinner({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-accent-orange border-t-transparent rounded-full animate-spin" />
      <p className="text-text-secondary text-sm mt-3">{text}</p>
    </div>
  )
}
```

**Step 7: Verify client compiles**

```bash
cd client && npx tsc --noEmit
```

Expected: 0 errors

**Step 8: Commit**

```bash
git add client/src/components/
git commit -m "feat(client): port UI components (Button, Card, Input, Badge, BottomNav, LoadingSpinner)"
```

---

### Task 7: Set up Axios instance and API layer skeleton

**Files:**
- Create: `client/src/api/axios.ts`
- Create: `client/src/api/auth.ts`
- Create: `client/.env.example`

**Step 1: Create client/src/api/axios.ts**

```typescript
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
})

let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken(): string | null {
  return accessToken
}

// Attach access token to every request
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

// On 401, try to refresh the token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        const { data } = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          {},
          { withCredentials: true }
        )
        accessToken = data.accessToken
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return api(originalRequest)
      } catch {
        accessToken = null
        window.location.href = '/login'
        return Promise.reject(error)
      }
    }
    return Promise.reject(error)
  }
)

export default api
```

**Step 2: Create client/src/api/auth.ts** (skeleton — full implementation in M1)

```typescript
import api, { setAccessToken } from './axios'

export async function sendOtp(phone: string) {
  const { data } = await api.post('/auth/send-otp', { phone })
  return data
}

export async function verifyOtp(phone: string, otp: string) {
  const { data } = await api.post('/auth/verify-otp', { phone, otp })
  setAccessToken(data.accessToken)
  return data
}

export async function logout() {
  await api.post('/auth/logout')
  setAccessToken(null)
}

export async function refreshToken() {
  const { data } = await api.post('/auth/refresh')
  setAccessToken(data.accessToken)
  return data
}
```

**Step 3: Create client/.env.example**

```env
VITE_API_URL=http://localhost:5000/api
```

**Step 4: Verify client compiles**

```bash
cd client && npx tsc --noEmit
```

Expected: 0 errors

**Step 5: Commit**

```bash
git add client/src/api/ client/.env.example
git commit -m "feat(client): Axios instance with JWT interceptors + auth API skeleton"
```

---

### Task 8: Root package.json + .gitignore + final wiring

**Files:**
- Modify: `package.json` (root — replace Next.js scripts with concurrently)
- Modify: `.gitignore` (update for MERN)

**Step 1: Replace root package.json**

```json
{
  "name": "gymrep",
  "version": "2.0.0",
  "private": true,
  "scripts": {
    "dev": "concurrently -n server,client -c blue,green \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "cd server && npm run dev",
    "dev:client": "cd client && npm run dev",
    "build": "cd server && npm run build && cd ../client && npm run build",
    "install:all": "cd server && npm install && cd ../client && npm install"
  },
  "devDependencies": {
    "concurrently": "^9.1.0"
  }
}
```

**Step 2: Update .gitignore**

```
node_modules/
dist/
.env
.env.local
.DS_Store
*.log

# Server
server/node_modules/
server/dist/
server/.env

# Client
client/node_modules/
client/dist/
client/.env
```

**Step 3: Install root + all dependencies**

```bash
npm install && npm run install:all
```

**Step 4: Create server/.env** (local dev — not committed)

```bash
cat > server/.env << 'EOF'
PORT=5000
NODE_ENV=development
MONGODB_URI=<USER_MUST_SET_THIS>
JWT_SECRET=gymrep-dev-jwt-secret-change-in-prod
JWT_REFRESH_SECRET=gymrep-dev-refresh-secret-change-in-prod
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
CLIENT_URL=http://localhost:5173
TEST_PHONE=+919999999999
TEST_OTP=123456
EOF
```

User must replace `MONGODB_URI` with their Atlas connection string.

**Step 5: Verify both projects start**

```bash
# Terminal 1 (or use npm run dev for both):
cd server && npm run dev
# Expected: "MongoDB connected" + "Server running on http://localhost:5000"

# Terminal 2:
cd client && npm run dev
# Expected: Vite dev server at http://localhost:5173
```

**Step 6: Verify health endpoint**

```bash
curl http://localhost:5000/api/health
# Expected: {"status":"ok","timestamp":"..."}
```

**Step 7: Verify React renders**

Open http://localhost:5173 in browser.
Expected: "GymRep" heading with "Your Gym, Upgraded" subtitle on dark background.

**Step 8: Commit everything**

```bash
git add package.json .gitignore
git commit -m "feat: root monorepo setup with concurrently (M0 complete)"
```

---

## QA Gate (M0)

After all tasks are complete, verify:

1. `cd server && npx tsc --noEmit` → 0 errors
2. `cd client && npx tsc --noEmit` → 0 errors
3. `npm run dev` starts both server (port 5000) and client (port 5173)
4. `curl localhost:5000/api/health` returns `{"status":"ok",...}`
5. Browser at `localhost:5173` shows GymRep splash page with dark theme + orange accent

If all pass → M0 is complete. Save memory and proceed to M1 (Auth Flow).
