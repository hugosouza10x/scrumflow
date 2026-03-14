/**
 * Tipos para payloads de API e respostas
 */

import type {
  CardStatus,
  Prioridade,
  SprintStatus,
  StatusRefinamento,
  SubtarefaStatus,
  UserStatus,
} from "./domain";

// ============== Auth ==============

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: SessionUser;
  token?: string;
}

export interface SessionUser {
  id: string;
  nome: string;
  email: string;
  cargo: { id: string; nome: string; slug: string };
  status: UserStatus;
}

// ============== Usuários ==============

export interface CreateUserPayload {
  nome: string;
  email: string;
  password: string;
  cargoId: string;
  status?: UserStatus;
}

export interface UpdateUserPayload {
  nome?: string;
  email?: string;
  password?: string;
  cargoId?: string;
  status?: UserStatus;
}

// ============== Projetos ==============

export interface CreateProjetoPayload {
  nome: string;
  descricao?: string;
  status?: string;
  prioridade?: Prioridade;
  liderId?: string;
  dataInicio?: string;
  dataPrevisao?: string;
  membrosIds?: string[];
}

export interface UpdateProjetoPayload extends Partial<CreateProjetoPayload> {}

// ============== Demandas ==============

export interface CreateDemandaPayload {
  titulo: string;
  descricao?: string;
  solicitanteId?: string;
  origem?: string;
  impacto?: string;
  prioridade?: Prioridade;
  tipo?: string;
  projetoId: string;
}

export interface UpdateDemandaPayload {
  titulo?: string;
  descricao?: string;
  statusRefinamento?: StatusRefinamento;
  [key: string]: unknown;
}

// ============== Sprints ==============

export interface CreateSprintPayload {
  nome: string;
  objetivo?: string;
  dataInicio: string;
  dataFim: string;
  capacidadeTotal?: number;
  projetoId: string;
  membros?: { userId: string; capacidade?: number }[];
}

export interface UpdateSprintPayload {
  nome?: string;
  objetivo?: string;
  dataInicio?: string;
  dataFim?: string;
  capacidadeTotal?: number;
  status?: SprintStatus;
  membros?: { userId: string; capacidade?: number }[];
}

// ============== Cards ==============

export interface CreateCardPayload {
  titulo: string;
  descricao?: string;
  criteriosAceite?: string;
  responsavelId?: string;
  prioridade?: Prioridade;
  estimativa?: number;
  prazo?: string;
  projetoId: string;
  sprintId?: string;
  subtarefas?: { titulo: string; estimativa?: number }[];
  etiquetasIds?: string[];
}

export interface UpdateCardPayload {
  titulo?: string;
  descricao?: string;
  criteriosAceite?: string;
  responsavelId?: string;
  prioridade?: Prioridade;
  estimativa?: number;
  prazo?: string;
  status?: CardStatus;
  sprintId?: string | null;
  bloqueado?: boolean;
  motivoBloqueio?: string | null;
  etiquetasIds?: string[];
}

// ============== Subtarefas ==============

export interface CreateSubtarefaPayload {
  titulo: string;
  responsavelId?: string;
  estimativa?: number;
  prazo?: string;
  cardId: string;
}

export interface UpdateSubtarefaPayload {
  titulo?: string;
  responsavelId?: string;
  status?: SubtarefaStatus;
  estimativa?: number;
  prazo?: string;
}

// ============== Updates diários ==============

export interface CreateUpdateDiarioPayload {
  data: string; // YYYY-MM-DD
  trabalheiHoje?: string;
  concluido?: string;
  proximoPasso?: string;
  bloqueio?: boolean;
}

// ============== Respostas genéricas ==============

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
