"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { KanbanColumn } from "./kanban-column";
import { KanbanCard } from "./kanban-card";
import type { CardStatus } from "@/types";
import { CARD_STATUS_LABEL } from "@/types";
import type { KanbanCardFields } from "./use-kanban-card-fields";

const KANBAN_COLUMNS: CardStatus[] = [
  "BACKLOG",
  "PRONTO_PARA_SPRINT",
  "A_FAZER",
  "EM_ANDAMENTO",
  "EM_REVISAO",
  "BLOQUEADO",
  "HOMOLOGACAO",
  "CONCLUIDO",
  "CANCELADO",
];

// Columns that start collapsed by default
export const COLUMNS_COLLAPSED_BY_DEFAULT = new Set<string>(["CANCELADO"]);
// Columns that limit card count until "ver mais" is clicked
export const COLUMNS_WITH_LIMIT = new Set<string>(["CONCLUIDO", "CANCELADO"]);
export const COLUMN_CARD_LIMIT = 10;

export type ClienteInfo = { id: string; nome: string; cor: string | null } | null;

export type CardForKanban = {
  id: string;
  titulo: string;
  status: string;
  prioridade?: string | null;
  estimativa?: number | null;
  responsavel?: { id: string; nome: string } | null;
  responsaveis?: { id: string; nome: string }[];
  bloqueado?: boolean;
  bloqueadoPor?: { id: string; titulo: string } | null;
  motivoBloqueio?: string | null;
  _count?: { subtarefas: number };
  _countConcluidas?: number;
  ultimaAtualizacao?: string | null;
  prazo?: string | null;
  createdAt?: string | null;
  projeto?: { id: string; nome: string; cliente?: ClienteInfo } | null;
  cliente?: ClienteInfo;
  sprint?: { id: string; nome: string } | null;
  epico?: { id: string; nome: string } | null;
  tipo?: "card" | "demanda";
  criteriosAceite?: string | null;
};

export type TeamMember = { id: string; nome: string; email: string };

type KanbanBoardProps = {
  cards: CardForKanban[];
  onStatusChange: (cardId: string, newStatus: string) => Promise<void>;
  onQuickAdd: (status: CardStatus, titulo: string, responsaveisIds?: string[], prioridade?: string) => Promise<void>;
  desatualizadoIds?: Set<string>;
  showProjeto?: boolean;
  teamMembers?: TeamMember[];
  fieldConfig?: KanbanCardFields;
  collapsedColumns?: Set<string>;
  showAllInColumn?: Set<string>;
  onToggleCollapse?: (columnId: string) => void;
  onShowAll?: (columnId: string) => void;
};

export function KanbanBoard({
  cards,
  onStatusChange,
  onQuickAdd,
  desatualizadoIds = new Set(),
  showProjeto = false,
  teamMembers = [],
  fieldConfig,
  collapsedColumns = new Set(),
  showAllInColumn = new Set(),
  onToggleCollapse,
  onShowAll,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [quickAddStatus, setQuickAddStatus] = useState<CardStatus | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over) return;
      const newStatus = over.id as string;
      if (!KANBAN_COLUMNS.includes(newStatus as CardStatus)) return;
      const cardId = active.id as string;
      const card = cards.find((c) => c.id === cardId);
      if (!card || card.status === newStatus || card.tipo === "demanda") return;

      // Aviso de elegibilidade ao mover para PRONTO_PARA_SPRINT
      if (newStatus === "PRONTO_PARA_SPRINT") {
        const faltando: string[] = [];
        if (!card.responsavel) faltando.push("responsável");
        if (!card.criteriosAceite?.trim()) faltando.push("critérios de aceite");
        if (card.estimativa == null) faltando.push("estimativa");
        if (!card._count?.subtarefas) faltando.push("subtarefas");
        if (faltando.length > 0) {
          toast.warning(`Card pode não estar pronto para sprint. Faltando: ${faltando.join(", ")}.`);
        }
      }

      await onStatusChange(cardId, newStatus);
      if (card.bloqueado) {
        toast.warning("Card bloqueado movido. Verifique se o bloqueio ainda é válido.");
      }
    },
    [cards, onStatusChange]
  );

  const handleQuickAdd = async (titulo: string, responsaveisIds?: string[], prioridade?: string) => {
    if (!quickAddStatus) return;
    await onQuickAdd(quickAddStatus, titulo, responsaveisIds, prioridade);
    setQuickAddStatus(null);
  };

  const activeCard = activeId ? cards.find((c) => c.id === activeId) : null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4 min-h-[400px]">
        {KANBAN_COLUMNS.map((status) => (
          <KanbanColumn
            key={status}
            id={status}
            title={CARD_STATUS_LABEL[status]}
            cards={cards.filter((c) => c.status === status)}
            desatualizadoIds={desatualizadoIds}
            showProjeto={showProjeto}
            isQuickAdding={quickAddStatus === status}
            onOpenQuickAdd={() => setQuickAddStatus(status)}
            onCancelQuickAdd={() => setQuickAddStatus(null)}
            onQuickAdd={handleQuickAdd}
            teamMembers={teamMembers}
            fieldConfig={fieldConfig}
            collapsed={collapsedColumns.has(status)}
            showAll={showAllInColumn.has(status)}
            hasLimit={COLUMNS_WITH_LIMIT.has(status)}
            cardLimit={COLUMN_CARD_LIMIT}
            onToggleCollapse={
              onToggleCollapse && COLUMNS_WITH_LIMIT.has(status)
                ? () => onToggleCollapse(status)
                : undefined
            }
            onShowAll={onShowAll ? () => onShowAll(status) : undefined}
          />
        ))}
      </div>

      <DragOverlay>
        {activeCard ? (
          <div className="opacity-90 shadow-xl rounded-md border bg-card p-3 w-64 rotate-1">
            <KanbanCard card={activeCard} isOverlay showProjeto={showProjeto} teamMembers={[]} fieldConfig={fieldConfig} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
