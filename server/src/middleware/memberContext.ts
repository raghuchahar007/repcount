import { Request, Response, NextFunction } from 'express'
import { Member, IMember } from '../models/Member'
import { Document, Types } from 'mongoose'

declare global {
  namespace Express {
    interface Request {
      member?: Document<unknown, {}, IMember> & IMember & { _id: Types.ObjectId }
    }
  }
}

export async function requireMemberContext(req: Request, res: Response, next: NextFunction) {
  try {
    const gymId = req.query.gymId as string || req.headers['x-gym-id'] as string

    let member
    if (gymId) {
      member = await Member.findOne({ user: req.user!.userId, gym: gymId })
    } else {
      member = await Member.findOne({ user: req.user!.userId }).sort({ join_date: -1 })
    }

    if (!member) {
      return res.status(404).json({ error: 'Member profile not found', code: 'NO_GYM' })
    }
    req.member = member
    next()
  } catch {
    return res.status(500).json({ error: 'Failed to load member profile' })
  }
}
