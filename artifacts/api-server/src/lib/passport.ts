import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// Build callback URL from env, fallback to Replit dev domain
const callbackURL =
  process.env.GOOGLE_CALLBACK_URL ??
  `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/google/callback`;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.warn(
    "[passport] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is not set. " +
      "Google OAuth is disabled until credentials are configured.",
  );
} else {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const googleId = profile.id;
          const email = profile.emails?.[0]?.value ?? "";
          const name = profile.displayName ?? email;
          const picture = profile.photos?.[0]?.value ?? null;

          // Find existing user or create new one
          let [user] = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.googleId, googleId));

          if (!user) {
            [user] = await db
              .insert(usersTable)
              .values({ googleId, email, name, picture })
              .returning();
          }

          return done(null, user);
        } catch (err) {
          return done(err as Error);
        }
      },
    ),
  );
}

// Store only user ID in session
passport.serializeUser((user: Express.User, done) => {
  done(null, user.id);
});

// Re-hydrate user from DB on every request
passport.deserializeUser(async (id: number, done) => {
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id));
    done(null, user ?? false);
  } catch (err) {
    done(err as Error);
  }
});

export default passport;
