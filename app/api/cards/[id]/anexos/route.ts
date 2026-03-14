export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { anexoService } from "@/services/anexo.service";
import { isS3Configured, getPublicUrl } from "@/lib/s3";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  const { id: cardId } = await params;
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: { projetoId: true },
  });
  if (!card) return NextResponse.json({ message: "Card não encontrado." }, { status: 404 });

  const anexos = await anexoService.listByCard(cardId);
  const withUrl = anexos.map((a) => ({
    ...a,
    url: getPublicUrl(a.key) ?? undefined,
  }));
  return NextResponse.json(withUrl);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  // Rate limiting por usuário
  const rl = rateLimit(`upload:${session.id}`, RATE_LIMITS.upload);
  if (!rl.success) {
    return NextResponse.json(
      { message: "Limite de uploads atingido. Tente novamente em 1 minuto." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  const { id: cardId } = await params;
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: { id: true, projetoId: true },
  });
  if (!card) return NextResponse.json({ message: "Card não encontrado." }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return NextResponse.json({ message: "Arquivo obrigatório." }, { status: 400 });
  }

  try {
    anexoService.validateFile({ type: file.type, size: file.size });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Arquivo inválido.";
    return NextResponse.json({ message: msg }, { status: 400 });
  }

  const key = anexoService.buildKey(card.projetoId ?? "avulso", cardId, file.name);

  if (isS3Configured()) {
    try {
      const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
      const client = new S3Client({
        region: process.env.S3_REGION ?? "us-east-1",
        endpoint: process.env.S3_ENDPOINT || undefined,
        credentials: process.env.S3_ACCESS_KEY
          ? {
              accessKeyId: process.env.S3_ACCESS_KEY,
              secretAccessKey: process.env.S3_SECRET_KEY!,
            }
          : undefined,
      });
      const buffer = Buffer.from(await file.arrayBuffer());
      await client.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET ?? "scrumflow-anexos",
          Key: key,
          Body: buffer,
          ContentType: file.type,
        })
      );
    } catch (e) {
      logger.error({ err: e });
      return NextResponse.json({ message: "Erro ao enviar arquivo." }, { status: 500 });
    }
  }
  // Se S3 não configurado, ainda criamos o registro com key "local/..." para não quebrar o fluxo
  const finalKey = isS3Configured() ? key : `local/${key}`;

  const anexo = await anexoService.createMetadata({
    cardId,
    projetoId: card.projetoId ?? "avulso",
    userId: session.id,
    nome: file.name,
    tipo: file.type,
    tamanho: file.size,
    key: finalKey,
  });

  return NextResponse.json(anexo);
}
