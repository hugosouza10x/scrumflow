import { describe, it, expect, vi, beforeEach } from "vitest";
import { isCardElegivelParaSprint } from "@/services/card.service";

// isCardElegivelParaSprint is a pure function — no mocking needed
describe("isCardElegivelParaSprint", () => {
  const base = {
    responsavelId: "user-1",
    criteriosAceite: "- Deve funcionar",
    estimativa: 3,
    subtarefas: [{ id: "sub-1" }],
  };

  it("returns true when all fields are present", () => {
    expect(isCardElegivelParaSprint(base)).toBe(true);
  });

  it("returns false when responsavelId is null", () => {
    expect(isCardElegivelParaSprint({ ...base, responsavelId: null })).toBe(false);
  });

  it("returns false when criteriosAceite is empty", () => {
    expect(isCardElegivelParaSprint({ ...base, criteriosAceite: "   " })).toBe(false);
  });

  it("returns false when criteriosAceite is null", () => {
    expect(isCardElegivelParaSprint({ ...base, criteriosAceite: null })).toBe(false);
  });

  it("returns false when estimativa is null", () => {
    expect(isCardElegivelParaSprint({ ...base, estimativa: null })).toBe(false);
  });

  it("returns false when estimativa is negative", () => {
    expect(isCardElegivelParaSprint({ ...base, estimativa: -1 })).toBe(false);
  });

  it("returns false when subtarefas is empty", () => {
    expect(isCardElegivelParaSprint({ ...base, subtarefas: [] })).toBe(false);
  });

  it("allows zero estimativa (explicit zero is valid)", () => {
    // 0 pontos pode ser válido (ex: bug trivial)
    expect(isCardElegivelParaSprint({ ...base, estimativa: 0 })).toBe(true);
  });
});

describe("logger", () => {
  it("creates a logger with info/warn/error methods", async () => {
    const { logger } = await import("@/lib/logger");
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
  });

  it("logger.error does not throw", async () => {
    const { logger: log } = await import("@/lib/logger");
    expect(() => log.error({ err: new Error("test"), msg: "test error" })).not.toThrow();
  });
});
