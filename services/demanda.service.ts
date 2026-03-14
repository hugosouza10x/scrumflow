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
    incluirConvertidas?: boolean; // se true, exibe demandas já convertidas em card
    incluirArquivadas?: boolean;  // se true, exibe demandas arquivadas
  }) {
    const prismaWhere: Prisma.DemandaWhereInput = {};

    // Por padrão, exclui convertidas e arquivadas do backlog ativo
    if (!where?.incluirConvertidas) {
      prismaWhere.convertida = false;
    }
    if (!where?.incluirArquivadas) {
      prismaWhere.arquivada = false;
    }

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
        ...(data.arquivada !== undefined && {
          arquivada: data.arquivada,
          arquivadaEm: data.arquivada ? new Date() : null,
        }),
      },
      include: includeDefault,
    });
  },

  async delete(id: string) {
    return prisma.demanda.delete({ where: { id } });
  },
};
