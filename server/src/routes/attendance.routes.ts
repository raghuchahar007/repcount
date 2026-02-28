import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { Attendance } from '../models/Attendance'
import { Member } from '../models/Member'
import { requireAuth } from '../middleware/auth'
import { requireOwner } from '../middleware/roleGuard'
import { requireGymAccess } from '../middleware/gymAccess'
import { validate } from '../middleware/validate'

const router = Router({ mergeParams: true })

/** Return today's date string in IST (YYYY-MM-DD) */
function todayIST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

/** Convert a YYYY-MM-DD string to a UTC Date at midnight */
function dateFromString(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

const checkInSchema = z.object({
  member_id: z.string().min(1, 'member_id is required'),
})

// ─── POST /api/gym/:gymId/attendance — mark check-in ───────────────────────
router.post(
  '/',
  requireAuth, requireOwner, requireGymAccess, validate(checkInSchema),
  async (req: Request, res: Response) => {
    try {
      const { gymId } = req.params
      const { member_id } = req.body

      const today = todayIST()
      const checkInDate = dateFromString(today)

      const attendance = await Attendance.create({
        member: member_id,
        gym: gymId,
        check_in_date: checkInDate,
        checked_in_at: new Date(),
      })

      // Evaluate badges async — don't block the response
      evaluateBadges(member_id, gymId as string).catch((err) =>
        console.error('evaluateBadges error:', err),
      )

      res.status(201).json(attendance)
    } catch (err: any) {
      if (err.code === 11000) {
        return res.status(409).json({ error: 'Member already checked in today' })
      }
      console.error('check-in error:', err)
      res.status(500).json({ error: 'Failed to record check-in' })
    }
  },
)

// ─── GET /api/gym/:gymId/attendance — list check-ins for a date ────────────
router.get(
  '/',
  requireAuth, requireOwner, requireGymAccess,
  async (req: Request, res: Response) => {
    try {
      const { gymId } = req.params
      const dateStr = (req.query.date as string) || todayIST()
      const checkInDate = dateFromString(dateStr)

      const records = await Attendance.find({ gym: gymId, check_in_date: checkInDate })
        .populate('member', 'name phone')
        .sort({ checked_in_at: -1 })
        .lean()

      res.json(records)
    } catch (err: any) {
      console.error('list attendance error:', err)
      res.status(500).json({ error: 'Failed to fetch attendance' })
    }
  },
)

// ─── Badge evaluation ──────────────────────────────────────────────────────
async function evaluateBadges(memberId: string, gymId: string): Promise<void> {
  const member = await Member.findOne({ _id: memberId, gym: gymId })
  if (!member) return

  const existingTypes = new Set(member.badges.map((b) => b.badge_type))

  // Fetch all attendance records for this member at this gym, sorted ascending
  const records = await Attendance.find({ member: memberId, gym: gymId })
    .sort({ check_in_date: 1 })
    .lean()

  const totalCheckIns = records.length
  const newBadges: { badge_type: string; earned_at: Date }[] = []

  // ── first_week: 7 total check-ins ──
  if (!existingTypes.has('first_week') && totalCheckIns >= 7) {
    newBadges.push({ badge_type: 'first_week', earned_at: new Date() })
  }

  // Build sorted date strings for streak calculations
  const dateStrings = records.map((r) =>
    r.check_in_date.toISOString().slice(0, 10),
  )
  const uniqueDates = [...new Set(dateStrings)].sort()

  // ── Calculate longest streak ending at or including today ──
  const currentStreak = calcCurrentStreak(uniqueDates)

  // ── 30_day_streak: 30 consecutive days ──
  if (!existingTypes.has('30_day_streak') && currentStreak >= 30) {
    newBadges.push({ badge_type: '30_day_streak', earned_at: new Date() })
  }

  // ── 100_day_club: 100 consecutive days ──
  if (!existingTypes.has('100_day_club') && currentStreak >= 100) {
    newBadges.push({ badge_type: '100_day_club', earned_at: new Date() })
  }

  // ── never_missed_monday: 4 consecutive Mondays ──
  if (!existingTypes.has('never_missed_monday')) {
    const has4Mondays = checkConsecutiveMondays(uniqueDates)
    if (has4Mondays) {
      newBadges.push({ badge_type: 'never_missed_monday', earned_at: new Date() })
    }
  }

  if (newBadges.length > 0) {
    await Member.updateOne(
      { _id: memberId },
      { $push: { badges: { $each: newBadges } } },
    )
  }
}

/** Calculate the current consecutive-day streak ending at the most recent check-in */
function calcCurrentStreak(sortedDates: string[]): number {
  if (sortedDates.length === 0) return 0

  let streak = 1
  for (let i = sortedDates.length - 1; i > 0; i--) {
    const curr = new Date(sortedDates[i])
    const prev = new Date(sortedDates[i - 1])
    const diffMs = curr.getTime() - prev.getTime()
    const diffDays = diffMs / (24 * 60 * 60 * 1000)
    if (diffDays === 1) {
      streak++
    } else {
      break
    }
  }
  return streak
}

/** Check if the last 4 Mondays all have attendance check-ins */
function checkConsecutiveMondays(sortedDates: string[]): boolean {
  const dateSet = new Set(sortedDates)

  // Find the last 4 Mondays from today (IST)
  const todayStr = todayIST()
  const today = new Date(todayStr + 'T00:00:00Z')

  const mondays: string[] = []
  const d = new Date(today)

  // Walk backwards to find the most recent Monday (including today if Monday)
  while (d.getUTCDay() !== 1) {
    d.setUTCDate(d.getUTCDate() - 1)
  }

  // Collect 4 Mondays going backwards
  for (let i = 0; i < 4; i++) {
    mondays.push(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() - 7)
  }

  return mondays.every((m) => dateSet.has(m))
}

export default router
