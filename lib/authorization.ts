import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CARGO_ADMIN } from "@/lib/auth";

/**
 * Retorna os IDs dos projetos aos quais o usuário tem acesso.
 * Admin tem acesso a tudo; outros somente projetos onde são membros ou líderes.
 */
export async function getAccessibleProjectIds(
  userId: string,
  cargoSlug: string
): Promise<string[] | "all"> {
  if (cargoSlug === CARGO_ADMIN) return "all";

  const memberships = await prisma.projetoMembro.findMany({
    where: { userId },
    select: { projetoId: true },
  });

  const liderships = await prisma.projeto.findMany({
    where: { liderId: userId },
    select: { id: true },
  });

  const ids = new Set<string>();
  for (const m of memberships) ids.add(m.projetoId);
  for (const p of liderships) ids.add(p.id);

  return Array.from(ids);
}

/**
 * Cria um filtro Prisma WHERE para restringir por projetos acessíveis.
 * Para admin retorna {} (sem filtro). Para outros retorna filtro por projetoId.
 * Inclui cards avulsas (projetoId: null) se includeAvulsas=true.
 */
export function buildProjectFilter(
  projectIds: string[] | "all",
  options?: { includeAvulsas?: boolean; fieldName?: string }
): Record<string, unknown> {
  if (projectIds === "all") return {};

  const field = options?.fieldName ?? "projetoId";

  if (options?.includeAvulsas) {
    return {
      OR: [
        { [field]: { in: projectIds } },
        { [field]: null },
      ],
    };
  }

  return { [field]: { in: projectIds } };
}

/**
 * Verifica se o usuário tem acesso a um projeto específico.
 */
export async function hasProjectAccess(
  userId: string,
  cargoSlug: string,
  projetoId: string
): Promise<boolean> {
  if (cargoSlug === CARGO_ADMIN) return true;

  const projeto = await prisma.projeto.findFirst({
    where: {
      id: projetoId,
      OR: [
        { liderId: userId },
        { membros: { some: { userId } } },
      ],
    },
    select: { id: true },
  });

  return projeto !== null;
}

/**
 * Verifica acesso ao projeto e retorna resposta 403 se não autorizado.
 * Se projetoId for null/undefined, permite acesso (card avulso).
 * Retorna null se autorizado, ou NextResponse 403 se não autorizado.
 */
export async function requireProjectAccess(
  userId: string,
  cargoSlug: string,
  projetoId: string | null | undefined
): Promise<NextResponse | null> {
  if (!projetoId) return null; // cards avulsos são acessíveis a qualquer usuário autenticado
  const hasAccess = await hasProjectAccess(userId, cargoSlug, projetoId);
  if (!hasAccess) {
    return NextResponse.json({ message: "Sem acesso ao projeto." }, { status: 403 });
  }
  return null;
}
