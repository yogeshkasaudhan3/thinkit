---
name: Supabase migration cutover
description: Networking and env-var constraints hit when migrating a Replit Postgres app to Supabase; relevant to any Replit->external-Postgres cutover.
---

- Supabase's **direct connection** host (`db.<project-ref>.supabase.co`) resolves only to an **IPv6** address. Replit workspaces have no IPv6 egress, so `pg_dump`/`pg_restore`/app connections to it fail with an opaque, empty `psql: error:` and no useful message. Diagnose by checking `getent hosts <host>` (IPv6-only result) and `/proc/net/if_inet6` (no interfaces) — confirms it's a network-family mismatch, not bad credentials.
  **Fix:** use Supabase's **Session Pooler** connection string instead (IPv4-compatible, `aws-*.pooler.supabase.com:5432`). Avoid the Transaction pooler (port 6543) for restores/session-store use — it doesn't support everything a session-mode client (e.g. `pg_restore`, `connect-pg-simple`) needs.

- `DATABASE_URL` (and `PGHOST`/`PGPORT`/`PGUSER`/`PGPASSWORD`/`PGDATABASE`) are **runtime-managed** by Replit's built-in Postgres provisioning and can't be reassigned to an external DB via `setEnvVars`/`requestSecrets`.
  **Fix:** store the external connection string under a distinct secret name (e.g. `SUPABASE_POOLER_URL`) and change the app's DB client init to prefer that over `DATABASE_URL` (`process.env.SUPABASE_POOLER_URL || process.env.DATABASE_URL`), rather than trying to overwrite the managed key.

- Before a Postgres migration, always run pg_dump/restore verification beyond row counts: compare sequence `last_value`s (auto-increment can silently drift) and an order-preserving `md5(string_agg(...))` checksum per table's key columns. Both are cheap and catch subtler restore bugs that row counts alone would miss.
