import { cn } from "@/lib/utils";
import type { CardStatus, Prioridade, ProjetoStatus, SprintStatus, StatusRefinamento } from "@/types";

// ─── Card Status ────────────────────────────────────────────────────────────

const CARD_STATUS_STYLES: Record<CardStatus, string> = {
  BACKLOG: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  PRONTO_PARA_SPRINT: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  A_FAZER: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  EM_ANDAMENTO: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  EM_REVISAO: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  BLOQUEADO: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  HOMOLOGACAO: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  CONCLUIDO: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  CANCELADO: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

const CARD_STATUS_LABEL: Record<CardStatus, string> = {
  BACKLOG: "Backlog",
  PRONTO_PARA_SPRINT: "Pronto p/ Sprint",
  A_FAZER: "A fazer",
  EM_ANDAMENTO: "Em andamento",
  EM_REVISAO: "Em revisão",
  BLOQUEADO: "Bloqueado",
  HOMOLOGACAO: "Homologação",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

export function CardStatusBadge({ status, className }: { status: string; className?: string }) {
  const s = status as CardStatus;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        CARD_STATUS_STYLES[s] ?? "bg-muted text-muted-foreground",
        className
      )}
    >
      {CARD_STATUS_LABEL[s] ?? status}
    </span>
  );
}

// ─── Prioridade ──────────────────────────────────────────────────────────────

const PRIORIDADE_STYLES: Record<Prioridade, string> = {
  BAIXA: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  MEDIA: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300",
  ALTA: "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300",
  URGENTE: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

const PRIORIDADE_LABEL: Record<Prioridade, string> = {
  BAIXA: "Baixa",
  MEDIA: "Média",
  ALTA: "Alta",
  URGENTE: "Urgente",
};

export function PrioridadeBadge({ prioridade, className }: { prioridade: string; className?: string }) {
  const p = prioridade as Prioridade;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        PRIORIDADE_STYLES[p] ?? "bg-muted text-muted-foreground",
        className
      )}
    >
      {PRIORIDADE_LABEL[p] ?? prioridade}
    </span>
  );
}

// ─── Projeto Status ──────────────────────────────────────────────────────────

const PROJETO_STATUS_STYLES: Record<ProjetoStatus, string> = {
  ATIVO: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  PAUSADO: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  CONCLUIDO: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  CANCELADO: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

const PROJETO_STATUS_LABEL: Record<ProjetoStatus, string> = {
  ATIVO: "Ativo",
  PAUSADO: "Pausado",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

export function ProjetoStatusBadge({ status, className }: { status: string; className?: string }) {
  const s = status as ProjetoStatus;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        PROJETO_STATUS_STYLES[s] ?? "bg-muted text-muted-foreground",
        className
      )}
    >
      {PROJETO_STATUS_LABEL[s] ?? status}
    </span>
  );
}

// ─── Sprint Status ───────────────────────────────────────────────────────────

const SPRINT_STATUS_STYLES: Record<SprintStatus, string> = {
  PLANEJADA: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  EM_ANDAMENTO: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  CONCLUIDA: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  CANCELADA: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

const SPRINT_STATUS_LABEL: Record<SprintStatus, string> = {
  PLANEJADA: "Planejada",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};

export function SprintStatusBadge({ status, className }: { status: string; className?: string }) {
  const s = status as SprintStatus;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        SPRINT_STATUS_STYLES[s] ?? "bg-muted text-muted-foreground",
        className
      )}
    >
      {SPRINT_STATUS_LABEL[s] ?? status}
    </span>
  );
}

// ─── Status Refinamento ──────────────────────────────────────────────────────

const REFINAMENTO_STYLES: Record<StatusRefinamento, string> = {
  NAO_REFINADO: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300",
  EM_REFINAMENTO: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  PRONTO_PARA_SPRINT: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

const REFINAMENTO_LABEL: Record<StatusRefinamento, string> = {
  NAO_REFINADO: "Não refinado",
  EM_REFINAMENTO: "Em refinamento",
  PRONTO_PARA_SPRINT: "Pronto para sprint",
};

export function RefinamentoBadge({ status, className }: { status: string; className?: string }) {
  const s = status as StatusRefinamento;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        REFINAMENTO_STYLES[s] ?? "bg-muted text-muted-foreground",
        className
      )}
    >
      {REFINAMENTO_LABEL[s] ?? status}
    </span>
  );
}
