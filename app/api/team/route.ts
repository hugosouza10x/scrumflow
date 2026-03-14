export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({
      where: { status: "ATIVO" },
      select: { id: true, nome: true, email: true },
      orderBy: { nome: "asc" },
    });
    return NextResponse.json(users);
  } catch (e) {
    logger.error({ err: e });
    return NextResponse.json({ message: "Erro ao listar equipe." }, { status: 500 });
  }
}
