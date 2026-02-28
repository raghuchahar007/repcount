# QR Attendance + UI Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add two-way QR check-in (owner scans member, member scans gym) and fix broken UI elements.

**Architecture:** Member shows a static QR (their member `_id`). Owner has a camera scanner page that reads it and calls the existing attendance endpoint. Gym has a static QR (`repcount:checkin:<gymId>`). Member scans it via camera on home page, which calls a new `POST /api/me/check-in` endpoint. Both use `html5-qrcode` for scanning and `qrcode.react` for display.

**Tech Stack:** html5-qrcode (scanner), qrcode.react (display), Express, React

---

### Task 1: Install QR Libraries

**Files:**
- Modify: `client/package.json`

**Step 1: Install dependencies**

Run: `cd client && npm install qrcode.react html5-qrcode`

**Step 2: Verify install**

Run: `ls node_modules/qrcode.react node_modules/html5-qrcode`
Expected: both directories exist

**Step 3: Commit**

```bash
git add client/package.json client/package-lock.json
git commit -m "chore: install qrcode.react and html5-qrcode"
```

---

### Task 2: Fix Dashboard Dead Import Link

**Files:**
- Modify: `client/src/pages/owner/Dashboard.tsx:185-188`

**Step 1: Replace dead Import link with QR Scan link**

Change lines 185-188 from:
```tsx
<Link to="/owner/members/import" className="bg-bg-card border border-border rounded-xl p-3 text-center">
  <span className="text-xl">📷</span>
  <p className="text-[10px] text-text-secondary mt-1">Import</p>
</Link>
```

To:
```tsx
<Link to="/owner/scan" className="bg-bg-card border border-border rounded-xl p-3 text-center">
  <span className="text-xl">📷</span>
  <p className="text-[10px] text-text-secondary mt-1">Scan QR</p>
</Link>
```

**Step 2: Verify**

Run: `cd client && npx tsc --noEmit`
Expected: 0 errors

**Step 3: Commit**

```bash
git add client/src/pages/owner/Dashboard.tsx
git commit -m "fix: replace dead Import link with Scan QR link on dashboard"
```

---

### Task 3: Server — Member Self Check-In Endpoint

**Files:**
- Modify: `server/src/routes/me.routes.ts`

**Step 1: Add self check-in endpoint**

Add before the `router.use(requireAuth, requireMember, requireMemberContext)` line (alongside the other auth-only routes like `/gyms` and `/join-gym`):

```typescript
const selfCheckInSchema = z.object({
  gymId: z.string().min(1, 'Gym ID required'),
})

// POST /check-in - member self check-in via gym QR
router.post('/check-in', requireAuth, validate(selfCheckInSchema), async (req: Request, res: Response) => {
  try {
    const { gymId } = req.body
    const member = await Member.findOne({ user: req.user!.userId, gym: gymId })
    if (!member) {
      return res.status(404).json({ error: 'You are not a member of this gym' })
    }

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
    const [y, m, d] = today.split('-').map(Number)
    const checkInDate = new Date(Date.UTC(y, m - 1, d))

    const attendance = await Attendance.create({
      member: member._id,
      gym: gymId,
      check_in_date: checkInDate,
      checked_in_at: new Date(),
    })

    res.status(201).json({ message: 'Checked in!', attendance })
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Already checked in today' })
    }
    console.error('Self check-in error:', err)
    res.status(500).json({ error: 'Failed to check in' })
  }
})
```

Also add `Attendance` to the imports at top if not already there (it is already imported).

**Step 2: Add `selfCheckIn` to client API**

Add to `client/src/api/me.ts`:
```typescript
export async function selfCheckIn(gymId: string) {
  const { data } = await api.post('/me/check-in', { gymId })
  return data
}
```

**Step 3: Verify**

Run: `cd server && npx tsc --noEmit && cd ../client && npx tsc --noEmit`
Expected: 0 errors both

**Step 4: Commit**

```bash
git add server/src/routes/me.routes.ts client/src/api/me.ts
git commit -m "feat(server): member self check-in endpoint"
```

---

### Task 4: QR Scanner Component (Shared)

**Files:**
- Create: `client/src/components/shared/QrScanner.tsx`

**Step 1: Create reusable scanner component**

This wraps `html5-qrcode` in a React component. Used by both owner scanner and member check-in.

