import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canManageUsers } from "@/lib/auth";
import { usuarioService } from "@/services/usuario.service";
import { updateUsuarioSchema } from "@/lib/validations/usuario";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }
  if (!canManageUsers(session.cargo.slug)) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const { id } = await params;
  const user = await usuarioService.getById(id);
  if (!user) return NextResponse.json({ message: "Usuário não encontrado." }, { status: 404 });
  const { passwordHash: _, ...rest } = user;
  return NextResponse.json(rest);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }
  if (!canManageUsers(session.cargo.slug)) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const { id } = await params;
  try {
    const body = await request.json();
    const parsed = updateUsuarioSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Dados inválidos", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const user = await usuarioService.update(id, parsed.data);
    const { passwordHash: __, ...rest } = user;
    return NextResponse.json(rest);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao atualizar usuário.";
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}
