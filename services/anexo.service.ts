import { prisma } from "@/lib/prisma";
import { buildS3Key, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from "@/lib/s3";

export const anexoService = {
  async listByCard(cardId: string) {
    return prisma.cardAnexo.findMany({
      where: { cardId },
      include: { user: { select: { id: true, nome: true } } },
      orderBy: { createdAt: "desc" },
    });
  },

  validateFile(file: { type: string; size: number }): void {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`Arquivo maior que ${MAX_FILE_SIZE / 1024 / 1024} MB.`);
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new Error("Tipo de arquivo não permitido.");
    }
  },

  /**
   * Gera a chave S3 e cria o registro do anexo no banco.
   * O upload do buffer deve ser feito pela rota API (presigned ou SDK).
   */
  async createMetadata(params: {
    cardId: string;
    projetoId: string;
    userId: string;
    nome: string;
    tipo: string;
    tamanho: number;
    key: string;
  }) {
    return prisma.cardAnexo.create({
      data: params,
      include: { user: { select: { id: true, nome: true } } },
    });
  },

  async getById(id: string) {
    return prisma.cardAnexo.findUnique({
      where: { id },
      include: { card: true, user: true },
    });
  },

  async delete(id: string) {
    return prisma.cardAnexo.delete({ where: { id } });
  },

  buildKey(projetoId: string, cardId: string, fileName: string): string {
    return buildS3Key(projetoId, cardId, fileName);
  },
};
