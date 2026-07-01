import "express-session";

// Extend session with userId for mobile/password auth
declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}
