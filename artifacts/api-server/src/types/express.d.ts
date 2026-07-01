import "express-session";

// Extend session with userId for mobile/password auth and adminId for admin panel
declare module "express-session" {
  interface SessionData {
    userId?: number;
    adminId?: string;
  }
}
