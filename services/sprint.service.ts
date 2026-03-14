import { prisma } from "@/lib/prisma";
import type { CreateSprintInput, UpdateSprintInput } from "@/lib/validations/sprint";

export const sprintService = {
  async list(where?: Record<string, unknown>) {
    return prisma.sprint.findMany({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      where: where as any,
      include: {
        projeto: { select: { id: true, nome: true } },
        membros: { include: { user: { select: { id: true, nome: true } } } },
        _count: { select: { cards: true } },
      },
      orderBy: { dataInicio: "desc" },
    });
  },

  async getById(id: string) {
    return prisma.sprint.findUnique({
      where: { id },
      include: {
        projeto: true,
        membros: { include: { user: true } },
        cards: {
          select: {
            id: true, titulo: true, status: true, prioridade: true, estimativa: true,
            responsavel: { select: { id: true, nome: true } },
            _count: { select: { subtarefas: true } },
          },
        },
      },
    });
  },

  async create(data: CreateSprintInput) {
    const dataInicio = new Date(data.dataInicio);
    const dataFim = new Date(data.dataFim);
    const { membros, ...rest } = data;

    const sprint = await prisma.sprint.create({
      data: {
        ...rest,
        dataInicio,
        dataFim,
        membros: membros?.length
          ? { create: membros.map((m) => ({ userId: m.userId, capacidade: m.capacidade })) }
          : undefined,
      },
      include: {
        projeto: true,
        membros: { include: { user: true } },
      },
    });
    return sprint;
  },

  async update(id: string, data: UpdateSprintInput) {
    const { membros, dataInicio, dataFim, ...rest } = data;

    return prisma.$transaction(async (tx) => {
      if (membros !== undefined) {
        await tx.sprintMembro.deleteMany({ where: { sprintId: id } });
        if (membros.length > 0) {
          await tx.sprintMembro.createMany({
            data: membros.map((m) => ({
              sprintId: id,
              userId: m.userId,
              capacidade: m.capacidade,
            })),
          });
        }
      }

      return tx.sprint.update({
        where: { id },
        data: {
          ...rest,
          ...(dataInicio && { dataInicio: new Date(dataInicio) }),
          ...(dataFim && { dataFim: new Date(dataFim) }),
        },
        include: {
          projeto: true,
          membros: { include: { user: true } },
          cards: true,
        },
      });
    });
  },

  async delete(id: string) {
    return prisma.sprint.delete({ where: { id } });
  },
};
