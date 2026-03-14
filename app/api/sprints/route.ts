import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canCreateProjects } from "@/lib/auth";
import { sprintService } from "@/services/sprint.service";
import { createSprintSchema } from "@/lib/validations/sprint";
import { prisma } from "@/lib/prisma";
import { getAccessibleProjectIds, buildProjectFilter } from "@/lib/authorization";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projetoId = searchParams.get("projetoId") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const includeVelocity = searchParams.get("includeVelocity") === "true";

  try {
    // Filtra sprints pelos projetos acessíveis
    const projectIds = await getAccessibleProjectIds(session.id, session.cargo.slug);
    const projectFilter = buildProjectFilter(projectIds, { fieldName: "projetoId" });

    const where: Record<string, unknown> = { ...projectFilter };
    if (projetoId) where.projetoId = projetoId;
    if (status) where.status = status;

    const sprints = await sprintService.list(where);

    if (includeVelocity) {
      // Batch: busca velocity de todas sprints concluídas em uma única query
      const concluidasIds = sprints
        .filter((s) => s.status === "CONCLUIDA")
        .map((s) => s.id);

      const velocidades = concluidasIds.length
        ? await prisma.card.groupBy({
            by: ["sprintId"],
            where: { sprintId: { in: concluidasIds }, status: "CONCLUIDO" },
            _sum: { estimativa: true },
          })
        : [];

      const velocidadeMap = new Map(
        velocidades.map((v) => [v.sprintId!, v._sum.estimativa ?? 0])
      );

      const withVelocity = sprints.map((s) => ({
        ...s,
        velocidade: velocidadeMap.get(s.id) ?? 0,
      }));

      return NextResponse.json(withVelocity);
    }

    return NextResponse.json(sprints);
  } catch (e) {
    logger.error({ err: e });
    return NextResponse.json({ message: "Erro ao listar sprints." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }
  if (!canCreateProjects(session.cargo.slug)) {
    return NextResponse.json({ message: "Sem permissão para criar sprints." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createSprintSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Dados inválidos", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const sprint = await sprintService.create(parsed.data);
    return NextResponse.json(sprint);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao criar sprint.";
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}
