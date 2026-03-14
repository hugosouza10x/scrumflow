import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string; cId: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });

  const { cId } = await params;
  const comentario = await prisma.cardComentario.findUnique({ where: { id: cId } });
  if (!comentario || comentario.deletadoEm) {
    return NextResponse.json({ message: "Comentário não encontrado." }, { status: 404 });
  }
  if (comentario.userId !== session.id) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const body = await req.json();
  const conteudo = typeof body.conteudo === "string" ? body.conteudo.trim() : "";
  if (!conteudo) return NextResponse.json({ message: "Conteúdo obrigatório." }, { status: 400 });

  const updated = await prisma.cardComentario.update({
    where: { id: cId },
    data: { conteudo, editadoEm: new Date() },
    include: { user: { select: { id: true, nome: true } }, reacoes: true },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });

  const { cId } = await params;
  const comentario = await prisma.cardComentario.findUnique({ where: { id: cId } });
  if (!comentario || comentario.deletadoEm) {
    return NextResponse.json({ message: "Comentário não encontrado." }, { status: 404 });
  }

  const isAdmin = session.cargo.slug === "admin";
  if (comentario.userId !== session.id && !isAdmin) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  await prisma.cardComentario.update({
    where: { id: cId },
    data: { deletadoEm: new Date() },
  });
  return NextResponse.json({ ok: true });
}
