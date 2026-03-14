// Test setup — mock Prisma to avoid real DB calls in unit tests
import { vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    card: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    cardHistorico: { create: vi.fn() },
    notificacao: { create: vi.fn(), findMany: vi.fn(), count: vi.fn(), updateMany: vi.fn() },
    user: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn() },
    projeto: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn() },
    projetoMembro: { findMany: vi.fn() },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({
      card: { update: vi.fn() },
      cardEtiqueta: { deleteMany: vi.fn(), createMany: vi.fn() },
    })),
  },
}));
