import { prisma } from "@/lib/prisma";
import type { CreateProjetoInput, UpdateProjetoInput } from "@/lib/validations/projeto";

export const projetoService = {
  async list(projectIds?: string[] | "all") {
    const where =
      !projectIds || projectIds === "all"
        ? {}
        : { id: { in: projectIds } };

    return prisma.projeto.findMany({
      where,
      include: {
        lider: { select: { id: true, nome: true } },
        cliente: { select: { id: true, nome: true, cor: true } },
        membros: { select: { userId: true } },
        sprints: {
          where: { status: "EM_ANDAMENTO" },
          select: { id: true, nome: true, dataFim: true },
          take: 1,
        },
        cards: { select: { id: true, status: true, prazo: true } },
        _count: { select: { demandas: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  },

  async getById(id: string) {
    return prisma.projeto.findUnique({
      where: { id },
      include: {
        lider: { select: { id: true, nome: true, email: true } },
        cliente: { select: { id: true, nome: true, cor: true } },
        membros: { include: { user: { select: { id: true, nome: true, email: true } } } },
        sprints: {
          select: {
            id: true, nome: true, status: true,
            dataInicio: true, dataFim: true,
            _count: { select: { cards: true } },
          },
          orderBy: { dataInicio: "desc" },
        },
        cards: {
          select: {
            id: true, titulo: true, status: true,
            prioridade: true, prazo: true, bloqueado: true,
            responsavel: { select: { id: true, nome: true } },
            _count: { select: { subtarefas: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        demandas: {
          select: { id: true, titulo: true, statusRefinamento: true, prioridade: true },
          orderBy: { createdAt: "desc" },
        },
        _count: { select: { cards: true, demandas: true, sprints: true, epicos: true } },
      },
    });
  },

  async create(data: CreateProjetoInput) {
    const { membrosIds, ...rest } = data;
    const dataInicio = rest.dataInicio ? new Date(rest.dataInicio) : undefined;
    const dataPrevisao = rest.dataPrevisao ? new Date(rest.dataPrevisao) : undefined;

    return prisma.projeto.create({
      data: {
        ...rest,
        dataInicio,
        dataPrevisao,
        membros: membrosIds?.length
          ? { create: membrosIds.map((userId) => ({ userId })) }
          : undefined,
      },
      include: {
        lider: true,
        membros: { include: { user: true } },
      },
    });
  },

  async update(id: string, data: UpdateProjetoInput) {
    const { membrosIds, ...rest } = data;
    const dataInicio = rest.dataInicio ? new Date(rest.dataInicio) : undefined;
    const dataPrevisao = rest.dataPrevisao ? new Date(rest.dataPrevisao) : undefined;

    return prisma.$transaction(async (tx) => {
      if (membrosIds !== undefined) {
        await tx.projetoMembro.deleteMany({ where: { projetoId: id } });
        if (membrosIds.length > 0) {
          await tx.projetoMembro.createMany({
            data: membrosIds.map((userId) => ({ projetoId: id, userId })),
          });
        }
      }

      return tx.projeto.update({
        where: { id },
        data: {
          ...rest,
          dataInicio,
          dataPrevisao,
        },
        include: {
          lider: true,
          membros: { include: { user: true } },
        },
      });
    });
  },

  async delete(id: string) {
    return prisma.projeto.delete({ where: { id } });
  },
};
