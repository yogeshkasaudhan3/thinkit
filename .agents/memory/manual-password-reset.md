---
name: Manual admin password reset pattern
description: Design decisions behind the customer forgot-password flow (mobile-based, admin-verified, no OTP/SMS) — enumeration protection, temp-password exposure, dedupe.
---

Thinkit's forgot-password flow is fully manual (no OTP/SMS/email): customer requests by mobile number, admin verifies identity out-of-band and issues a temp password from the admin panel.

Key decisions worth staying consistent with:
- `/auth/forgot-password` always returns the exact same generic message/status regardless of whether the mobile is registered, malformed, or has an existing pending request. **Why:** prevents account enumeration. **How to apply:** any change to this endpoint must preserve identical responses across all input cases.
- The temp-password generation endpoint is the one deliberate exception to "never return password material" — it returns the plaintext temp password exactly once, at generation time, for the admin to relay by phone. It is never persisted in plaintext (only bcrypt hash) and never returned by any other endpoint (list/get always omit it).
- Login accepts either the permanent `passwordHash` or (if set) `temporaryPasswordHash`; a successful temp-password login does not by itself change the permanent password — the client is gated to a forced "create new password" screen via a `forcePasswordChange` boolean returned from `/auth/me`. **Why:** keeps the login endpoint's existing error codes/behavior untouched for the normal path.
- Rejecting a pending request clears `temporaryPasswordHash`/`forcePasswordChange` so an issued-but-unused temp password can't be logged in with afterward.
- Request creation is deduped: if a user already has a pending request, a new `forgot-password` call updates the timestamp on the existing row instead of inserting a duplicate, keeping the admin queue clean.
