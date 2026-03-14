import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export type TeamWorkloadItem = {
  user: { id: string; nome: string };
  total: number;
  bloqueados: number;
  atrasados: number;
};

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const now = new Date();

    // Fetch all active users
    const users = await prisma.user.findMany({
      where: { status: "ATIVO" },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    });

    // Fetch all active cards (not concluded/cancelled) with relevant fields
    const cards = await prisma.card.findMany({
      where: {
        status: { notIn: ["CONCLUIDO", "CANCELADO"] },
        responsavelId: { not: null },
      },
      select: {
        id: true,
        responsavelId: true,
        bloqueado: true,
        prazo: true,
      },
    });

    // Build workload per user
    const workload: TeamWorkloadItem[] = users.map((user) => {
      const userCards = cards.filter((c) => c.responsavelId === user.id);
      return {
        user: { id: user.id, nome: user.nome },
        total: userCards.length,
        bloqueados: userCards.filter((c) => c.bloqueado).length,
        atrasados: userCards.filter(
          (c) => c.prazo && new Date(c.prazo) < now
        ).length,
      };
    });

    // Sort: members with cards first, then alphabetically
    workload.sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return a.user.nome.localeCompare(b.user.nome, "pt-BR");
    });

    return NextResponse.json(workload);
  } catch (err) {
    logger.error({ err, msg: "GET /api/team/workload" });
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
