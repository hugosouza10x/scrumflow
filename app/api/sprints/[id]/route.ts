export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { sprintService } from "@/services/sprint.service";
import { updateSprintSchema } from "@/lib/validations/sprint";
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
  const sprint = await sprintService.getById(id);
  if (!sprint) return NextResponse.json({ message: "Sprint não encontrada." }, { status: 404 });
  return NextResponse.json(sprint);
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
    const parsed = updateSprintSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Dados inválidos", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const sprint = await sprintService.update(id, parsed.data);
    return NextResponse.json(sprint);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao atualizar sprint.";
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
    await sprintService.delete(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    logger.error({ err: e });
    return NextResponse.json({ message: "Erro ao excluir sprint." }, { status: 500 });
  }
}
