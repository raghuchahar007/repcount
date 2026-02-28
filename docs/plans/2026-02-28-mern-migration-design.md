# RepCount MERN Migration Design

**Date:** 2026-02-28
**Status:** Approved

## Overview

Migrate RepCount from Next.js 14 + Supabase to MERN stack (MongoDB + Express + React + Vite). In-place migration in same repo — remove existing Next.js code, replace with `client/` + `server/` structure.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Repo strategy | In-place migration | Cleaner, single repo, no parallel maintenance |
| OTP provider | Test-only bypass for now | Fastest to build. Pluggable interface for MSG91/Twilio later |
| Deployment | Deferred to M6 | Focus on building locally first |
| Database | MongoDB Atlas (free tier) | No vendor lock-in, simple CRUD patterns |
| Auth | JWT (access 15min + refresh 7d) | Standard, self-owned, no Supabase dependency |
| Frontend | React 18 + Vite + React Router v6 | Fast builds, SPA is sufficient (no SSR needed) |
| Styling | Tailwind CSS v4 (port existing theme) | Zero changes to design system |

## Architecture

### Backend (server/)
- Express 4 + TypeScript + Mongoose ODM
- JWT auth: access token (15min) + refresh token (7d, httpOnly cookie)
- Middleware stack: auth → roleGuard → gymAccess → validate → handler
- Global error handler, request validation (Zod)

### Frontend (client/)
- React 18 + Vite + React Router v6
- AuthContext: JWT in memory, auto-refresh on 401
- Axios interceptor: attach Bearer token, handle refresh
- Port existing UI components directly (Button, Card, Input, Badge, BottomNav)

### Data Models (8 Mongoose models)
- User, Gym, Member, Membership, Attendance, GymPost, Lead, Progress
- Badges embedded in Member document
- Compound indexes for unique constraints

## What Stays
- UI components (remove `'use client'`, otherwise identical)
- utils.ts, constants.ts, whatsapp.ts (pure functions)
- Dark theme, color scheme, Tailwind config
- Diet/workout templates (embedded data)
- All page layouts and UX flows

## What Changes
- Auth: Supabase OTP → JWT + custom OTP service
- DB: PostgreSQL → MongoDB
- API: Supabase client → Express REST + Axios
- Middleware: Next.js → React Router guards + Express middleware
- RLS: Supabase policies → Express middleware

## Migration Phases
- **M0:** Project setup, models, boilerplate
- **M1:** Auth flow (critical path)
- **M2:** Owner core (gym, members, payments, dashboard)
- **M3:** Member core (home, attendance, diet, workout, profile)
- **M4:** Engagement (feed, leaderboard, progress, referrals, badges)
- **M5:** Public features (gym page, leads, renewals)
- **M6:** Deploy + production hardening

## Risk Assessment
- No production data to migrate (fresh start)
- UI components are framework-agnostic (low risk port)
- Auth is the critical path — everything blocks on M1
