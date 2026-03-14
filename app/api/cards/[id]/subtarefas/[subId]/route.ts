import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const statusEnum = ["PENDENTE", "EM_ANDAMENTO", "CONCLUIDA", "CANCELADA"] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  const { id: cardId, subId } = await params;
  const body = await request.json();

  const data: Prisma.SubtarefaUncheckedUpdateInput = {};
  if (typeof body.titulo === "string") data.titulo = body.titulo.trim();
  if (body.responsavelId !== undefined) data.responsavelId = body.responsavelId || null;
  if (body.status && statusEnum.includes(body.status)) data.status = body.status;
  if (typeof body.estimativa === "number") data.estimativa = body.estimativa;
  if (body.prazo !== undefined) data.prazo = body.prazo ? new Date(body.prazo) : null;

  const existing = await prisma.subtarefa.findFirst({ where: { id: subId, cardId } });
  if (!existing) {
    return NextResponse.json({ message: "Subtarefa não encontrada." }, { status: 404 });
  }
  const updated = await prisma.subtarefa.update({
    where: { id: subId },
    data,
    include: { responsavel: { select: { id: true, nome: true } } },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  const { id: cardId, subId } = await params;
  await prisma.subtarefa.deleteMany({ where: { id: subId, cardId } });
  return NextResponse.json({ ok: true });
}
