# Member Experience Improvements — Design Doc

**Goal:** Fix the broken no-gym experience and add lightweight features that make the app feel complete for both members and owners.

**Scope:** 6 features, all kept simple — no over-engineering.

---

## 1. Gym Discovery + Join Request

### Member Side
- New member (no gym) sees a **Discover Gyms** page instead of errors
- Lists all gyms: name, city, facilities, pricing summary
- Search/filter by name or city
- Tap gym → public gym page → "Request to Join" button
- After requesting → pending state. Home shows "Waiting for approval"

### Owner Side
- Dashboard alert card: "X join requests"
- List: name, phone, date requested
- Approve → creates Member record, member unlocked
- Reject → member sees "not approved", can try another gym

### Data
- Reuse `Lead` model with new source `app_request`
- Approved → auto-create Member, mark Lead as `converted`
- Rejected → mark Lead as `lost`

---

## 2. Owner Invite + Member Referral Links

### Owner Invite
- Settings/Members page: "Invite Member" button
- Generates link: `/gym/{slug}?ref=owner`
- Share via WhatsApp (pre-filled message template)
- Opens public gym page → join request with source `owner_invite`

### Member Referral
- Profile page: "Refer a Friend" card
- Link: `/gym/{slug}?ref={memberId}`
- Share via WhatsApp/native share
- Join request created with source `referral`, `referrer` = member
- Owner sees referrer in leads list
- Referral badge earned after first successful referral conversion

---

## 3. Badge Auto-Awarding

Run server-side after each check-in via `checkAndAwardBadges(memberId)`.

| Badge | Trigger |
|-------|---------|
| `first_checkin` | First attendance record |
| `week_warrior` | 7-day consecutive streak |
| `month_master` | 30-day consecutive streak |
| `century` | 100 total check-ins |
| `referrer` | First referral converts to member |
| `early_bird` | 5 check-ins before 7 AM |

No background jobs. Simple DB queries after attendance is recorded.

---

## 4. Workout/Diet Completion Tracking

- Diet page: each meal card gets a "Done" checkbox
- Workout page: each day gets a "Mark Complete" button
- New `DailyLog` model: `{ member, gym, date, type: 'workout'|'diet', completed: boolean }`
- One record per type per day, toggle on/off
- Shows completion info on Home (e.g., "3-day diet streak")

---

## 5. Daily Motivation Quote

- Array of 50-100 fitness quotes in `constants.ts`
- Picked by `dayOfYear % quotes.length` (same all day, changes daily)
- Small card on member Home page
- Purely client-side, no API calls

---

## 6. No-Gym Graceful States

- All member pages handle `NO_GYM` error gracefully
- Shared `<NoGymCard />` component: "Join a gym to unlock this feature" + button to Discover Gyms
- Applied to: Profile, Diet, Workout, Feed, Leaderboard

---

## Architecture Notes

- Join requests reuse the Lead model (no new collection)
- Badge logic is a pure function called after check-in, no cron/queue
- DailyLog is a new lightweight model (one doc per member per day per type)
- Motivation quotes are client-only constants
- All features are independent and can be built/shipped incrementally
