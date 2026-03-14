/**
 * Tipos de domínio e enums compartilhados (espelham Prisma quando possível)
 */

export type UserStatus = "ATIVO" | "INATIVO";

export type ProjetoStatus = "ATIVO" | "PAUSADO" | "CONCLUIDO" | "CANCELADO";

export type StatusRefinamento =
  | "NAO_REFINADO"
  | "EM_REFINAMENTO"
  | "PRONTO_PARA_SPRINT";

export type SprintStatus = "PLANEJADA" | "EM_ANDAMENTO" | "CONCLUIDA" | "CANCELADA";

export type CardStatus =
  | "BACKLOG"
  | "PRONTO_PARA_SPRINT"
  | "A_FAZER"
  | "EM_ANDAMENTO"
  | "EM_REVISAO"
  | "BLOQUEADO"
  | "HOMOLOGACAO"
  | "CONCLUIDO"
  | "CANCELADO";

export type SubtarefaStatus = "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDA" | "CANCELADA";

export type Prioridade = "BAIXA" | "MEDIA" | "ALTA" | "URGENTE";

export type EpicoStatus = "ABERTO" | "EM_ANDAMENTO" | "CONCLUIDO" | "CANCELADO";

export const EPICO_STATUS_LABEL: Record<EpicoStatus, string> = {
  ABERTO: "Aberto",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

/** Slugs de cargos para controle de acesso */
export type CargoSlug = "admin" | "gestor" | "tech_lead" | "desenvolvedor" | "analista";

/** Slugs de templates de card */
export type CardTemplateSlug = "bug" | "nova_feature" | "melhoria" | "infraestrutura";

/** Estrutura sugerida de subtarefas no template */
export interface SubtarefaSugerida {
  titulo: string;
  ordem?: number;
}

export const CARD_STATUS_LABEL: Record<CardStatus, string> = {
  BACKLOG: "Backlog",
  PRONTO_PARA_SPRINT: "Pronto para Sprint",
  A_FAZER: "A fazer",
  EM_ANDAMENTO: "Em andamento",
  EM_REVISAO: "Em revisão",
  BLOQUEADO: "Bloqueado",
  HOMOLOGACAO: "Homologação",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

export const PRIORIDADE_LABEL: Record<Prioridade, string> = {
  BAIXA: "Baixa",
  MEDIA: "Média",
  ALTA: "Alta",
  URGENTE: "Urgente",
};

export const SPRINT_STATUS_LABEL: Record<SprintStatus, string> = {
  PLANEJADA: "Planejada",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};

export const STATUS_REFINAMENTO_LABEL: Record<StatusRefinamento, string> = {
  NAO_REFINADO: "Não refinado",
  EM_REFINAMENTO: "Em refinamento",
  PRONTO_PARA_SPRINT: "Pronto para sprint",
};
