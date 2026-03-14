/**
 * Rate limiter in-memory para endpoints críticos.
 * Usa sliding window com Map. Em produção com múltiplas instâncias,
 * substituir por Redis/Upstash.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Limpar entradas expiradas a cada 60s
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    store.forEach((entry, key) => {
      if (entry.resetAt <= now) store.delete(key);
    });
  }, 60_000);
}

interface RateLimitOptions {
  /** Número máximo de requisições permitidas no período */
  limit: number;
  /** Período em segundos */
  windowSeconds: number;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

/**
 * Verifica se a key (IP, userId, etc.) está dentro do limite.
 */
export function rateLimit(
  key: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  const windowMs = options.windowSeconds * 1000;

  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    // Primeira requisição ou janela expirou
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { success: true, limit: options.limit, remaining: options.limit - 1, resetAt };
  }

  if (entry.count >= options.limit) {
    return { success: false, limit: options.limit, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return {
    success: true,
    limit: options.limit,
    remaining: options.limit - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Configurações predefinidas por tipo de endpoint.
 */
export const RATE_LIMITS = {
  /** Login: 5 tentativas por minuto por IP */
  login: { limit: 5, windowSeconds: 60 } as RateLimitOptions,
  /** AI: 10 chamadas por minuto por usuário */
  ai: { limit: 10, windowSeconds: 60 } as RateLimitOptions,
  /** Upload: 20 uploads por minuto por usuário */
  upload: { limit: 20, windowSeconds: 60 } as RateLimitOptions,
  /** API geral: 100 chamadas por minuto por usuário */
  general: { limit: 100, windowSeconds: 60 } as RateLimitOptions,
} as const;

/**
 * Helper para extrair IP da request (Next.js).
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}
