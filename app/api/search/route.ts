export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ cards: [], projetos: [], epicos: [] });

  const [cards, projetos, epicos] = await Promise.all([
    prisma.card.findMany({
      where: {
        OR: [
          { titulo: { contains: q, mode: "insensitive" } },
          { descricao: { contains: q, mode: "insensitive" } },
        ],
        status: { notIn: ["CANCELADO"] },
      },
      select: {
        id: true,
        titulo: true,
        status: true,
        prioridade: true,
        projeto: { select: { id: true, nome: true } },
      },
      take: 8,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.projeto.findMany({
      where: {
        nome: { contains: q, mode: "insensitive" },
        status: "ATIVO",
      },
      select: { id: true, nome: true, status: true },
      take: 4,
    }),
    prisma.epico.findMany({
      where: { nome: { contains: q, mode: "insensitive" } },
      select: { id: true, nome: true, status: true, projetoId: true },
      take: 4,
    }),
  ]);

  return NextResponse.json({ cards, projetos, epicos });
}
