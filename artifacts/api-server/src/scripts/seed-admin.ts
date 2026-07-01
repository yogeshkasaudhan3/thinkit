/**
 * Seed script: ensures the default admin user exists in the database.
 * Idempotent — uses onConflictDoNothing so concurrent startups are safe.
 * Called at server startup (awaited before app.listen).
 */
import bcrypt from "bcryptjs";
import { db, adminUsersTable } from "@workspace/db";

const DEFAULT_USERNAME = "admin";
const DEFAULT_PASSWORD = "admin123";

export async function seedAdmin(): Promise<void> {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

  const result = await db
    .insert(adminUsersTable)
    .values({ username: DEFAULT_USERNAME, passwordHash })
    .onConflictDoNothing({ target: adminUsersTable.username });

  if ((result.rowCount ?? 0) > 0) {
    // Only log that seeding happened, never log credentials
    console.log("[seed-admin] Default admin account created.");
  }
}
