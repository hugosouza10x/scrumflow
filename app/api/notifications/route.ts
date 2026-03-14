import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { notificacaoService } from "@/services/notificacao.service";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const [notifications, total] = await Promise.all([
    notificacaoService.listar(session.id),
    notificacaoService.countNaoLidas(session.id),
  ]);

  return NextResponse.json({ notifications, total });
}
