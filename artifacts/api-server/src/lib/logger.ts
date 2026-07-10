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
    // Large binary fields — inventory-sync endpoints accept base64-encoded
    // XLSX/CSV files up to 15 MB. Redacting them prevents megabytes of binary
    // data from appearing in logs if req.body is ever logged accidentally.
    "body.xlsxBase64",
    "body.csvBase64",
    "*.xlsxBase64",
    "*.csvBase64",
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
