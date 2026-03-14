import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { cardService } from "@/services/card.service";
import { updateCardSchema } from "@/lib/validations/card";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { requireProjectAccess } from "@/lib/authorization";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;
  try {
    const card = await cardService.getById(id);
    if (!card) return NextResponse.json({ message: "Card não encontrado." }, { status: 404 });

    const denied = await requireProjectAccess(session.id, session.cargo.slug, card.projetoId);
    if (denied) return denied;

    return NextResponse.json(card);
  } catch (e) {
    logger.error({ err: e });
    return NextResponse.json({ message: "Erro ao buscar card." }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;
  try {
    // Verificar acesso ao projeto do card antes de qualquer operação
    const existing = await prisma.card.findUnique({ where: { id }, select: { projetoId: true } });
    if (!existing) return NextResponse.json({ message: "Card não encontrado." }, { status: 404 });

    const denied = await requireProjectAccess(session.id, session.cargo.slug, existing.projetoId);
    if (denied) return denied;

    const body = await request.json();
    const parsed = updateCardSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? "Dados inválidos";
      return NextResponse.json({ message: firstError }, { status: 400 });
    }

    // Não permite concluir card com subtarefas pendentes
    if (parsed.data.status === "CONCLUIDO") {
      const pendentes = await prisma.subtarefa.count({
        where: {
          cardId: id,
          status: { notIn: ["CONCLUIDA", "CANCELADA"] },
        },
      });
      if (pendentes > 0) {
        return NextResponse.json(
          { message: `Não é possível concluir: ${pendentes} subtarefa(s) pendente(s).` },
          { status: 422 }
        );
      }
    }

    const card = await cardService.update(id, parsed.data, session.id);
    return NextResponse.json(card);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao atualizar card.";
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;
  try {
    const existing = await prisma.card.findUnique({ where: { id }, select: { projetoId: true } });
    if (!existing) return NextResponse.json({ message: "Card não encontrado." }, { status: 404 });

    const denied = await requireProjectAccess(session.id, session.cargo.slug, existing.projetoId);
    if (denied) return denied;

    await cardService.delete(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    logger.error({ err: e });
    return NextResponse.json({ message: "Erro ao excluir card." }, { status: 500 });
  }
}
