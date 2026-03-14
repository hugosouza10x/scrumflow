import { prisma } from "@/lib/prisma";

export type TipoNotificacao = "MENCAO" | "ATRIBUICAO" | "COMENTARIO" | "BLOQUEADO";

export const notificacaoService = {
  async criar({
    userId,
    tipo,
    titulo,
    mensagem,
    cardId,
    remetenteId,
  }: {
    userId: string;
    tipo: TipoNotificacao;
    titulo: string;
    mensagem?: string;
    cardId?: string;
    remetenteId?: string;
  }) {
    // Não notificar o próprio autor
    if (userId === remetenteId) return null;

    return prisma.notificacao.create({
      data: { userId, tipo, titulo, mensagem, cardId, remetenteId },
    });
  },

  async listar(userId: string, limit = 30) {
    return prisma.notificacao.findMany({
      where: { userId },
      orderBy: [{ lida: "asc" }, { createdAt: "desc" }],
      take: limit,
      include: {
        card: { select: { id: true, titulo: true } },
        remetente: { select: { id: true, nome: true } },
      },
    });
  },

  async countNaoLidas(userId: string) {
    return prisma.notificacao.count({ where: { userId, lida: false } });
  },

  async marcarLida(id: string, userId: string) {
    return prisma.notificacao.updateMany({
      where: { id, userId },
      data: { lida: true },
    });
  },

  async marcarTodasLidas(userId: string) {
    return prisma.notificacao.updateMany({
      where: { userId, lida: false },
      data: { lida: true },
    });
  },
};
