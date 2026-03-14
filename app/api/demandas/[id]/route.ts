export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { demandaService } from "@/services/demanda.service";
import { updateDemandaSchema } from "@/lib/validations/demanda";
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
  const demanda = await demandaService.getById(id);
  if (!demanda) return NextResponse.json({ message: "Demanda não encontrada." }, { status: 404 });
  return NextResponse.json(demanda);
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
    const parsed = updateDemandaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Dados inválidos", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const demanda = await demandaService.update(id, parsed.data);
    return NextResponse.json(demanda);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao atualizar demanda.";
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
    await demandaService.delete(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    logger.error({ err: e });
    return NextResponse.json({ message: "Erro ao excluir demanda." }, { status: 500 });
  }
}
