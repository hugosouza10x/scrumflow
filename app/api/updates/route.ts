export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { updateDiarioService } from "@/services/update-diario.service";
import { createUpdateDiarioSchema } from "@/lib/validations/update-diario";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  try {
    const updates = await updateDiarioService.listByUser(session.id);
    return NextResponse.json(updates);
  } catch (e) {
    logger.error({ err: e });
    return NextResponse.json({ message: "Erro ao listar updates." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createUpdateDiarioSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Dados inválidos", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const update = await updateDiarioService.upsert(session.id, parsed.data);
    return NextResponse.json(update);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao salvar update.";
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}
