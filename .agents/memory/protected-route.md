---
name: ProtectedRoute pattern
description: Route guard pattern for thinkit-app; loading state handling to prevent flash-redirect
---

## Rule

Both `ProtectedRoute` and `SetupRoute` in `App.tsx` must return `null` while `authStatus === 'loading'`.

**Why:** Session check is async on mount. Without the loading guard, authenticated users see a flash redirect to `/signin` before `/api/auth/me` resolves.

## SetupRoute specifics

`/setup` route uses `SetupRoute` (not plain `ProfileSetupPage`):
- `loading` → null
- `unauthenticated` → redirect `/signin`
- `authenticated && profileComplete` → redirect `/home`
- `authenticated && !profileComplete` → render `ProfileSetupPage`

## How to apply

Any new protected page in `App.tsx` must use `ProtectedRoute` (or a similarly guarded wrapper), never a naked page component.
