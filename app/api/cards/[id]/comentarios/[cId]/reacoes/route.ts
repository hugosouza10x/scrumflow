import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const EMOJIS_VALIDOS = ["👍", "❤️", "🎉", "😄", "😕", "👀"];

type Ctx = { params: Promise<{ id: string; cId: string }> };

// Toggle: se já existe a reação, remove; senão, cria
export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });

  const { cId: comentarioId } = await params;
  const body = await req.json();
  const emoji = typeof body.emoji === "string" ? body.emoji.trim() : "";
  if (!EMOJIS_VALIDOS.includes(emoji)) {
    return NextResponse.json({ message: "Emoji inválido." }, { status: 400 });
  }

  const existente = await prisma.comentarioReacao.findUnique({
    where: { comentarioId_userId_emoji: { comentarioId, userId: session.id, emoji } },
  });

  if (existente) {
    await prisma.comentarioReacao.delete({ where: { id: existente.id } });
  } else {
    await prisma.comentarioReacao.create({
      data: { comentarioId, userId: session.id, emoji },
    });
  }

  const reacoes = await prisma.comentarioReacao.findMany({ where: { comentarioId } });
  return NextResponse.json(reacoes);
}
