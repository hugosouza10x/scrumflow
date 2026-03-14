import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canCreateProjects } from "@/lib/auth";
import { cardService } from "@/services/card.service";
import { createCardSchema } from "@/lib/validations/card";
import { getAccessibleProjectIds, requireProjectAccess } from "@/lib/authorization";
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
  const avulsas = searchParams.get("avulsas") === "true";
  const clienteId = searchParams.get("clienteId") ?? undefined;
  const sprintId = searchParams.get("sprintId") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const limitParam = searchParams.get("limit");
  const cursor = searchParams.get("cursor") ?? undefined;
  const limit = limitParam ? Math.min(parseInt(limitParam, 10), 200) : undefined;

  try {
    const accessibleIds = await getAccessibleProjectIds(session.id, session.cargo.slug);

    const effectiveProjetoIds =
      accessibleIds === "all"
        ? projetoIds
        : projetoIds
          ? projetoIds.filter((id) => (accessibleIds as string[]).includes(id))
          : (accessibleIds as string[]);

    const result = await cardService.list(
      {
        projetoId,
        projetoIds: effectiveProjetoIds,
        avulsas: avulsas || undefined,
        clienteId,
        sprintId,
        status,
      },
      limit ? { limit, cursor } : undefined
    );
    return NextResponse.json(result);
  } catch (e) {
    logger.error({ err: e });
    return NextResponse.json({ message: "Erro ao listar cards." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }
  if (!canCreateProjects(session.cargo.slug)) {
    return NextResponse.json({ message: "Sem permissão para criar cards." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createCardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Dados inválidos", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    // Validar acesso ao projeto, se informado
    if (parsed.data.projetoId) {
      const denied = await requireProjectAccess(session.id, session.cargo.slug, parsed.data.projetoId);
      if (denied) return denied;
    }

    const card = await cardService.create(parsed.data);
    return NextResponse.json(card);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao criar card.";
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}
