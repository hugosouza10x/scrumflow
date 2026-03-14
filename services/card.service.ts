import { prisma } from "@/lib/prisma";
import type { CreateCardInput, UpdateCardInput } from "@/lib/validations/card";
import { notificacaoService } from "@/services/notificacao.service";

/** Verifica se o card está elegível para entrar na sprint */
export function isCardElegivelParaSprint(card: {
  responsavelId: string | null;
  criteriosAceite: string | null;
  estimativa: number | null;
  subtarefas?: { id: string }[];
}): boolean {
  if (!card.responsavelId) return false;
  if (!card.criteriosAceite?.trim()) return false;
  if (card.estimativa == null || card.estimativa < 0) return false;
  const hasSubtarefas = card.subtarefas && card.subtarefas.length > 0;
  if (!hasSubtarefas) return false;
  return true;
}

export const cardService = {
  async list(
    where?: {
      projetoId?: string;
      projetoIds?: string[];
      avulsas?: boolean;
      clienteId?: string;
      sprintId?: string | null;
      status?: string;
      incluirArquivados?: boolean;
    },
    pagination?: { limit?: number; cursor?: string }
  ) {
    const prismaWhere: Record<string, unknown> = {};

    // Por padrão, exclui cards arquivados da listagem operacional
    if (!where?.incluirArquivados) {
      prismaWhere.arquivado = false;
    }

    if (where?.projetoIds?.length && where?.avulsas) {
      prismaWhere.OR = [
        { projetoId: { in: where.projetoIds } },
        { projetoId: null },
      ];
    } else if (where?.avulsas) {
      prismaWhere.projetoId = null;
    } else if (where?.projetoIds?.length) {
      prismaWhere.projetoId = { in: where.projetoIds };
    } else if (where?.projetoId) {
      prismaWhere.projetoId = where.projetoId;
    }
    if (where?.sprintId !== undefined) prismaWhere.sprintId = where.sprintId ?? null;
    if (where?.status) prismaWhere.status = where.status;
    if (where?.clienteId) {
      prismaWhere.OR = [
        { projeto: { clienteId: where.clienteId } },
        { clienteId: where.clienteId },
      ];
    }

    const limit = pagination?.limit;
    const cursor = pagination?.cursor;

    const raw = await prisma.card.findMany({
      where: prismaWhere,
      include: {
        responsavel: { select: { id: true, nome: true } },
        responsaveis: { include: { user: { select: { id: true, nome: true } } } },
        projeto: {
          select: {
            id: true,
            nome: true,
            cliente: { select: { id: true, nome: true, cor: true } },
          },
        },
        cliente: { select: { id: true, nome: true, cor: true } },
        sprint: { select: { id: true, nome: true } },
        epico: { select: { id: true, nome: true } },
        bloqueadoPor: { select: { id: true, titulo: true } },
        subtarefas: { select: { status: true } },
        _count: { select: { subtarefas: true } },
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      ...(limit ? { take: limit + 1 } : {}),
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const data = raw.map(({ subtarefas, responsaveis, ...card }) => ({
      ...card,
      responsaveis: responsaveis.map((r) => r.user),
      _countConcluidas: subtarefas.filter((s) => s.status === "CONCLUIDA").length,
    }));

    if (!limit) return data;

    // Se veio um item extra, há próxima página
    const hasNext = data.length > limit;
    const items = hasNext ? data.slice(0, limit) : data;
    const nextCursor = hasNext ? items[items.length - 1].id : null;
    return { data: items, nextCursor };
  },

  async getById(id: string) {
    return prisma.card.findUnique({
      where: { id },
      include: {
        responsavel: true,
        responsaveis: { include: { user: { select: { id: true, nome: true } } } },
        projeto: true,
        sprint: true,
        subtarefas: { orderBy: { ordem: "asc" } },
        comentarios: { include: { user: { select: { id: true, nome: true } } }, orderBy: { createdAt: "desc" } },
        historicos: { include: { user: { select: { id: true, nome: true } } }, orderBy: { createdAt: "desc" } },
        anexos: true,
        etiquetas: { include: { etiqueta: true } },
        dependencias: { include: { dependencia: { select: { id: true, titulo: true, status: true } } } },
        bloqueadoPor: { select: { id: true, titulo: true } },
      },
    });
  },

  async create(data: CreateCardInput) {
    const { subtarefas, etiquetasIds, responsaveisIds, demandaId, ...rest } = data;
    const prazo = data.prazo ? new Date(data.prazo) : undefined;

    // Se responsaveisIds fornecido, usa o primeiro como responsavelId primário
    const responsavelIdFinal = responsaveisIds?.length
      ? responsaveisIds[0]
      : rest.responsavelId;

    const card = await prisma.card.create({
      data: {
        ...rest,
        responsavelId: responsavelIdFinal,
        prazo,
        demandaId: demandaId ?? undefined,
        responsaveis: responsaveisIds?.length
          ? { create: responsaveisIds.map((userId) => ({ userId })) }
          : undefined,
        subtarefas: subtarefas?.length
          ? {
              create: subtarefas.map((s, i) => ({
                titulo: s.titulo,
                estimativa: s.estimativa,
                ordem: i,
              })),
            }
          : undefined,
        etiquetas: etiquetasIds?.length
          ? { create: etiquetasIds.map((etiquetaId) => ({ etiquetaId })) }
          : undefined,
      },
      include: {
        responsavel: true,
        responsaveis: { include: { user: { select: { id: true, nome: true } } } },
        projeto: true,
        sprint: true,
        subtarefas: true,
      },
    });

    // Marcar demanda como convertida
    if (demandaId) {
      await prisma.demanda.update({
        where: { id: demandaId },
        data: { convertida: true },
      });
    }

    return card;
  },

  async update(id: string, data: UpdateCardInput, userId?: string) {
    const card = await prisma.card.findUnique({ where: { id }, include: { subtarefas: true, responsaveis: true } });
    if (!card) throw new Error("Card não encontrado.");

    const prazo = data.prazo !== undefined ? (data.prazo ? new Date(data.prazo) : null) : undefined;
    const updateData: Parameters<typeof prisma.card.update>[0]["data"] = {
      ...(data.titulo && { titulo: data.titulo }),
      ...(data.descricao !== undefined && { descricao: data.descricao }),
      ...(data.criteriosAceite !== undefined && { criteriosAceite: data.criteriosAceite }),
      ...(data.responsavelId !== undefined && { responsavelId: data.responsavelId }),
      ...(data.prioridade && { prioridade: data.prioridade }),
      ...(data.estimativa !== undefined && { estimativa: data.estimativa }),
      ...(prazo !== undefined && { prazo }),
      ...(data.status && { status: data.status }),
      ...(data.sprintId !== undefined && { sprintId: data.sprintId }),
      ...(data.bloqueado !== undefined && {
        bloqueado: data.bloqueado,
        motivoBloqueio: data.bloqueado ? data.motivoBloqueio ?? null : null,
        bloqueadoPorId: data.bloqueado ? (data.bloqueadoPorId ?? null) : null,
      }),
      ...(data.bloqueadoPorId !== undefined && data.bloqueado !== false && { bloqueadoPorId: data.bloqueadoPorId }),
      ...(data.motivoBloqueio !== undefined && { motivoBloqueio: data.motivoBloqueio }),
      ...(data.arquivado !== undefined && {
        arquivado: data.arquivado,
        arquivadoEm: data.arquivado ? new Date() : null,
      }),
    };

    if (userId) {
      // Campos rastreados: compara valor atual com novo e gera histórico
      type CampoRastreado = {
        campo: string;
        anterior: string | null;
        novo: string | null;
      };
      const alteracoes: CampoRastreado[] = [];

      const str = (v: unknown): string | null =>
        v == null ? null : v instanceof Date ? v.toISOString() : String(v);

      if (data.titulo !== undefined && data.titulo !== card.titulo)
        alteracoes.push({ campo: "titulo", anterior: card.titulo, novo: data.titulo });

      if (data.descricao !== undefined && data.descricao !== card.descricao)
        alteracoes.push({ campo: "descricao", anterior: str(card.descricao), novo: str(data.descricao) });

      if (data.criteriosAceite !== undefined && data.criteriosAceite !== card.criteriosAceite)
        alteracoes.push({ campo: "criteriosAceite", anterior: str(card.criteriosAceite), novo: str(data.criteriosAceite) });

      if (data.prioridade !== undefined && data.prioridade !== card.prioridade)
        alteracoes.push({ campo: "prioridade", anterior: str(card.prioridade), novo: str(data.prioridade) });

      if (data.responsavelId !== undefined && data.responsavelId !== card.responsavelId)
        alteracoes.push({ campo: "responsavelId", anterior: str(card.responsavelId), novo: str(data.responsavelId) });

      if (data.estimativa !== undefined && data.estimativa !== card.estimativa)
        alteracoes.push({ campo: "estimativa", anterior: str(card.estimativa), novo: str(data.estimativa) });

      if (prazo !== undefined && str(prazo) !== str(card.prazo))
        alteracoes.push({ campo: "prazo", anterior: str(card.prazo), novo: str(prazo) });

      if (data.status !== undefined && data.status !== card.status) {
        alteracoes.push({ campo: "status", anterior: card.status, novo: data.status });

        // Auto-timestamps de ciclo de vida
        const ud = updateData as Record<string, unknown>;
        if (data.status === "EM_ANDAMENTO" && !(card as Record<string, unknown>).iniciadoEm) {
          ud.iniciadoEm = new Date();
        }
        if (["CONCLUIDO", "CANCELADO"].includes(data.status)) {
          ud.concluidoEm = new Date();
        }
        if (data.status === "BLOQUEADO") {
          ud.bloqueadoEm = new Date();
        }
        if (card.status === "BLOQUEADO" && data.status !== "BLOQUEADO") {
          ud.bloqueadoEm = null;
        }
      }

      if (data.sprintId !== undefined && data.sprintId !== card.sprintId)
        alteracoes.push({ campo: "sprintId", anterior: str(card.sprintId), novo: str(data.sprintId) });

      if (data.bloqueado !== undefined && data.bloqueado !== card.bloqueado)
        alteracoes.push({ campo: "bloqueado", anterior: str(card.bloqueado), novo: str(data.bloqueado) });

      if (alteracoes.length > 0) {
        (updateData as { historicos?: object }).historicos = {
          create: alteracoes.map((a) => ({
            userId,
            campo: a.campo,
            valorAnterior: a.anterior,
            valorNovo: a.novo,
          })),
        };
      }
    }

    updateData.ultimaAtualizacao = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      if (data.etiquetasIds !== undefined) {
        await tx.cardEtiqueta.deleteMany({ where: { cardId: id } });
        if (data.etiquetasIds.length > 0) {
          await tx.cardEtiqueta.createMany({
            data: data.etiquetasIds.map((etiquetaId) => ({ cardId: id, etiquetaId })),
          });
        }
      }

      if (data.responsaveisIds !== undefined) {
        // Substituir lista de responsáveis
        await tx.cardResponsavel.deleteMany({ where: { cardId: id } });
        if (data.responsaveisIds.length > 0) {
          await tx.cardResponsavel.createMany({
            data: data.responsaveisIds.map((userId) => ({ cardId: id, userId })),
          });
        }
        // Sincroniza responsavelId com o primeiro da lista (ou null)
        updateData.responsavelId = data.responsaveisIds[0] ?? null;
      }

      return tx.card.update({
        where: { id },
        data: updateData,
        include: {
          responsavel: true,
          responsaveis: { include: { user: { select: { id: true, nome: true } } } },
          projeto: true,
          sprint: true,
          subtarefas: true,
          historicos: { include: { user: { select: { id: true, nome: true } } }, orderBy: { createdAt: "desc" } },
        },
      });
    });

    // Disparar notificações fora da transação (best-effort)
    if (userId) {
      const promises: Promise<unknown>[] = [];

      // Atribuição: responsável mudou e há um novo responsável
      if (
        data.responsavelId !== undefined &&
        data.responsavelId !== card.responsavelId &&
        data.responsavelId
      ) {
        promises.push(
          notificacaoService.criar({
            userId: data.responsavelId,
            tipo: "ATRIBUICAO",
            titulo: `Você foi atribuído ao card "${card.titulo}"`,
            cardId: id,
            remetenteId: userId,
          })
        );
      }

      // Bloqueio: card ficou bloqueado
      if (data.bloqueado === true && !card.bloqueado && card.responsavelId) {
        promises.push(
          notificacaoService.criar({
            userId: card.responsavelId,
            tipo: "BLOQUEADO",
            titulo: `Card bloqueado: "${card.titulo}"`,
            mensagem: data.motivoBloqueio ?? undefined,
            cardId: id,
            remetenteId: userId,
          })
        );
      }

      if (promises.length > 0) {
        await Promise.allSettled(promises);
      }
    }

    return updated;
  },

  async updateStatus(id: string, status: string, userId?: string) {
    return this.update(id, { status: status as Parameters<typeof this.update>[1]["status"] }, userId);
  },

  async delete(id: string) {
    return prisma.card.delete({ where: { id } });
  },

  isCardElegivelParaSprint,
};
