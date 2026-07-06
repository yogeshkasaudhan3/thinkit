import "express-session";

// Extend session with userId for mobile/password auth and adminId for admin panel
declare module "express-session" {
  interface SessionData {
    userId?: number;
    adminId?: string;
    /** Count of consecutive failed change-password attempts for this session */
    pwChangeFailures?: number;
    /** Epoch ms at which the change-password lockout expires */
    pwChangeLockUntil?: number;
  }
}
