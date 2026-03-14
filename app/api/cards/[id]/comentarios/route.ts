export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notificacaoService } from "@/services/notificacao.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  const { id: cardId } = await params;
  const comentarios = await prisma.cardComentario.findMany({
    where: { cardId, deletadoEm: null },
    include: {
      user: { select: { id: true, nome: true } },
      reacoes: { include: { user: { select: { id: true, nome: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(comentarios);
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
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: { id: true, titulo: true, responsavelId: true },
  });
  if (!card) return NextResponse.json({ message: "Card não encontrado." }, { status: 404 });

  const body = await request.json();
  const conteudo = typeof body.conteudo === "string" ? body.conteudo.trim() : "";
  if (!conteudo) {
    return NextResponse.json({ message: "Conteúdo obrigatório." }, { status: 400 });
  }

  const comentario = await prisma.cardComentario.create({
    data: { cardId, userId: session.id, conteudo },
    include: { user: { select: { id: true, nome: true } } },
  });

  // Notificações pós-criação (best-effort)
  const notificacoesPromises: Promise<unknown>[] = [];

  // 1. Notificar responsável do card sobre novo comentário (se não for o próprio autor)
  if (card.responsavelId && card.responsavelId !== session.id) {
    notificacoesPromises.push(
      notificacaoService.criar({
        userId: card.responsavelId,
        tipo: "COMENTARIO",
        titulo: `Novo comentário em "${card.titulo}"`,
        mensagem: conteudo.slice(0, 200),
        cardId,
        remetenteId: session.id,
      })
    );
  }

  // 2. @mentions: extrai nomes mencionados e notifica usuários correspondentes
  const mencoes = [...conteudo.matchAll(/@([^\s@,]+(?:\s[^\s@,]+)?)/g)].map((m) =>
    m[1].trim().toLowerCase()
  );
  if (mencoes.length > 0) {
    const usuarios = await prisma.user.findMany({
      where: { status: "ATIVO" },
      select: { id: true, nome: true },
    });
    for (const mencao of mencoes) {
      const usuario = usuarios.find((u) => u.nome.toLowerCase().includes(mencao));
      if (usuario && usuario.id !== session.id) {
        notificacoesPromises.push(
          notificacaoService.criar({
            userId: usuario.id,
            tipo: "MENCAO",
            titulo: `Você foi mencionado em "${card.titulo}"`,
            mensagem: conteudo.slice(0, 200),
            cardId,
            remetenteId: session.id,
          })
        );
      }
    }
  }

  if (notificacoesPromises.length > 0) {
    await Promise.allSettled(notificacoesPromises);
  }

  return NextResponse.json(comentario);
}
