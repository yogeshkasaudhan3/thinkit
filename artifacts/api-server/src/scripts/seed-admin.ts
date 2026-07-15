/**
 * Seed script: ensures a default admin user exists in the database.
 * Idempotent — uses onConflictDoNothing so concurrent startups are safe.
 * Called at server startup (awaited before app.listen).
 *
 * Credentials come from ADMIN_USERNAME / ADMIN_PASSWORD env vars so the
 * seeded account is never a hardcoded, publicly-known secret in production.
 * In non-production environments (local dev), insecure defaults are used
 * as a convenience if those vars aren't set, with a loud warning.
 */
import bcrypt from "bcryptjs";
import { db, adminUsersTable } from "@workspace/db";

const DEFAULT_USERNAME = "admin";
const DEFAULT_PASSWORD = "admin123";

export async function seedAdmin(): Promise<void> {
  const isProduction = process.env.NODE_ENV === "production";
  const username = process.env.ADMIN_USERNAME || DEFAULT_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    if (isProduction) {
      console.error(
        "[seed-admin] ADMIN_PASSWORD is not set. Refusing to seed a " +
          "default admin account with a hardcoded password in production. " +
          "Set ADMIN_USERNAME and ADMIN_PASSWORD environment variables and " +
          "restart the server.",
      );
      return;
    }
    console.warn(
      "[seed-admin] ADMIN_PASSWORD not set — using insecure default " +
        "credentials for local development only. Never rely on this in " +
        "production.",
    );
  }

  const passwordHash = await bcrypt.hash(password || DEFAULT_PASSWORD, 12);

  const result = await db
    .insert(adminUsersTable)
    .values({ username, passwordHash })
    .onConflictDoNothing({ target: adminUsersTable.username });

  if ((result.rowCount ?? 0) > 0) {
    // Only log that seeding happened, never log credentials
    console.log(`[seed-admin] Default admin account "${username}" created.`);
  }
}
