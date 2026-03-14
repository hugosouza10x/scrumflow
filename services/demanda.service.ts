import { prisma } from "@/lib/prisma";
import { type Prisma } from "@prisma/client";
import type { CreateDemandaInput, UpdateDemandaInput } from "@/lib/validations/demanda";

const includeDefault = {
  solicitante: { select: { id: true, nome: true } },
  responsavel: { select: { id: true, nome: true } },
  projeto: { select: { id: true, nome: true } },
} satisfies Prisma.DemandaInclude;

export const demandaService = {
  async list(where?: {
    projetoId?: string;
    projetoIds?: string[];
    geral?: boolean; // apenas demandas sem projeto (projetoId = null)
    statusRefinamento?: string;
  }) {
    const prismaWhere: Prisma.DemandaWhereInput = {};

    if (where?.statusRefinamento) {
      prismaWhere.statusRefinamento = where.statusRefinamento as Prisma.EnumStatusRefinamentoFilter | undefined;
    }

    if (where?.geral) {
      // Demandas sem projeto
      prismaWhere.projetoId = null;
    } else if (where?.projetoIds?.length) {
      prismaWhere.projetoId = { in: where.projetoIds };
    } else if (where?.projetoId) {
      prismaWhere.projetoId = where.projetoId;
    }

    return prisma.demanda.findMany({
      where: prismaWhere,
      include: includeDefault,
      orderBy: [{ prioridade: "desc" }, { updatedAt: "desc" }],
    });
  },

  async getById(id: string) {
    return prisma.demanda.findUnique({
      where: { id },
      include: {
        solicitante: true,
        responsavel: true,
        projeto: true,
      },
    });
  },

  async create(data: CreateDemandaInput & { solicitanteId?: string }) {
    return prisma.demanda.create({
      data: {
        titulo: data.titulo,
        descricao: data.descricao,
        solicitanteId: data.solicitanteId,
        responsavelId: data.responsavelId,
        origem: data.origem,
        impacto: data.impacto,
        prioridade: data.prioridade ?? "MEDIA",
        tipo: data.tipo,
        projetoId: data.projetoId || null,
      },
      include: includeDefault,
    });
  },

  async update(id: string, data: UpdateDemandaInput) {
    return prisma.demanda.update({
      where: { id },
      data: {
        ...(data.titulo && { titulo: data.titulo }),
        ...(data.descricao !== undefined && { descricao: data.descricao }),
        ...(data.statusRefinamento && { statusRefinamento: data.statusRefinamento }),
        ...(data.prioridade && { prioridade: data.prioridade }),
        ...(data.tipo !== undefined && { tipo: data.tipo }),
        ...(data.responsavelId !== undefined && { responsavelId: data.responsavelId }),
      },
      include: includeDefault,
    });
  },

  async delete(id: string) {
    return prisma.demanda.delete({ where: { id } });
  },
};
