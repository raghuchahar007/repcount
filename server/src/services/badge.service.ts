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
      const recent = await Attendance.find({ member: memberId, gym: gymId })
        .sort({ check_in_date: -1 })
        .limit(7)
        .lean()
      if (recent.length < 7) return false
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
