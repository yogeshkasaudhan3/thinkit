import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: [
    // HTTP transport headers
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']",
    // Password fields — covers any manual log({ body: req.body }) calls.
    // The pinoHttp req serializer already strips the body from access logs,
    // but these paths act as a safety net against accidental credential leaks.
    "body.password",
    "body.currentPassword",
    "body.newPassword",
    "body.confirmPassword",
    // One level of nesting (e.g. log({ data: { password } }))
    "*.password",
    "*.currentPassword",
    "*.newPassword",
    "*.confirmPassword",
  ],
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }),
});
