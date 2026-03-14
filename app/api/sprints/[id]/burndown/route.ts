export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const sprint = await prisma.sprint.findUnique({
    where: { id },
    include: {
      cards: {
        select: {
          id: true,
          estimativa: true,
          status: true,
          historicos: {
            where: { campo: "status", valorNovo: "CONCLUIDO" },
            select: { createdAt: true },
            orderBy: { createdAt: "asc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!sprint) return NextResponse.json({ error: "Sprint não encontrada" }, { status: 404 });

  const inicio = new Date(sprint.dataInicio);
  const fim = new Date(sprint.dataFim);
  const hoje = new Date();
  const fimReal = fim < hoje ? fim : hoje;

  const totalPontos = sprint.cards.reduce((acc, c) => acc + (c.estimativa ?? 1), 0);

  // Gera os dias da sprint
  const dias: string[] = [];
  const d = new Date(inicio);
  while (d <= fimReal) {
    dias.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }

  const totalDias = Math.max(
    1,
    Math.round((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
  );

  // Linha ideal
  const ideal = dias.map((dia, i) => ({
    dia,
    ideal: Math.round(totalPontos * (1 - i / totalDias)),
  }));

  // Linha real: calcula pontos restantes por dia
  const pontosConcluidos: Record<string, number> = {};
  for (const card of sprint.cards) {
    if (card.status === "CONCLUIDO" || card.status === "CANCELADO") {
      const dataConclusao = card.historicos[0]?.createdAt ?? new Date();
      const chave = new Date(dataConclusao).toISOString().slice(0, 10);
      pontosConcluidos[chave] = (pontosConcluidos[chave] ?? 0) + (card.estimativa ?? 1);
    }
  }

  let acumulado = 0;
  const real = ideal.map(({ dia }) => {
    acumulado += pontosConcluidos[dia] ?? 0;
    return { dia, real: Math.max(0, totalPontos - acumulado) };
  });

  const data = ideal.map((item, i) => ({
    dia: item.dia,
    ideal: item.ideal,
    real: real[i].real,
  }));

  return NextResponse.json({
    totalPontos,
    totalCards: sprint.cards.length,
    data,
  });
}
