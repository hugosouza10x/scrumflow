import { prisma } from "@/lib/prisma";
import type { CreateUpdateDiarioInput } from "@/lib/validations/update-diario";

export const updateDiarioService = {
  async listByUser(userId: string, limit = 14) {
    return prisma.updateDiario.findMany({
      where: { userId },
      orderBy: { data: "desc" },
      take: limit,
    });
  },

  async getByUserAndDate(userId: string, data: Date) {
    const dateStr = data.toISOString().slice(0, 10);
    return prisma.updateDiario.findUnique({
      where: {
        userId_data: { userId, data: new Date(dateStr + "T00:00:00.000Z") },
      },
    });
  },

  async upsert(userId: string, data: CreateUpdateDiarioInput) {
    const dataDate = new Date(data.data + "T00:00:00.000Z");
    return prisma.updateDiario.upsert({
      where: {
        userId_data: { userId, data: dataDate },
      },
      create: {
        userId,
        data: dataDate,
        trabalheiHoje: data.trabalheiHoje,
        concluido: data.concluido,
        proximoPasso: data.proximoPasso,
        bloqueio: data.bloqueio ?? false,
      },
      update: {
        trabalheiHoje: data.trabalheiHoje,
        concluido: data.concluido,
        proximoPasso: data.proximoPasso,
        bloqueio: data.bloqueio ?? false,
      },
    });
  },
};