```tsx
import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

interface QrScannerProps {
  onScan: (data: string) => void
  onError?: (error: string) => void
}

export function QrScanner({ onScan, onError }: QrScannerProps) {
  const [started, setStarted] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const scannerId = 'qr-reader-' + Math.random().toString(36).slice(2, 8)

    if (!containerRef.current) return

    // Create a div for html5-qrcode to mount into
    const el = document.createElement('div')
    el.id = scannerId
    containerRef.current.appendChild(el)

    const scanner = new Html5Qrcode(scannerId)
    scannerRef.current = scanner

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          onScan(decodedText)
          scanner.stop().catch(() => {})
        },
        () => {}
      )
      .then(() => setStarted(true))
      .catch((err) => {
        onError?.(err?.message || 'Camera access denied')
      })

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [])

  return (
    <div>
      <div ref={containerRef} className="rounded-2xl overflow-hidden" />
      {!started && (
        <p className="text-text-muted text-sm text-center mt-2">Starting camera...</p>
      )}
    </div>
  )
}
```

**Step 2: Verify**

Run: `cd client && npx tsc --noEmit`
Expected: 0 errors

**Step 3: Commit**

```bash
git add client/src/components/shared/QrScanner.tsx
git commit -m "feat(client): reusable QR scanner component"
```

---

### Task 5: Owner Scanner Page

**Files:**
- Create: `client/src/pages/owner/ScanCheckin.tsx`
- Modify: `client/src/App.tsx` (add route)
- Modify: `client/src/components/layout/BottomNav.tsx` (add Scan to owner nav)

**Step 1: Create owner scan page**

```tsx
import { useState } from 'react'
import { QrScanner } from '@/components/shared/QrScanner'
import { checkInMember } from '@/api/members'
import { getMyGym } from '@/api/gym'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useEffect } from 'react'

export default function ScanCheckinPage() {
  const [gymId, setGymId] = useState('')
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<{ text: string; type: 'success' | 'warning' | 'error' } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getMyGym().then(gym => setGymId(gym._id)).catch(() => {})
  }, [])

  async function handleScan(memberId: string) {
    if (!gymId || loading) return
    setLoading(true)
    setScanning(false)
    try {
      await checkInMember(gymId, memberId)
      setResult({ text: 'Checked in!', type: 'success' })
    } catch (err: any) {
      if (err.response?.status === 409) {
        setResult({ text: 'Already checked in today', type: 'warning' })
      } else {
        setResult({ text: err.response?.data?.error || 'Check-in failed', type: 'error' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="text-center pt-2">
        <h1 className="text-2xl font-bold text-text-primary">Scan Check-In</h1>
        <p className="text-text-secondary text-sm mt-1">Scan member's QR to mark attendance</p>
      </div>

      {result && (
        <Card variant={result.type === 'success' ? 'alert-success' : result.type === 'warning' ? 'alert-warning' : 'alert-danger'}>
          <p className="text-sm text-center font-semibold">{result.text}</p>
        </Card>
      )}

      {scanning ? (
        <Card>
          <QrScanner
            onScan={handleScan}
            onError={(err) => setResult({ text: err, type: 'error' })}
          />
        </Card>
      ) : (
        <div className="text-center pt-8">
          <Button onClick={() => { setScanning(true); setResult(null) }} disabled={!gymId}>
            Open Scanner
          </Button>
          {result && (
            <Button variant="secondary" onClick={() => { setScanning(true); setResult(null) }} className="mt-3 ml-3">
              Scan Another
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Add route in App.tsx**

Add import at top:
```tsx
import ScanCheckinPage from '@/pages/owner/ScanCheckin'
```

Add route inside the `/owner` route group:
```tsx
<Route path="scan" element={<ScanCheckinPage />} />
```

**Step 3: Replace a nav item or add scan**

In `client/src/components/layout/BottomNav.tsx`, update `ownerNavItems` — replace the Leads tab with Scan (Leads can be accessed from Dashboard):

```typescript
export const ownerNavItems: NavItem[] = [
  { href: '/owner', icon: '📊', label: 'Dashboard' },
  { href: '/owner/members', icon: '👥', label: 'Members' },
  { href: '/owner/scan', icon: '📷', label: 'Scan' },
  { href: '/owner/posts', icon: '📝', label: 'Posts' },
  { href: '/owner/settings', icon: '⚙️', label: 'Settings' },
]
```

**Step 4: Verify**

Run: `cd client && npx tsc --noEmit`
Expected: 0 errors

**Step 5: Commit**

```bash
git add client/src/pages/owner/ScanCheckin.tsx client/src/App.tsx client/src/components/layout/BottomNav.tsx
git commit -m "feat(client): owner QR scanner page for member check-in"
```

---

### Task 6: Member QR Display

**Files:**
- Create: `client/src/pages/member/MyQR.tsx`
- Modify: `client/src/pages/member/Home.tsx` (add "Show QR" button)
- Modify: `client/src/App.tsx` (add route)

**Step 1: Create MyQR page**

This shows a full-screen QR code with the member's `_id`.

```tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { getProfile } from '@/api/me'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

