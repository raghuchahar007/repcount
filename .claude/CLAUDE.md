# GymRep — Product Context

## Studio
This product lives in `~/studio/products/gymrep/`. The company brain is at `~/studio/`.

## Always Read Before Working
- `~/studio/state/gymrep/status.md` — what's done, current state
- `~/studio/state/gymrep/roadmap.md` — what's next
- `~/studio/state/gymrep/sprint.md` — current sprint tasks + acceptance criteria
- `~/studio/state/gymrep/decisions.md` — architectural constraints (9 ADRs)

## Always Update After Working
- `~/studio/state/gymrep/status.md` — mark what shipped
- `~/studio/state/gymrep/sprint.md` — tick completed tasks

## Stack
- Express 4 + Mongoose + React 18 + Vite + Tailwind CSS v4
- TypeScript (strict mode, 0 errors required)
- JWT: access token in memory, refresh token in httpOnly cookie

## Key Conventions
- All colors via `@theme` in `client/src/index.css` — never hardcode hex
- `useToast()` from ToastContext for all user feedback
- Skeleton loaders (SkeletonDashboard/SkeletonList/SkeletonCard) for loading states
- Pagination: `?page=1&limit=20` → `{ data, total, page, totalPages }`
- Phone: +91XXXXXXXXXX for OTP API, 10-digit in member records

## Test Accounts
- Owner: +919999999999 (OTP: 123456)
- Members: +919999999903 through +919999999907 (OTP: 123456)

## Deployment
- Vultr VPS Mumbai, Nginx + PM2
- `deploy/deploy.sh SERVER_IP` to deploy
- After schema changes: `npm run drop-indexes`
