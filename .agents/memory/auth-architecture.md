---
name: Auth architecture
description: Google OAuth + session setup for Thinkit; key constraints and gotchas
---

## Key decisions

- Two artifacts: `artifacts/thinkit-app` (Vite, port 24545, path `/`) and `artifacts/api-server` (Express, port 8080, path `/api`). Path-routed by Replit proxy — no CORS issues.
- Sessions: `express-session` + `connect-pg-simple` (PostgreSQL-backed). Secret from `SESSION_SECRET`. 30-day cookie.
- Passport: `passport-google-oauth20`. Strategy only registered when both env vars present; `/auth/google` returns 503 JSON when strategy not configured.
- Callback URL: `https://${REPLIT_DEV_DOMAIN}/api/auth/google/callback`; overrideable via `GOOGLE_CALLBACK_URL`.

## drizzle-zod incompatibility

**Why:** Workspace catalog pins `zod: ^3.25.76` (v3). `drizzle-zod@^0.8.x` targets Zod v4. `createInsertSchema` produces types incompatible with v3's `ZodType<any,any,any>`.

**How to apply:** Do NOT use `drizzle-zod` in `lib/db/src/schema/`. Export only plain Drizzle `$inferSelect`/`$inferInsert` types.

## lib/db build requirement

`lib/db` has `"composite": true` in tsconfig. Declaration files in `dist/` must exist for api-server project references to resolve types.

**How to apply:** Run `npx tsc -p lib/db/tsconfig.json` before running api-server typecheck, or whenever schema files change.

## OAuth CSRF note

`passport-google-oauth20` does not accept `state: boolean`. CSRF protection via session is handled internally by the strategy. Do not add `state: true` to `passport.authenticate()` options.