export default function MyQRPage() {
  const [memberId, setMemberId] = useState('')
  const [memberName, setMemberName] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    getProfile()
      .then((data) => {
        setMemberId(data.member._id)
        setMemberName(data.member.name)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner text="Loading QR..." />

  return (
    <div className="p-4 space-y-4">
      <button
        onClick={() => navigate(-1)}
        className="text-text-secondary text-sm hover:text-text-primary"
      >
        ← Back
      </button>

      <div className="text-center pt-4">
        <h1 className="text-2xl font-bold text-text-primary">Your QR Code</h1>
        <p className="text-text-secondary text-sm mt-1">Show this to the gym to check in</p>
      </div>

      <Card>
        <div className="flex flex-col items-center py-6">
          <div className="bg-white p-4 rounded-2xl">
            <QRCodeSVG
              value={memberId}
              size={220}
              level="M"
            />
          </div>
          <p className="text-text-primary font-bold text-lg mt-4">{memberName}</p>
          <p className="text-text-muted text-xs mt-1">Member ID: {memberId.slice(-6)}</p>
        </div>
      </Card>
    </div>
  )
}
```

**Step 2: Add "My QR" button to Home.tsx**

In `client/src/pages/member/Home.tsx`, add a QR card after the greeting card (around line 111). Add `import { Link } from 'react-router-dom'` (already imported).

After the greeting `</Card>` and before the Streak card, add:

```tsx
{/* QR Check-in */}
<Link to="/m/qr">
  <Card>
    <div className="flex items-center gap-3">
      <span className="text-3xl">📱</span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-text-primary">Show My QR</p>
        <p className="text-text-secondary text-xs">For quick check-in at the gym</p>
      </div>
      <span className="text-text-muted text-lg">→</span>
    </div>
  </Card>
</Link>
```

**Step 3: Add route in App.tsx**

Add import:
```tsx
import MyQRPage from '@/pages/member/MyQR'
```

Add route inside the `/m` route group:
```tsx
<Route path="qr" element={<MyQRPage />} />
```

**Step 4: Verify**

Run: `cd client && npx tsc --noEmit`
Expected: 0 errors

**Step 5: Commit**

```bash
git add client/src/pages/member/MyQR.tsx client/src/pages/member/Home.tsx client/src/App.tsx
git commit -m "feat(client): member QR code display page"
```

---

### Task 7: Member Self Check-In via Gym QR

**Files:**
- Modify: `client/src/pages/member/Home.tsx` (add "Scan to Check In" button)

**Step 1: Add scan check-in to Home.tsx**

Add imports at top:
```tsx
import { QrScanner } from '@/components/shared/QrScanner'
import { selfCheckIn } from '@/api/me'
```

Add state inside `MemberHome()`:
```tsx
const [showScanner, setShowScanner] = useState(false)
const [scanResult, setScanResult] = useState<{ text: string; type: 'success' | 'warning' | 'error' } | null>(null)
const [scanLoading, setScanLoading] = useState(false)
```

Add handler:
```tsx
async function handleGymQrScan(qrData: string) {
  // Expected format: repcount:checkin:<gymId> or just a raw gymId
  const gymId = qrData.startsWith('repcount:checkin:')
    ? qrData.replace('repcount:checkin:', '')
    : qrData
  if (!gymId || scanLoading) return
  setScanLoading(true)
  setShowScanner(false)
  try {
    await selfCheckIn(gymId)
    setScanResult({ text: 'Checked in!', type: 'success' })
  } catch (err: any) {
    if (err.response?.status === 409) {
      setScanResult({ text: 'Already checked in today', type: 'warning' })
    } else {
      setScanResult({ text: err.response?.data?.error || 'Check-in failed', type: 'error' })
    }
  } finally {
    setScanLoading(false)
  }
}
```

After the "Show My QR" card (added in Task 6), add:

```tsx
{/* Scan Gym QR to Check In */}
{!checkedInToday && (
  showScanner ? (
    <Card>
      <h3 className="text-sm font-semibold text-text-primary mb-3">Scan Gym QR</h3>
      <QrScanner
        onScan={handleGymQrScan}
        onError={(err) => setScanResult({ text: err, type: 'error' })}
      />
      <button
        onClick={() => setShowScanner(false)}
        className="w-full text-center text-text-muted text-sm mt-3 py-2"
      >
        Cancel
      </button>
    </Card>
  ) : (
    <button onClick={() => { setShowScanner(true); setScanResult(null) }} className="w-full">
      <Card>
        <div className="flex items-center gap-3">
          <span className="text-3xl">📷</span>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-text-primary">Scan to Check In</p>
            <p className="text-text-secondary text-xs">Scan gym QR at the gate</p>
          </div>
          <span className="text-text-muted text-lg">→</span>
        </div>
      </Card>
    </button>
  )
)}

{scanResult && (
  <Card>
    <p className={`text-sm text-center font-semibold ${
      scanResult.type === 'success' ? 'text-status-green' :
      scanResult.type === 'warning' ? 'text-status-yellow' :
      'text-status-red'
    }`}>{scanResult.text}</p>
  </Card>
)}
```

**Step 2: Verify**

Run: `cd client && npx tsc --noEmit`
Expected: 0 errors

**Step 3: Commit**

```bash
git add client/src/pages/member/Home.tsx
git commit -m "feat(client): member self check-in via gym QR scanner"
```

---

### Task 8: Owner Gym QR Display (in Settings)

**Files:**
- Modify: `client/src/pages/owner/Settings.tsx`

**Step 1: Add gym QR section to Settings page**

Add import at top:
```tsx
import { QRCodeSVG } from 'qrcode.react'
```

After the form in Settings.tsx, at the bottom of the page (before the closing `</div>`), add a printable gym QR section:

```tsx
{/* Gym QR Code for Check-In */}
{gymId && (
  <Card>
    <h3 className="text-sm font-semibold text-text-primary mb-3">Gym Check-In QR</h3>
    <p className="text-text-secondary text-xs mb-4">
      Print this and place at your gym entrance. Members scan it to check in.
    </p>
    <div className="flex flex-col items-center py-4">
      <div className="bg-white p-4 rounded-2xl">
        <QRCodeSVG
          value={`repcount:checkin:${gymId}`}
          size={200}
          level="M"
        />
      </div>
      <p className="text-text-primary font-semibold mt-3">{form.name || 'Your Gym'}</p>
      <p className="text-text-muted text-xs mt-1">Scan to check in</p>
    </div>
  </Card>
)}
```

**Step 2: Verify**

Run: `cd client && npx tsc --noEmit`
Expected: 0 errors

**Step 3: Commit**

```bash
git add client/src/pages/owner/Settings.tsx
git commit -m "feat(client): gym QR code display in owner settings"
```

---

### Task 9: Integration Test

**Steps:**

1. Run: `cd server && npx tsc --noEmit` — expected: 0 errors
2. Run: `cd client && npx tsc --noEmit` — expected: 0 errors
3. Start dev servers: `npm run dev` from root
4. Test via curl:
   - Member self check-in:
     ```bash
     # Login as member
     RESP=$(curl -s http://localhost:5001/api/auth/verify-otp -H 'Content-Type: application/json' -d '{"phone":"+919999999903","otp":"123456"}')
     TOKEN=$(echo $RESP | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

     # Get gym ID
     GYMS=$(curl -s http://localhost:5001/api/me/gyms -H "Authorization: Bearer $TOKEN")
     GYM_ID=$(echo $GYMS | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['gym']['_id'])")

     # Self check-in
     curl -s http://localhost:5001/api/me/check-in -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d "{\"gymId\":\"$GYM_ID\"}"
     ```
   - Expected: `{"message":"Checked in!","attendance":{...}}` or `{"error":"Already checked in today"}`
5. Test in browser:
   - Owner: Login → Dashboard → tap "Scan QR" → camera opens
   - Member: Login → "Show My QR" → QR displayed
   - Member: Login → "Scan to Check In" → camera opens
   - Owner: Settings → scroll down → Gym QR displayed
6. Fix any issues found

**Commit:**

```bash
git commit -m "fix: QR attendance integration fixes"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Install QR libraries | package.json |
| 2 | Fix Dashboard dead Import link | Dashboard.tsx |
| 3 | Server: member self check-in endpoint | me.routes.ts, me.ts |
| 4 | Shared QR scanner component | QrScanner.tsx |
| 5 | Owner scanner page | ScanCheckin.tsx, App.tsx, BottomNav.tsx |
| 6 | Member QR display | MyQR.tsx, Home.tsx, App.tsx |
| 7 | Member self check-in via gym QR | Home.tsx |
| 8 | Gym QR display in Settings | Settings.tsx |
| 9 | Integration test | both |
