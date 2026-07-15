---
name: Hostinger same-origin deployment (Thinkit)
description: Backend + admin panel + customer app all serving from one Express origin for Hostinger deploy; Express 5 wildcard gotcha.
---

Both `admin-panel` and `thinkit-app` call the API via hardcoded relative
`/api/...` fetch paths (no configurable base URL). On a single-origin host
like Hostinger (no artifact router splitting traffic by path prefix), all
three pieces — API, admin panel, customer app — must be served by the same
Express process: `/api/*` → API routes, `/admin-panel/*` → admin panel static
+ SPA fallback, `/*` (catch-all, mounted last) → customer app static + SPA
fallback.

**Why:** without this, both frontends' relative fetches would 404 against
whatever origin actually hosts them.

**How to apply:** `artifacts/api-server/src/app.ts` conditionally serves
`admin-panel-dist/` and `thinkit-app-dist/` directories if found next to its
own compiled entry file — no-op on Replit dev (those dirs never exist there).
`artifacts/api-server/scripts/build-hostinger.mjs` builds both frontends with
the right `PORT`/`BASE_PATH` env vars and copies their `dist/public` output
into place, then writes a minimal `package.json` (only `sharp`, the one
esbuild-externalized native dep) for the upload package.

**Express 5 gotcha:** `app.get("/admin-panel/*", ...)` throws
`PathError: Missing parameter name` at startup — path-to-regexp v6+ (used by
Express 5) requires a *named* wildcard: `app.get("/admin-panel/*splat", ...)`.

**Also added:** an explicit `app.use("/api", (_req,res) => res.status(404)...)`
JSON 404 handler right after the API router. Without it, an unmatched
`/api/*` path would silently fall through to the SPA catch-all and get
served HTML instead of a real 404.

Verified by building the real Hostinger package, installing `sharp` fresh,
and running it standalone against the actual Supabase DB: `/`, `/admin-panel/`,
`/api/healthz`, SPA fallback routes, and admin login all returned correct
responses; unmatched `/api/*` returned JSON 404 as expected.
