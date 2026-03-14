import { describe, it, expect, vi, beforeEach } from "vitest";
import { hasProjectAccess, getAccessibleProjectIds } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  projetoMembro: { findMany: ReturnType<typeof vi.fn> };
  projeto: { findMany: ReturnType<typeof vi.fn>; findFirst: ReturnType<typeof vi.fn> };
};

describe("hasProjectAccess", () => {
  beforeEach(() => vi.clearAllMocks());

  it("admin has access to any project (no DB call)", async () => {
    const result = await hasProjectAccess("user-1", "admin", "project-1");
    expect(result).toBe(true);
    expect(mockPrisma.projeto.findFirst).not.toHaveBeenCalled();
  });

  it("user with project match has access", async () => {
    mockPrisma.projeto.findFirst.mockResolvedValue({ id: "project-1" });
    const result = await hasProjectAccess("user-1", "desenvolvedor", "project-1");
    expect(result).toBe(true);
  });

  it("user without project match has no access", async () => {
    mockPrisma.projeto.findFirst.mockResolvedValue(null);
    const result = await hasProjectAccess("user-1", "desenvolvedor", "project-1");
    expect(result).toBe(false);
  });
});

describe("getAccessibleProjectIds", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 'all' for admin", async () => {
    const result = await getAccessibleProjectIds("user-1", "admin");
    expect(result).toBe("all");
  });

  it("returns merged project ids from memberships and liderships", async () => {
    mockPrisma.projetoMembro.findMany.mockResolvedValue([{ projetoId: "p1" }, { projetoId: "p2" }]);
    mockPrisma.projeto.findMany.mockResolvedValue([{ id: "p3" }]);
    const result = await getAccessibleProjectIds("user-1", "desenvolvedor") as string[];
    expect(result).toContain("p1");
    expect(result).toContain("p2");
    expect(result).toContain("p3");
  });

  it("deduplicates when user is both member and lider", async () => {
    mockPrisma.projetoMembro.findMany.mockResolvedValue([{ projetoId: "p1" }]);
    mockPrisma.projeto.findMany.mockResolvedValue([{ id: "p1" }]);
    const result = await getAccessibleProjectIds("user-1", "desenvolvedor") as string[];
    expect(result.length).toBe(1);
    expect(result[0]).toBe("p1");
  });
});
