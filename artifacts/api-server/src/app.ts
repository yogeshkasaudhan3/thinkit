import express, { type Express } from "express";
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

export default app;
