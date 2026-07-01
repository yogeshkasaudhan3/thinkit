---
name: Admin panel architecture
description: How the Thinkit Admin Panel is structured — artifact, backend routes, auth, SSE, DB tables
---

## Artifact
- Artifact dir: `artifacts/admin-panel/` — React+Vite, previewed at `/admin-panel/`
- Separate from customer app at `artifacts/thinkit-app/` (at `/`)

## Backend routes (api-server)
- All under `artifacts/api-server/src/routes/admin/`
- Mounted in `routes/index.ts` as `adminRouter`
- Auth: `requireAdmin` middleware checks `req.session.adminId`
- Credentials: `ADMIN_USERNAME` + `ADMIN_PASSWORD_HASH` (bcrypt, cost 12) env vars; verified with `bcrypt.compare` in `auth.ts`. No hardcoded passwords.

## Session
- `express.d.ts` extends SessionData with both `userId?: number` and `adminId?: string`

## New order alarm (SSE)
- `GET /api/admin/orders/stream` — text/event-stream, sends `event: newOrder`
- Shared event emitter in `src/lib/orderEvents.ts` (setMaxListeners 200)
- Frontend: `new EventSource('/api/admin/orders/stream')` in `order-alarm.tsx`
- Web Audio API oscillator for alarm sound; stops ONLY on Accept Order button

## DB tables
- `products`, `orders`, `banners` — created via executeSql (drizzle-kit push fails without TTY in non-interactive shell)
- Schema files in `lib/db/src/schema/`

## Route ordering (critical)
- `/admin/products/bulk` before `/:id` — avoids "bulk" being parsed as a param
- `/admin/orders/stream` (SSE) before `/:id` — same reason

**Why:** Express matches routes in registration order; named segments must come before param segments.
