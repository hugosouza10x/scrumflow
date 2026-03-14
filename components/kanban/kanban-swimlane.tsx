"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { CARD_STATUS_LABEL } from "@/types";
import type { CardForKanban, TeamMember } from "./kanban-board";
import type { KanbanCardFields } from "./use-kanban-card-fields";

// Status buckets for the swimlane view
const SWIMLANE_BUCKETS = [
  {
    key: "pendente",
    label: "Pendente",
    statuses: ["BACKLOG", "PRONTO_PARA_SPRINT", "A_FAZER"],
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-900/20",
    border: "border-slate-200 dark:border-slate-700",
  },
  {
    key: "progresso",
    label: "Em Progresso",
    statuses: ["EM_ANDAMENTO", "EM_REVISAO", "HOMOLOGACAO"],
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-200 dark:border-blue-700",
  },
  {
    key: "bloqueado",
    label: "Bloqueado",
    statuses: ["BLOQUEADO"],
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-200 dark:border-red-700",
  },
  {
    key: "concluido",
    label: "Concluído",
    statuses: ["CONCLUIDO"],
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-900/20",
    border: "border-green-200 dark:border-green-700",
    limit: 5,
  },
] as const;

// Maps each bucket key to the target status when a card is dropped there
const BUCKET_TARGET_STATUS: Record<string, string> = {
  pendente: "A_FAZER",
  progresso: "EM_ANDAMENTO",
  bloqueado: "BLOQUEADO",
  concluido: "CONCLUIDO",
};

