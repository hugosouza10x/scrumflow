import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireProjectAccess, buildProjectFilter } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  projeto: { findFirst: ReturnType<typeof vi.fn> };
};

describe("requireProjectAccess", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null for null projetoId (avulso card)", async () => {
    const result = await requireProjectAccess("user-1", "desenvolvedor", null);
    expect(result).toBeNull();
  });

  it("returns null for undefined projetoId", async () => {
    const result = await requireProjectAccess("user-1", "desenvolvedor", undefined);
    expect(result).toBeNull();
  });

  it("returns null when admin (always has access)", async () => {
    const result = await requireProjectAccess("user-1", "admin", "project-1");
    expect(result).toBeNull();
    expect(mockPrisma.projeto.findFirst).not.toHaveBeenCalled();
  });

  it("returns null when user has access to the project", async () => {
    mockPrisma.projeto.findFirst.mockResolvedValue({ id: "project-1" });
    const result = await requireProjectAccess("user-1", "desenvolvedor", "project-1");
    expect(result).toBeNull();
  });

  it("returns 403 NextResponse when user has no access", async () => {
    mockPrisma.projeto.findFirst.mockResolvedValue(null);
    const result = await requireProjectAccess("user-1", "desenvolvedor", "project-1");
    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
    const body = await result!.json();
    expect(body.message).toBe("Sem acesso ao projeto.");
  });
});

describe("buildProjectFilter", () => {
  it("returns empty object for admin (all)", () => {
    expect(buildProjectFilter("all")).toEqual({});
  });

  it("returns projetoId filter for list of ids", () => {
    const filter = buildProjectFilter(["p1", "p2"]);
    expect(filter).toEqual({ projetoId: { in: ["p1", "p2"] } });
  });

  it("includes null projetoId when includeAvulsas=true", () => {
    const filter = buildProjectFilter(["p1"], { includeAvulsas: true });
    expect(filter).toEqual({
      OR: [{ projetoId: { in: ["p1"] } }, { projetoId: null }],
    });
  });

  it("uses custom fieldName when provided", () => {
    const filter = buildProjectFilter(["p1"], { fieldName: "epicoProjetoId" });
    expect(filter).toEqual({ epicoProjetoId: { in: ["p1"] } });
  });

  it("returns filter allowing all when admin with includeAvulsas", () => {
    const filter = buildProjectFilter("all", { includeAvulsas: true });
    expect(filter).toEqual({});
  });
});
