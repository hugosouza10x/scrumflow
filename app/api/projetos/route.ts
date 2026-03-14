import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canCreateProjects } from "@/lib/auth";
import { projetoService } from "@/services/projeto.service";
import { createProjetoSchema } from "@/lib/validations/projeto";
import { getAccessibleProjectIds } from "@/lib/authorization";
import { logger } from "@/lib/logger";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  try {
    const projectIds = await getAccessibleProjectIds(session.id, session.cargo.slug);
    const projetos = await projetoService.list(projectIds);
    return NextResponse.json(projetos);
  } catch (e) {
    logger.error({ err: e });
    return NextResponse.json({ message: "Erro ao listar projetos." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }
  if (!canCreateProjects(session.cargo.slug)) {
    return NextResponse.json({ message: "Sem permissão para criar projetos." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createProjetoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Dados inválidos", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const projeto = await projetoService.create(parsed.data);
    return NextResponse.json(projeto);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao criar projeto.";
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}
