import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { notificacaoService } from "@/services/notificacao.service";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  await notificacaoService.marcarLida(id, session.id);
  return NextResponse.json({ ok: true });
}