const PRIORIDADE_DOT: Record<string, string> = {
  BAIXA: "bg-slate-400",
  MEDIA: "bg-blue-500",
  ALTA: "bg-orange-500",
  URGENTE: "bg-red-600",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function isOverdue(prazo: string) {
  return new Date(prazo) < new Date();
}

/** Compact card chip for the swimlane view */
function CardChip({ card }: { card: CardForKanban }) {
  const overdue = card.prazo && isOverdue(card.prazo);
  const statusLabel = CARD_STATUS_LABEL[card.status as keyof typeof CARD_STATUS_LABEL] ?? card.status;

  return (
    <Link
      href={`/dashboard/cards/${card.id}`}
      className={[
        "group flex items-start gap-2 rounded-lg border px-2.5 py-2 text-sm bg-background hover:shadow-sm transition-all",
        card.bloqueado ? "border-red-200 dark:border-red-800/50" : "border-border",
        card.tipo === "demanda" ? "border-violet-200 dark:border-violet-800/50" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Priority dot */}
      {card.prioridade && (
        <span
          className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${
            PRIORIDADE_DOT[card.prioridade] ?? "bg-muted-foreground"
          }`}
          title={card.prioridade}
        />
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {card.titulo}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-[10px] text-muted-foreground">{statusLabel}</span>
          {card.prazo && (
            <span
              className={`text-[10px] font-medium ${
                overdue ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
              }`}
            >
              {overdue ? "⚠ " : ""}
              {formatDate(card.prazo)}
            </span>
          )}
          {card.bloqueado && (
            <span className="text-[10px] font-medium text-red-600 dark:text-red-400">
              Bloqueado
            </span>
          )}
          {card.tipo === "demanda" && (
            <span className="text-[10px] font-medium text-violet-600 dark:text-violet-400">
              Demanda
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/** Draggable wrapper for CardChip */
function DraggableCardChip({ card }: { card: CardForKanban }) {
  const isDemanda = card.tipo === "demanda";
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.id,
    disabled: isDemanda,
    data: { card },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        opacity: isDragging ? 0.3 : 1,
        cursor: isDemanda ? "default" : "grab",
      }}
    >
      <CardChip card={card} />
    </div>
  );
}

/** Droppable bucket column */
function DroppableBucket({
  bucketKey,
  className,
  children,
}: {
  bucketKey: string;
  className: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: bucketKey });
  return (
    <div
      ref={setNodeRef}
      className={[
        className,
        isOver ? "ring-2 ring-inset ring-primary/40" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}

/** One swimlane row for a team member */
function SwimlaneRow({
  label,
  avatarInitials,
  cards,
  isHighlighted,
}: {
  label: string;
  avatarInitials?: string;
  cards: CardForKanban[];
  isHighlighted?: boolean;
}) {
  return (
    <div
      className={[
        "flex gap-0 rounded-xl border overflow-hidden",
        isHighlighted ? "ring-2 ring-primary/30" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Row header */}
      <div className="w-40 flex-shrink-0 flex flex-col items-center justify-start gap-2 px-3 py-4 bg-muted/20 border-r">
        {avatarInitials ? (
          <div className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-bold">
            {avatarInitials}
          </div>
        ) : (
          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground font-medium">
            —
          </div>
        )}
        <p className="text-xs font-semibold text-center leading-tight break-words w-full text-center">
          {label}
        </p>
        <span className="text-[10px] text-muted-foreground">
          {cards.length} {cards.length === 1 ? "card" : "cards"}
        </span>
      </div>

      {/* Buckets */}
      <div className="flex flex-1 min-w-0 divide-x">
        {SWIMLANE_BUCKETS.map((bucket) => {
          const bucketCards = cards.filter((c) => bucket.statuses.includes(c.status as never));
          const limit = "limit" in bucket ? bucket.limit : undefined;
          const visible = limit ? bucketCards.slice(0, limit) : bucketCards;
          const hidden = bucketCards.length - visible.length;

          return (
            <DroppableBucket
              key={bucket.key}
              bucketKey={bucket.key}
              className={`flex-1 min-w-0 min-h-[80px] p-2 space-y-1.5 ${bucket.bg}`}
            >
              {visible.map((card) => (
                <DraggableCardChip key={card.id} card={card} />
              ))}
              {hidden > 0 && (
                <p className="text-[10px] text-center text-muted-foreground py-1">
                  +{hidden} concluídos
                </p>
              )}
              {visible.length === 0 && (
                <p className="text-[11px] text-muted-foreground/50 text-center pt-4">
                  —
                </p>
              )}
            </DroppableBucket>
          );
        })}
      </div>
    </div>
  );
}

type KanbanSwimlaneProps = {
  cards: CardForKanban[];
  teamMembers: TeamMember[];
  fieldConfig?: KanbanCardFields;
  onStatusChange?: (cardId: string, newStatus: string) => Promise<void>;
};

export function KanbanSwimlane({ cards, teamMembers, onStatusChange }: KanbanSwimlaneProps) {
  const [activeCard, setActiveCard] = useState<CardForKanban | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function handleDragStart(event: DragStartEvent) {
    const card = cards.find((c) => c.id === event.active.id);
    setActiveCard(card ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveCard(null);
    const { active, over } = event;
    if (!over || !onStatusChange) return;

    const bucketKey = over.id as string;
    const targetStatus = BUCKET_TARGET_STATUS[bucketKey];
    if (!targetStatus) return;

    const card = cards.find((c) => c.id === active.id);
    if (!card) return;

    // Skip if card is already in this bucket
    const currentBucket = SWIMLANE_BUCKETS.find((b) =>
      b.statuses.includes(card.status as never)
    );
    if (currentBucket?.key === bucketKey) return;

    onStatusChange(card.id, targetStatus);
  }

  // Group cards by responsavelId
  const byMember = useMemo(() => {
    const map = new Map<string, CardForKanban[]>();
    for (const card of cards) {
      const key = card.responsavel?.id ?? "__sem_responsavel__";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(card);
    }
    return map;
  }, [cards]);

  // Build ordered member list: team members with cards first, then members without, then unassigned
  const rows = useMemo(() => {
    const result: Array<{
      id: string;
      label: string;
      initials?: string;
      cards: CardForKanban[];
    }> = [];

    // Ordered by teamMembers list to keep consistent order
    for (const member of teamMembers) {
      const memberCards = byMember.get(member.id) ?? [];
      result.push({
        id: member.id,
        label: member.nome,
        initials: member.nome
          .split(" ")
          .slice(0, 2)
          .map((n) => n[0])
          .join("")
          .toUpperCase(),
        cards: memberCards,
      });
    }

    // Cards without known team member (edge case)
    const knownMemberIds = new Set(teamMembers.map((m) => m.id));
    const unassigned: CardForKanban[] = [];
    Array.from(byMember.entries()).forEach(([key, memberCards]) => {
      if (key !== "__sem_responsavel__" && !knownMemberIds.has(key)) {
        unassigned.push(...memberCards);
      }
    });
    const noResponsavel = byMember.get("__sem_responsavel__") ?? [];
    const allUnassigned = [...noResponsavel, ...unassigned];

    if (allUnassigned.length > 0) {
      result.push({
        id: "__sem_responsavel__",
        label: "Sem responsável",
        cards: allUnassigned,
      });
    }

    return result;
  }, [teamMembers, byMember]);

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-3 pb-4">
        {/* Bucket header row */}
        <div className="flex gap-0 rounded-xl border overflow-hidden bg-muted/5">
          <div className="w-40 flex-shrink-0 border-r px-3 py-2 flex items-center">
            <span className="text-xs font-semibold text-muted-foreground">Responsável</span>
          </div>
          <div className="flex flex-1 divide-x">
            {SWIMLANE_BUCKETS.map((bucket) => (
              <div
                key={bucket.key}
                className={`flex-1 px-3 py-2 ${bucket.bg}`}
              >
                <span className={`text-xs font-semibold ${bucket.color}`}>
                  {bucket.label}
                </span>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {bucket.statuses.map((s) => CARD_STATUS_LABEL[s as keyof typeof CARD_STATUS_LABEL] ?? s).join(", ")}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Member rows */}
        {rows.map((row) => (
          <SwimlaneRow
            key={row.id}
            label={row.label}
            avatarInitials={row.initials}
            cards={row.cards}
          />
        ))}

        {rows.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            <p className="text-sm">Nenhum card encontrado</p>
            <p className="text-xs mt-1">Ajuste os filtros para ver os cards da equipe</p>
          </div>
        )}
      </div>

      {/* Drag overlay — ghost card while dragging */}
      <DragOverlay>
        {activeCard && (
          <div className="opacity-80 rotate-1 shadow-xl w-48">
            <CardChip card={activeCard} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
