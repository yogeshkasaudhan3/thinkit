import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "@workspace/db";
import router from "./routes";
import { logger } from "./lib/logger";

const PgStore = connectPgSimple(session);

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// Trust Replit's reverse proxy so secure cookies work in production
app.set("trust proxy", 1);

app.use(cors({ origin: true, credentials: true }));
// 15 MB limit accommodates base64-encoded XLSX files for inventory sync (3 000+ products ≈ 700 KB base64)
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required");
}

// PostgreSQL-backed sessions
app.use(
  session({
    store: new PgStore({
      pool,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      // Default: 8 hours. Override with SESSION_TTL_MS env var.
      maxAge: process.env.SESSION_TTL_MS
        ? Number(process.env.SESSION_TTL_MS)
        : 8 * 60 * 60 * 1000,
    },
  }),
);

app.use("/api", router);

// Global error handler — must be registered last, after all routes.
// Logs the full error server-side and returns a sanitized message to the client.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const log = (req as any).log ?? logger;
  log.error({ err }, "Unhandled server error");
  res.status(500).json({ error: "Internal server error" });
});

export default app;
