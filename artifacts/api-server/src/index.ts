import app from "./app";
import { logger } from "./lib/logger";
import { seedAdmin } from "./scripts/seed-admin";

// ─── Guard against GCS stream errors crashing the server ─────────────────────
// When a client disconnects mid-image-request (e.g. navigating away), our
// req.on("close") handler destroys the GCS read stream.  In a narrow race the
// GCS library's own onResponse callback fires after the stream is already
// destroyed and calls Node's pipeline() synchronously — throwing
// ERR_STREAM_UNABLE_TO_PIPE inside the GCS callback chain before our
// pipeline(…, callback) error handler can see it.  The result is an uncaught
// exception that would otherwise kill the process and take every user with it.
//
// Strategy: swallow known-benign stream errors (client gone); exit on anything
// else so the process manager can restart cleanly.
const BENIGN_STREAM_CODES = new Set([
  "ERR_STREAM_UNABLE_TO_PIPE",
  "ERR_STREAM_PREMATURE_CLOSE",
  "EPIPE",
  "ECONNRESET",
]);

process.on("uncaughtException", (err: Error) => {
  const code = (err as NodeJS.ErrnoException).code ?? "";
  if (BENIGN_STREAM_CODES.has(code)) {
    // Client disconnected before the image stream finished — harmless.
    logger.warn({ code }, "Swallowed benign stream error (client disconnected)");
    return;
  }
  logger.error({ err }, "Uncaught exception — exiting");
  process.exit(1);
});

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Ensure the default admin exists before accepting any requests
try {
  await seedAdmin();
} catch (err) {
  logger.error({ err }, "Admin seed failed — cannot start safely");
  process.exit(1);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
