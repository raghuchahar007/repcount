import { Request, Response, NextFunction } from 'express'
import { Gym, IGym } from '../models/Gym'
import { Document, Types } from 'mongoose'

declare global {
  namespace Express {
    interface Request {
      gym?: Document<unknown, {}, IGym> & IGym & { _id: Types.ObjectId }
    }
  }
}

export async function requireGymAccess(req: Request, res: Response, next: NextFunction) {
  try {
    const gymId = req.params.gymId
    if (!gymId) {
      return res.status(400).json({ error: 'Gym ID required' })
    }
    const gym = await Gym.findById(gymId)
    if (!gym) {
      return res.status(404).json({ error: 'Gym not found' })
    }
    if (gym.owner.toString() !== req.user!.userId) {
      return res.status(403).json({ error: 'Not your gym' })
    }
    req.gym = gym
    next()
  } catch {
    return res.status(500).json({ error: 'Failed to verify gym access' })
  }
}
