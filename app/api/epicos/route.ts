import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getAccessibleProjectIds, requireProjectAccess } from "@/lib/authorization";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const projetoId = req.nextUrl.searchParams.get("projetoId");
  const projectIds = await getAccessibleProjectIds(session.id, session.cargo.slug);

  // Montar filtro respeitando projetos acessíveis
  let where: Record<string, unknown> = {};
  if (projetoId) {
    // Verificar se o projetoId solicitado é acessível
    const denied = await requireProjectAccess(session.id, session.cargo.slug, projetoId);
    if (denied) return denied;
    where = { projetoId };
  } else if (projectIds !== "all") {
    where = { projetoId: { in: projectIds as string[] } };
  }

  const epicos = await prisma.epico.findMany({
    where,
    include: {
      projeto: { select: { id: true, nome: true } },
      _count: { select: { cards: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Contar cards concluídos por épico separadamente
  const epicoIds = epicos.map((e) => e.id);
  const concluidosCounts =
    epicoIds.length > 0
      ? await prisma.card.groupBy({
          by: ["epicoId"],
          where: { epicoId: { in: epicoIds }, status: "CONCLUIDO" },
          _count: { id: true },
        })
      : [];

  const epicosComProgresso = epicos.map((e) => ({
    ...e,
    cardsConcluidosCount:
      concluidosCounts.find((c) => c.epicoId === e.id)?._count.id ?? 0,
  }));

  return NextResponse.json(epicosComProgresso);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const { nome, descricao, projetoId } = body;

  if (!nome?.trim() || !projetoId) {
    return NextResponse.json({ error: "Nome e projeto são obrigatórios" }, { status: 400 });
  }

  // Verificar acesso ao projeto
  const denied = await requireProjectAccess(session.id, session.cargo.slug, projetoId);
  if (denied) return denied;

  const epico = await prisma.epico.create({
    data: { nome: nome.trim(), descricao: descricao?.trim() || null, projetoId },
    include: { _count: { select: { cards: true } } },
  });

  return NextResponse.json(epico, { status: 201 });
}
