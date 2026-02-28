import { Router, Request, Response } from 'express'
import mongoose from 'mongoose'
import { Member } from '../models/Member'
import { Membership } from '../models/Membership'
import { Attendance } from '../models/Attendance'
import { Lead } from '../models/Lead'
import { requireAuth } from '../middleware/auth'
import { requireOwner } from '../middleware/roleGuard'
import { requireGymAccess } from '../middleware/gymAccess'

const router = Router({ mergeParams: true })

function todayIST(): Date {
  const now = new Date()
  const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000))
  ist.setUTCHours(0, 0, 0, 0)
  return ist
}

function firstOfMonthIST(): Date {
  const now = new Date()
  const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000))
  ist.setUTCDate(1)
  ist.setUTCHours(0, 0, 0, 0)
  return ist
}

// GET /api/gym/:gymId/dashboard — Aggregated dashboard stats
router.get(
  '/',
  requireAuth, requireOwner, requireGymAccess,
  async (req: Request, res: Response) => {
    try {
      const gymId = req.params.gymId
      const gymObjectId = req.gym!._id
      const today = todayIST()
      const sevenDays = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
      const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000)
      const monthStart = firstOfMonthIST()

      const [
        totalMembers,
        overdueCount,
        expiringCount,
        newLeadsCount,
        joinRequests,
        monthRevenueResult,
        todayAttendance,
        recentMembers,
        activeIds,
        recentCheckins,
      ] = await Promise.all([
        // Total active members
        Member.countDocuments({ gym: gymId, is_active: true }),

        // Overdue: active memberships with expiry < today
        Membership.countDocuments({ gym: gymId, status: 'active', expiry_date: { $lt: today } }),

        // Expiring: active memberships with expiry between today and +7 days
        Membership.countDocuments({
          gym: gymId,
          status: 'active',
          expiry_date: { $gte: today, $lte: sevenDays },
        }),

        // New leads
        Lead.countDocuments({ gym: gymId, status: 'new' }),

        // Join requests (app_request leads with status new)
        Lead.countDocuments({ gym: gymId, source: 'app_request', status: 'new' }),

        // Month revenue — use ObjectId for aggregation pipeline
        Membership.aggregate([
          {
            $match: {
              gym: gymObjectId,
              paid_at: { $gte: monthStart },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' },
            },
          },
        ]),

        // Today's attendance count
        Attendance.countDocuments({ gym: gymId, check_in_date: today }),

        // 5 newest active members
        Member.find({ gym: gymId, is_active: true })
          .sort({ created_at: -1 })
          .limit(5)
          .lean(),

        // All active member IDs (for inactive calc)
        Member.find({ gym: gymId, is_active: true }).distinct('_id'),

        // Recent checkins (last 2 weeks) — distinct member IDs
        Attendance.find({ gym: gymId, check_in_date: { $gte: twoWeeksAgo } }).distinct('member'),
      ])

      const monthRevenue = monthRevenueResult.length > 0 ? monthRevenueResult[0].total : 0

      // Compute inactive count: active members NOT in recent checkins
      const recentCheckinSet = new Set(recentCheckins.map((id: mongoose.Types.ObjectId) => id.toString()))
      const inactiveCount = activeIds.filter(
        (id: mongoose.Types.ObjectId) => !recentCheckinSet.has(id.toString()),
      ).length

      // Attach latest membership to recentMembers (batch fetch)
      const recentMemberIds = recentMembers.map((m) => m._id)
      const latestMemberships = await Membership.find({
        member: { $in: recentMemberIds },
        gym: gymId,
      })
        .sort({ expiry_date: -1 })
        .lean()

      // Group by member, keep first (latest expiry)
      const membershipMap = new Map<string, typeof latestMemberships[number]>()
      for (const ms of latestMemberships) {
        const key = ms.member.toString()
        if (!membershipMap.has(key)) {
          membershipMap.set(key, ms)
        }
      }

      const recentMembersWithMembership = recentMembers.map((m) => ({
        ...m,
        latest_membership: membershipMap.get(m._id.toString()) || null,
      }))

      res.json({
        totalMembers,
        overdueCount,
        expiringCount,
        newLeadsCount,
        joinRequests,
        monthRevenue,
        todayAttendance,
        inactiveCount,
        recentMembers: recentMembersWithMembership,
      })
    } catch (err: any) {
      console.error('dashboard error:', err)
      res.status(500).json({ error: 'Failed to load dashboard' })
    }
  },
)

export default router
