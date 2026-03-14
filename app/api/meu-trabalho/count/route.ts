export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ total: 0 });

  const [cards, demandas] = await Promise.all([
    prisma.card.count({
      where: {
        responsavelId: session.id,
        status: { notIn: ["CONCLUIDO", "CANCELADO"] },
      },
    }),
    prisma.demanda.count({
      where: {
        responsavelId: session.id,
        statusRefinamento: { in: ["NAO_REFINADO", "EM_REFINAMENTO"] },
      },
    }),
  ]);

  return NextResponse.json({ total: cards + demandas });
}
