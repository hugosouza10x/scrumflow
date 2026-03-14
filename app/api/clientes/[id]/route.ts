export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { clienteService } from "@/services/cliente.service";
import { logger } from "@/lib/logger";
import { getAccessibleProjectIds } from "@/lib/authorization";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });

  const { id } = await params;
  try {
    const projectIds = await getAccessibleProjectIds(session.id, session.cargo.slug);
    const cliente = await clienteService.getById(id, projectIds);
    if (!cliente) return NextResponse.json({ message: "Cliente não encontrado." }, { status: 404 });
    return NextResponse.json(cliente);
  } catch (e) {
    logger.error({ err: e });
    return NextResponse.json({ message: "Erro ao buscar cliente." }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });

  const { id } = await params;
  try {
    const body = await request.json();
    const cliente = await clienteService.update(id, {
      nome: body.nome?.trim() || undefined,
      email: body.email !== undefined ? body.email?.trim() || null : undefined,
      telefone: body.telefone !== undefined ? body.telefone?.trim() || null : undefined,
      cor: body.cor !== undefined ? body.cor || null : undefined,
      ativo: body.ativo !== undefined ? body.ativo : undefined,
    });
    return NextResponse.json(cliente);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao atualizar cliente.";
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });

  const { id } = await params;
  try {
    await clienteService.delete(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    logger.error({ err: e });
    return NextResponse.json({ message: "Erro ao excluir cliente." }, { status: 500 });
  }
}
