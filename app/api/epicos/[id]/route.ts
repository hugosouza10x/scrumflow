import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/authorization";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const epico = await prisma.epico.findUnique({
    where: { id },
    include: {
      projeto: { select: { id: true, nome: true } },
      cards: {
        select: {
          id: true, titulo: true, status: true, prioridade: true, estimativa: true,
          responsavel: { select: { id: true, nome: true } },
          _count: { select: { subtarefas: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!epico) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const denied = await requireProjectAccess(session.id, session.cargo.slug, epico.projetoId);
  if (denied) return denied;

  return NextResponse.json(epico);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  // Buscar épico para verificar acesso ao projeto
  const existing = await prisma.epico.findUnique({ where: { id }, select: { projetoId: true } });
  if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const denied = await requireProjectAccess(session.id, session.cargo.slug, existing.projetoId);
  if (denied) return denied;

  const body = await req.json();
  const { nome, descricao, status } = body;

  const epico = await prisma.epico.update({
    where: { id },
    data: {
      ...(nome !== undefined && { nome: nome.trim() }),
      ...(descricao !== undefined && { descricao: descricao?.trim() || null }),
      ...(status !== undefined && { status }),
    },
  });

  return NextResponse.json(epico);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.epico.findUnique({ where: { id }, select: { projetoId: true } });
  if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const denied = await requireProjectAccess(session.id, session.cargo.slug, existing.projetoId);
  if (denied) return denied;

  await prisma.epico.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
