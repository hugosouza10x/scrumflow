import { prisma } from "@/lib/prisma";

export type CreateClienteInput = {
  nome: string;
  email?: string;
  telefone?: string;
  cor?: string;
};

export type UpdateClienteInput = Partial<CreateClienteInput> & { ativo?: boolean };

export const clienteService = {
  async list() {
    return prisma.cliente.findMany({
      include: {
        _count: { select: { projetos: true, cards: true } },
      },
      orderBy: { nome: "asc" },
    });
  },

  async getById(id: string, projectIds?: string[] | "all") {
    const projetoWhere =
      !projectIds || projectIds === "all"
        ? {}
        : { id: { in: projectIds as string[] } };

    const cardProjetoWhere =
      !projectIds || projectIds === "all"
        ? {}
        : { projetoId: { in: projectIds as string[] } };

    return prisma.cliente.findUnique({
      where: { id },
      include: {
        projetos: {
          where: projetoWhere,
          include: {
            _count: { select: { cards: true, sprints: true } },
          },
          orderBy: { updatedAt: "desc" },
        },
        cards: {
          where: { status: { notIn: ["CONCLUIDO", "CANCELADO"] }, ...cardProjetoWhere },
          include: {
            responsavel: { select: { id: true, nome: true } },
          },
          orderBy: [{ prioridade: "desc" }, { updatedAt: "desc" }],
        },
        _count: { select: { projetos: true, cards: true } },
      },
    });
  },

  async create(data: CreateClienteInput) {
    return prisma.cliente.create({ data });
  },

  async update(id: string, data: UpdateClienteInput) {
    return prisma.cliente.update({ where: { id }, data });
  },

  async delete(id: string) {
    return prisma.cliente.delete({ where: { id } });
  },
};
