import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { notificacaoService } from "@/services/notificacao.service";

export async function PATCH() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  await notificacaoService.marcarTodasLidas(session.id);
  return NextResponse.json({ ok: true });
}
