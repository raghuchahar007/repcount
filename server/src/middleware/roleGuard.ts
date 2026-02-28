import { Request, Response, NextFunction } from 'express'

export function requireOwner(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Owner access required' })
  }
  next()
}

export function requireMember(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'member') {
    return res.status(403).json({ error: 'Member access required' })
  }
  next()
}
