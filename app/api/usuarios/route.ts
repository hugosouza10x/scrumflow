import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canManageUsers } from "@/lib/auth";
import { usuarioService } from "@/services/usuario.service";
import { logger } from "@/lib/logger";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }
  if (!canManageUsers(session.cargo.slug)) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  try {
    const users = await usuarioService.list();
    return NextResponse.json(users);
  } catch (e) {
    logger.error({ err: e });
    return NextResponse.json({ message: "Erro ao listar usuários." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }
  if (!canManageUsers(session.cargo.slug)) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { createUsuarioSchema } = await import("@/lib/validations/usuario");
    const parsed = createUsuarioSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Dados inválidos", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const user = await usuarioService.create(parsed.data);
    const { passwordHash: _, ...rest } = user;
    return NextResponse.json(rest);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao criar usuário.";
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}
