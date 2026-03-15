"use client";

import { useDraggable } from "@dnd-kit/core";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckSquare, Pencil, Zap, Layers, ShieldAlert, MoreVertical, Archive, Trash2, UserX, CalendarX, User } from "lucide-react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PrioridadeBadge } from "@/components/ui/status-badge";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { KanbanCardQuickEdit } from "./kanban-card-quick-edit";
import type { CardForKanban, ClienteInfo, TeamMember } from "./kanban-board";
import type { KanbanCardFields } from "./use-kanban-card-fields";

function ClienteBadge({ cliente }: { cliente: ClienteInfo }) {
  if (!cliente) return null;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border leading-tight"
      style={{
        borderColor: cliente.cor ?? "#94a3b8",
        color: cliente.cor ?? "#94a3b8",
        backgroundColor: cliente.cor ? `${cliente.cor}18` : undefined,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: cliente.cor ?? "#94a3b8" }}
      />
      {cliente.nome}
    </span>
  );
}

type KanbanCardProps = {
  card: CardForKanban;
  isOverlay?: boolean;
  desatualizado?: boolean;
  showProjeto?: boolean;
  teamMembers?: TeamMember[];
  fieldConfig?: KanbanCardFields;
};

function getInitials(nome: string) {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

// Default field config — everything visible except criacao and sprint
const DEFAULT_FIELDS: KanbanCardFields = {
  prazo: true,
  criacao: false,
  responsavel: true,
  prioridade: true,
  estimativa: true,
  subtarefas: true,
  projeto: true,
  cliente: true,
  epico: true,
  sprint: false,
};

export function KanbanCard({
  card,
  isOverlay,
  desatualizado,
  showProjeto,
  teamMembers = [],
  fieldConfig = DEFAULT_FIELDS,
}: KanbanCardProps) {
  const isDemanda = card.tipo === "demanda";
  const router = useRouter();

  const { attributes, listeners, setNodeRef } = useDraggable({
    id: card.id,
    data: { card },
  });

  const [quickEditOpen, setQuickEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const queryClient = useQueryClient();

  const arquivarCard = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ arquivado: true }),
      });
      if (!res.ok) throw new Error("Erro ao arquivar card");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Card arquivado.");
      queryClient.invalidateQueries({ queryKey: ["cards"] });
    },
    onError: () => toast.error("Erro ao arquivar card."),
  });

  const deleteCard = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/cards/${card.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir card");
      return res.json();
    },
    onSuccess: () => {
      setDeleteOpen(false);
      toast.success("Card excluído.");
      queryClient.invalidateQueries({ queryKey: ["cards"] });
    },
    onError: () => toast.error("Erro ao excluir card."),
  });

  const isOverdue =
    card.prazo && !["CONCLUIDO", "CANCELADO"].includes(card.status)
      ? new Date(card.prazo) < new Date()
      : false;

  const effectiveCliente = card.cliente ?? card.projeto?.cliente ?? null;

  const showClienteBadge = fieldConfig.cliente && !!effectiveCliente;
  const showProjetoBadge = fieldConfig.projeto && showProjeto;
  const showEpicoBadge = fieldConfig.epico && !!card.epico;
  const showTopRow = showClienteBadge || showProjetoBadge || showEpicoBadge;

  // Lista de responsáveis (join table tem prioridade, fallback para responsavel singular)
  const responsaveisLista: { id: string; nome: string }[] =
    card.responsaveis?.length
      ? card.responsaveis
      : card.responsavel
      ? [card.responsavel]
      : [];

  // Badge "Sem responsável" para cards em execução/homologação
  const isExecutionStatus = ["A_FAZER", "EM_ANDAMENTO", "EM_REVISAO", "HOMOLOGACAO"].includes(card.status);
  const missingResponsavel = !isDemanda && isExecutionStatus && responsaveisLista.length === 0;

  // Placeholder "Sem prazo" para cards em estágio ativo sem prazo definido
  const isActiveStatus = ["A_FAZER", "EM_ANDAMENTO", "EM_REVISAO", "BLOQUEADO", "HOMOLOGACAO"].includes(card.status);
  const missingPrazo = !isDemanda && isActiveStatus && !card.prazo && fieldConfig.prazo;

  // Subtarefas progress
  const totalSub = card._count?.subtarefas ?? 0;
  const concluidasSub = card._countConcluidas ?? 0;
  const subtarefasColor =
    totalSub > 0 && concluidasSub === totalSub
      ? "text-green-500"
      : concluidasSub > 0
      ? "text-amber-500"
      : "text-muted-foreground";

  return (
    <>
      <div
        ref={isDemanda ? undefined : setNodeRef}
        {...(!isOverlay && !isDemanda ? { ...listeners, ...attributes } : {})}
        onClick={() => {
          if (!isOverlay && !isDemanda) router.push(`/dashboard/cards/${card.id}`);
        }}
        className={[
          "group relative rounded-lg border bg-card p-3 text-sm shadow-sm hover:shadow-md transition-shadow space-y-2",
          !isDemanda ? "cursor-grab active:cursor-grabbing" : "cursor-default",
          desatualizado ? "border-amber-400/60 bg-amber-50/60 dark:bg-amber-950/20" : "",
          card.bloqueado ? "border-red-300/60" : "",
          isDemanda ? "border-violet-300/50 bg-violet-50/30 dark:bg-violet-950/10" : "",
          isOverlay ? "cursor-grabbing shadow-lg" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {/* Hover action bar — menu de ações (apenas cards) */}
        {!isOverlay && !isDemanda && (
          <div
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 z-10"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              className="h-6 w-6 rounded flex items-center justify-center bg-muted hover:bg-muted-foreground/20 text-muted-foreground hover:text-foreground"
              title="Edição rápida"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setQuickEditOpen(true);
              }}
            >
              <Pencil className="h-3 w-3" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="h-6 w-6 rounded flex items-center justify-center bg-muted hover:bg-muted-foreground/20 text-muted-foreground hover:text-foreground"
                  title="Mais ações"
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                >
                  <MoreVertical className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setQuickEditOpen(true); }}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); arquivarCard.mutate(); }}>
                  <Archive className="h-4 w-4 mr-2" />
                  Arquivar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); setDeleteOpen(true); }}
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Linha de contexto: cliente + projeto + épico */}
        {showTopRow && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {showClienteBadge && <ClienteBadge cliente={effectiveCliente} />}
            {showProjetoBadge && card.projeto && (
              <span className="inline-block text-[10px] font-medium bg-primary/10 text-primary rounded px-1.5 py-0.5 leading-tight">
                {card.projeto.nome}
              </span>
            )}
            {showProjetoBadge && !card.projeto && !isDemanda && (
              <span className="inline-block text-[10px] font-medium bg-muted text-muted-foreground rounded px-1.5 py-0.5 leading-tight">
                Avulsa
              </span>
            )}
            {showEpicoBadge && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 rounded px-1.5 py-0.5 leading-tight">
                <Layers className="h-2.5 w-2.5 flex-shrink-0" />
                {card.epico!.nome}
              </span>
            )}
          </div>
        )}

        {/* Título */}
        <div className={!isDemanda ? "pr-6" : ""}>
          <p className="font-medium line-clamp-2 leading-snug">{card.titulo}</p>
        </div>

        {/* Badges: prioridade + estimativa + status especiais */}
        <div className="flex items-center gap-1 flex-wrap">
          {isDemanda && (
            <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
              Demanda
            </span>
          )}
          {fieldConfig.prioridade && card.prioridade && (
            <PrioridadeBadge prioridade={card.prioridade} />
          )}
          {fieldConfig.estimativa && card.estimativa != null && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {card.estimativa} pts
            </span>
          )}
          {card.bloqueado && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-300 max-w-[140px]">
              <ShieldAlert className="h-3 w-3 shrink-0" />
              {card.bloqueadoPor ? (
                <span className="truncate" title={card.bloqueadoPor.titulo}>
                  {card.bloqueadoPor.titulo}
                </span>
              ) : (
                "Bloqueado"
              )}
            </span>
          )}
          {desatualizado && (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              Sem atualização
            </span>
          )}
          {fieldConfig.sprint && card.sprint && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              <Zap className="h-2.5 w-2.5" />
              {card.sprint.nome}
            </span>
          )}
        </div>

        {/* Footer: prazo + criação + subtarefas + responsável */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-2 text-xs flex-wrap">
            {fieldConfig.prazo && card.prazo && (
              <span
                className={`flex items-center gap-0.5 ${
                  isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"
                }`}
              >
                <CalendarDays className="h-3 w-3 shrink-0" />
                Prazo · {formatDate(card.prazo)}
              </span>
            )}
            {missingPrazo && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 border border-amber-200/70 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:bg-amber-950/20 dark:border-amber-900/50 dark:text-amber-400">
                <CalendarX className="h-3 w-3 shrink-0" />
                Sem prazo
              </span>
            )}
            {fieldConfig.criacao && card.createdAt && (
              <span className="flex items-center gap-0.5 text-muted-foreground/70 text-[10px]">
                Criado · {formatDate(card.createdAt)}
              </span>
            )}
            {fieldConfig.subtarefas && totalSub > 0 && (
              <span className={`flex items-center gap-0.5 ${subtarefasColor}`}>
                <CheckSquare className="h-3 w-3" />
                {concluidasSub}/{totalSub}
              </span>
            )}
          </div>

          {missingResponsavel && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              <UserX className="h-3 w-3" />
              Sem responsável
            </span>
          )}
          {fieldConfig.responsavel && responsaveisLista.length > 0 && (
            <div className="flex items-center gap-1.5">
              <User className="h-3 w-3 text-muted-foreground shrink-0" />
              <div className="flex flex-wrap gap-1">
                {responsaveisLista.map((r) => (
                  <span
                    key={r.id}
                    title={`Responsável: ${r.nome}`}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
                  >
                    <span className="h-4 w-4 rounded-full bg-primary/25 flex items-center justify-center text-[8px] font-bold shrink-0">
                      {getInitials(r.nome)}
                    </span>
                    {r.nome.split(" ")[0]}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Edit Dialog — apenas para cards normais */}
      {!isOverlay && !isDemanda && (
        <KanbanCardQuickEdit
          card={card}
          teamMembers={teamMembers}
          open={quickEditOpen}
          onOpenChange={setQuickEditOpen}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {!isOverlay && !isDemanda && (
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Excluir card</DialogTitle>
              <DialogDescription>
                Esta ação não pode ser desfeita. O card será removido permanentemente do sistema, incluindo subtarefas, comentários e histórico.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
              <p className="text-sm font-medium">{card.titulo}</p>
              {card.projeto && (
                <p className="text-xs text-muted-foreground mt-0.5">{card.projeto.nome}</p>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
              <Button
                variant="destructive"
                disabled={deleteCard.isPending}
                onClick={() => deleteCard.mutate()}
              >
                {deleteCard.isPending ? "Excluindo…" : "Excluir card"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
