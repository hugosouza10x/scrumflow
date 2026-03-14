/**
 * Logger estruturado mínimo para o ScrumFlow.
 * Saída em JSON no servidor (Next.js edge/node) para fácil ingestão.
 * Em dev, usa format legível. Substitui console.error() espalhados.
 *
 * Uso:
 *   import { logger } from "@/lib/logger"
 *   logger.error({ err, path: "/api/cards", userId })
 *   logger.warn({ msg: "Rate limit hit", ip })
 *   logger.info({ msg: "Card criado", cardId })
 */

type LogLevel = "info" | "warn" | "error";

type LogFields = {
  err?: unknown;
  msg?: string;
  [key: string]: unknown;
};

function serialize(level: LogLevel, fields: LogFields): string {
  const { err, ...rest } = fields;
  const errObj =
    err instanceof Error
      ? { message: err.message, stack: err.stack, name: err.name }
      : err !== undefined
      ? { raw: String(err) }
      : undefined;

  return JSON.stringify({
    level,
    ts: new Date().toISOString(),
    ...rest,
    ...(errObj ? { err: errObj } : {}),
  });
}

function log(level: LogLevel, fields: LogFields) {
  const isDev = process.env.NODE_ENV === "development";
  const line = serialize(level, fields);

  if (isDev) {
    // Dev: legível no terminal
    const icon = level === "error" ? "❌" : level === "warn" ? "⚠️" : "ℹ️";
    const msg = fields.msg ?? (fields.err instanceof Error ? fields.err.message : "");
    const extras = Object.entries(fields)
      .filter(([k]) => k !== "msg" && k !== "err")
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join(" ");
    if (level === "error") {
      console.error(`${icon} [${level.toUpperCase()}] ${msg} ${extras}`.trimEnd());
      if (fields.err instanceof Error && fields.err.stack) {
        console.error(fields.err.stack);
      }
    } else if (level === "warn") {
      console.warn(`${icon} [${level.toUpperCase()}] ${msg} ${extras}`.trimEnd());
    } else {
      console.log(`${icon} [${level.toUpperCase()}] ${msg} ${extras}`.trimEnd());
    }
  } else {
    // Prod: JSON uma linha por log (ingestível por CloudWatch / Datadog / Logtail)
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  }
}

export const logger = {
  info: (fields: LogFields) => log("info", fields),
  warn: (fields: LogFields) => log("warn", fields),
  error: (fields: LogFields) => log("error", fields),
};
