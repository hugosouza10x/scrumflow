export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getAccessibleProjectIds } from "@/lib/authorization";

const cardInclude = {
  projeto: {
    select: {
      id: true,
      nome: true,
      cliente: { select: { id: true, nome: true, cor: true } },
    },
  },
  cliente: { select: { id: true, nome: true, cor: true } },
  sprint: { select: { id: true, nome: true, dataFim: true } },
  _count: { select: { subtarefas: true } },
} as const;

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });

  try {
    const projectIds = await getAccessibleProjectIds(session.id, session.cargo.slug);

    const projetoFilter =
      projectIds === "all"
        ? {}
        : { OR: [{ projetoId: { in: projectIds as string[] } }, { projetoId: null }] };

    const concluidos = new URL(request.url).searchParams.get("concluidos") === "true";

    // Rota para buscar concluídas recentemente
    if (concluidos) {
      const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const cards = await prisma.card.findMany({
        where: {
          responsavelId: session.id,
          status: { in: ["CONCLUIDO", "CANCELADO"] },
          updatedAt: { gte: trintaDiasAtras },
          ...projetoFilter,
        },
        include: cardInclude,
        orderBy: { updatedAt: "desc" },
        take: 20,
      });
      return NextResponse.json({ cards });
    }

    // Rota padrão: itens ativos
    const [cards, demandas] = await Promise.all([
      prisma.card.findMany({
        where: {
          responsavelId: session.id,
          status: { notIn: ["CONCLUIDO", "CANCELADO"] },
          ...projetoFilter,
        },
        include: cardInclude,
        orderBy: [
          { prioridade: "desc" },
          { prazo: "asc" },
          { updatedAt: "desc" },
        ],
      }),
      prisma.demanda.findMany({
        where: {
          responsavelId: session.id,
          statusRefinamento: { in: ["NAO_REFINADO", "EM_REFINAMENTO"] },
          ...projetoFilter,
        },
        select: {
          id: true,
          titulo: true,
          descricao: true,
          statusRefinamento: true,
          prioridade: true,
          tipo: true,
          projeto: { select: { id: true, nome: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const total = cards.length;
    const bloqueados = cards.filter((c) => c.bloqueado).length;
    const atrasados = cards.filter((c) => c.prazo && new Date(c.prazo) < new Date()).length;
    const urgentes = cards.filter((c) => c.prioridade === "URGENTE" || c.prioridade === "ALTA").length;

    return NextResponse.json({ cards, demandas, stats: { total, bloqueados, atrasados, urgentes } });
  } catch (e) {
    logger.error({ err: e });
    return NextResponse.json({ message: "Erro ao carregar." }, { status: 500 });
  }
}
