export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canCreateProjects } from "@/lib/auth";
import { demandaService } from "@/services/demanda.service";
import { createDemandaSchema } from "@/lib/validations/demanda";
import { getAccessibleProjectIds } from "@/lib/authorization";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projetoId = searchParams.get("projetoId") ?? undefined;
  const projetoIdsParam = searchParams.get("projetoIds");
  const projetoIds = projetoIdsParam ? projetoIdsParam.split(",").filter(Boolean) : undefined;
  const statusRefinamento = searchParams.get("statusRefinamento") ?? undefined;
  const geral = searchParams.get("geral") === "true";

  try {
    // Filtrar demandas pelos projetos acessíveis ao usuário
    const accessibleIds = await getAccessibleProjectIds(session.id, session.cargo.slug);

    // Intersectar com os projetoIds solicitados pelo filtro da UI
    const effectiveProjetoIds =
      accessibleIds === "all"
        ? projetoIds
        : projetoIds
          ? projetoIds.filter((id) => (accessibleIds as string[]).includes(id))
          : (accessibleIds as string[]);

    const demandas = await demandaService.list(
      { projetoId, projetoIds: effectiveProjetoIds, statusRefinamento, geral }
    );
    return NextResponse.json(demandas);
  } catch (e) {
    logger.error({ err: e });
    return NextResponse.json({ message: "Erro ao listar demandas." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }
  if (!canCreateProjects(session.cargo.slug)) {
    return NextResponse.json({ message: "Sem permissão para criar demandas." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createDemandaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Dados inválidos", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const demanda = await demandaService.create({
      ...parsed.data,
      solicitanteId: parsed.data.solicitanteId ?? session.id,
      responsavelId: parsed.data.responsavelId,
    });
    return NextResponse.json(demanda);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao criar demanda.";
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}
