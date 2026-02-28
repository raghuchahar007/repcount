import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import authRoutes from './routes/auth.routes'
import gymRoutes from './routes/gym.routes'
import memberRoutes from './routes/member.routes'
import membershipRoutes from './routes/membership.routes'
import dashboardRoutes from './routes/dashboard.routes'
import leadRoutes from './routes/lead.routes'
import postRoutes from './routes/post.routes'
import attendanceRoutes from './routes/attendance.routes'
import publicRoutes from './routes/public.routes'
import meRoutes from './routes/me.routes'
import { errorHandler } from './middleware/errorHandler'

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

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/gym', gymRoutes)
app.use('/api/gym/:gymId/members', memberRoutes)
app.use('/api/gym/:gymId/memberships', membershipRoutes)
app.use('/api/gym/:gymId/dashboard', dashboardRoutes)
app.use('/api/gym/:gymId/leads', leadRoutes)
app.use('/api/gym/:gymId/posts', postRoutes)
app.use('/api/gym/:gymId/attendance', attendanceRoutes)
app.use('/api/public', publicRoutes)
app.use('/api/me', meRoutes)

// Global error handler (must be last)
app.use(errorHandler)

export default app
