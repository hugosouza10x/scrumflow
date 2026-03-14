export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { cardService } from "@/services/card.service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;
  try {
    const body = await request.json();
    const { status } = body;
    if (!status || typeof status !== "string") {
      return NextResponse.json({ message: "Status obrigatório." }, { status: 400 });
    }
    const card = await cardService.updateStatus(id, status, session.id);
    return NextResponse.json(card);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao atualizar status.";
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}
