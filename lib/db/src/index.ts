import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// SUPABASE_POOLER_URL takes precedence: DATABASE_URL is a runtime-managed
// variable tied to Replit's built-in Postgres and cannot be reassigned to
// point at an external database. This project has migrated to Supabase, so
// SUPABASE_POOLER_URL (the Supabase Session Pooler connection string) is the
// live connection; DATABASE_URL remains only as a fallback for local/dev
// scenarios where Supabase isn't configured.
const connectionString = process.env.SUPABASE_POOLER_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "SUPABASE_POOLER_URL or DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });

export * from "./schema";
