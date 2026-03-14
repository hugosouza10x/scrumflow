export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const subtarefaStatusEnum = ["PENDENTE", "EM_ANDAMENTO", "CONCLUIDA", "CANCELADA"] as const;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  const { id: cardId } = await params;
  const subtarefas = await prisma.subtarefa.findMany({
    where: { cardId },
    include: { responsavel: { select: { id: true, nome: true } } },
    orderBy: { ordem: "asc" },
  });
  return NextResponse.json(subtarefas);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  const { id: cardId } = await params;
  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card) return NextResponse.json({ message: "Card não encontrado." }, { status: 404 });

  const body = await request.json();
  const titulo = typeof body.titulo === "string" ? body.titulo.trim() : "";
  if (!titulo) {
    return NextResponse.json({ message: "Título obrigatório." }, { status: 400 });
  }

  // Prazo não pode ser no passado
  if (body.prazo) {
    const hoje = new Date();
    hoje.setUTCHours(0, 0, 0, 0);
    if (new Date(body.prazo) < hoje) {
      return NextResponse.json({ message: "O prazo não pode ser uma data no passado." }, { status: 422 });
    }
  }

  const maxOrdem = await prisma.subtarefa
    .aggregate({ where: { cardId }, _max: { ordem: true } })
    .then((r) => r._max.ordem ?? -1);

  const subtarefa = await prisma.subtarefa.create({
    data: {
      cardId,
      titulo,
      responsavelId: body.responsavelId || undefined,
      estimativa: typeof body.estimativa === "number" ? body.estimativa : undefined,
      prazo: body.prazo ? new Date(body.prazo) : undefined,
      ordem: maxOrdem + 1,
    },
    include: { responsavel: { select: { id: true, nome: true } } },
  });
  return NextResponse.json(subtarefa);
}
