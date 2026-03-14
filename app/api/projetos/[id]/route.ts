export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { projetoService } from "@/services/projeto.service";
import { updateProjetoSchema } from "@/lib/validations/projeto";
import { logger } from "@/lib/logger";

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
    const projeto = await projetoService.getById(id);
    if (!projeto) return NextResponse.json({ message: "Projeto não encontrado." }, { status: 404 });
    return NextResponse.json(projeto);
  } catch (e) {
    logger.error({ err: e });
    return NextResponse.json({ message: "Erro ao buscar projeto." }, { status: 500 });
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
    const body = await request.json();
    const parsed = updateProjetoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Dados inválidos", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const projeto = await projetoService.update(id, parsed.data);
    return NextResponse.json(projeto);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao atualizar projeto.";
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
    await projetoService.delete(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    logger.error({ err: e });
    return NextResponse.json({ message: "Erro ao excluir projeto." }, { status: 500 });
  }
}
