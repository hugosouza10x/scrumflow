"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { KanbanBoard, COLUMNS_COLLAPSED_BY_DEFAULT, type CardForKanban, type TeamMember } from "@/components/kanban/kanban-board";
import { KanbanSwimlane } from "@/components/kanban/kanban-swimlane";
import { KanbanTeamPanel } from "@/components/kanban/kanban-team-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Columns3, ChevronDown, Check, X, User, SlidersHorizontal, Settings2, LayoutList, Users } from "lucide-react";
import { CARD_STATUS_LABEL } from "@/types";
import type { CardStatus } from "@/types";
import { useKanbanCardFields, FIELD_LABELS, type KanbanCardFields } from "@/components/kanban/use-kanban-card-fields";

type Cliente = { id: string; nome: string; cor: string | null };
type Projeto = { id: string; nome: string };

type DemandaGeral = {
  id: string;
  titulo: string;
  statusRefinamento: string;
  prioridade: string;
  responsavel?: { id: string; nome: string } | null;
  createdAt: string;
};

const KANBAN_COLUMNS: CardStatus[] = [
  "BACKLOG", "PRONTO_PARA_SPRINT", "A_FAZER", "EM_ANDAMENTO",
  "EM_REVISAO", "BLOQUEADO", "HOMOLOGACAO", "CONCLUIDO", "CANCELADO",
];

const DEMANDA_STATUS_MAP: Record<string, string> = {
  NAO_REFINADO: "BACKLOG",
  EM_REFINAMENTO: "BACKLOG",
  PRONTO_PARA_SPRINT: "PRONTO_PARA_SPRINT",
};

const PRIORIDADES = ["BAIXA", "MEDIA", "ALTA", "URGENTE"] as const;
const PRIORIDADE_LABEL: Record<string, string> = {
  BAIXA: "Baixa", MEDIA: "Média", ALTA: "Alta", URGENTE: "Urgente",
};

function KanbanSkeleton() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {KANBAN_COLUMNS.map((col) => (
        <div key={col} className="flex-shrink-0 w-[272px] rounded-xl border bg-muted/20 p-3">
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-5" />
          </div>
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- Field config menu ----
function KanbanFieldsMenu({
  fields,
  toggle,
}: {
  fields: KanbanCardFields;
  toggle: (f: keyof KanbanCardFields) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const enabledCount = Object.values(fields).filter(Boolean).length;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
          open ? "bg-muted border-primary/40" : "bg-background hover:bg-muted"
        }`}
        title="Personalizar campos do card"
      >
        <Settings2 className="h-3.5 w-3.5" />
        Campos
        <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/15 px-1 text-[10px] font-bold text-primary">
          {enabledCount}
        </span>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 z-30 w-52 rounded-xl border bg-background shadow-lg py-2 px-1">
          <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Campos do card
          </p>
          {(Object.entries(FIELD_LABELS) as [keyof KanbanCardFields, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => toggle(key)}
              className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-muted transition-colors rounded-md"
            >
              <span
                className={`h-4 w-4 rounded flex items-center justify-center border transition-colors flex-shrink-0 ${
                  fields[key] ? "bg-primary border-primary" : "border-muted-foreground/30"
                }`}
              >
                {fields[key] && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
              </span>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Multi-project selector ----
function MultiProjectSelector({
  projetos,
  selectedIds,
  includeAvulsas,
  onChange,
  onToggleAvulsas,
}: {
  projetos: Projeto[];
  selectedIds: string[];
  includeAvulsas: boolean;
  onChange: (ids: string[]) => void;
  onToggleAvulsas: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const allSelected = selectedIds.length === 0 && !includeAvulsas;
  const label = allSelected
    ? "Todos os projetos"
    : includeAvulsas && selectedIds.length === 0
    ? "Tarefas avulsas"
    : selectedIds.length === 1
    ? projetos.find((p) => p.id === selectedIds[0])?.nome ?? "1 projeto"
    : `${selectedIds.length} projetos`;

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    onChange([]);
    if (includeAvulsas) onToggleAvulsas();
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
      >
        <span>{label}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-20 w-56 rounded-xl border bg-background shadow-lg py-1">
          {/* Todos */}
          <button
            onClick={selectAll}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors"
          >
            <span
              className={`h-4 w-4 rounded flex items-center justify-center border transition-colors ${
                allSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
              }`}
            >
              {allSelected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
            </span>
            <span className="font-medium">Todos os projetos</span>
          </button>

          <div className="my-1 border-t" />

          {projetos.map((p) => (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              <span
                className={`h-4 w-4 rounded flex items-center justify-center border transition-colors ${
                  selectedIds.includes(p.id) ? "bg-primary border-primary" : "border-muted-foreground/30"
                }`}
              >
                {selectedIds.includes(p.id) && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
              </span>
              <span className="truncate">{p.nome}</span>
            </button>
          ))}

          <div className="my-1 border-t" />

          {/* Avulsas (inclui demandas gerais) */}
          <button
            onClick={onToggleAvulsas}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors"
          >
            <span
              className={`h-4 w-4 rounded flex items-center justify-center border transition-colors ${
                includeAvulsas ? "bg-primary border-primary" : "border-muted-foreground/30"
              }`}
            >
              {includeAvulsas && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
            </span>
            <span className="text-muted-foreground">Avulsas + Demandas gerais</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ---- Main component ----
export function KanbanPageClient({
  projetos,
  sessionUserId,
}: {
  projetos: Projeto[];
  sessionUserId: string;
}) {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const { fields: fieldConfig, toggle: toggleField } = useKanbanCardFields();

  // Filtros
  const [selectedProjetoIds, setSelectedProjetoIds] = useState<string[]>([]);
  const [includeAvulsas, setIncludeAvulsas] = useState(false);
  const [filtroClienteId, setFiltroClienteId] = useState("");
  const [filtroResponsavelId, setFiltroResponsavelId] = useState(() => searchParams.get("responsavelId") ?? "");
  const [filtroPrioridade, setFiltroPrioridade] = useState("");
  const [minhasTarefas, setMinhasTarefas] = useState(false);

  // Layout: columns vs swimlane
  const [viewMode, setViewMode] = useState<"columns" | "swimlane">("columns");

  // Team panel
  const [showTeamPanel, setShowTeamPanel] = useState(false);

  // Column archive state
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(
    () => new Set(COLUMNS_COLLAPSED_BY_DEFAULT)
  );
  const [showAllInColumn, setShowAllInColumn] = useState<Set<string>>(new Set());

  const handleToggleCollapse = useCallback((columnId: string) => {
    setCollapsedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(columnId)) next.delete(columnId);
      else next.add(columnId);
      return next;
    });
  }, []);

  const handleShowAll = useCallback((columnId: string) => {
    setShowAllInColumn((prev) => new Set(Array.from(prev).concat(columnId)));
  }, []);

  const queryKey = useMemo(
    () => ["cards", "kanban", selectedProjetoIds.join(","), includeAvulsas ? "avulsas" : "", filtroClienteId],
    [selectedProjetoIds, includeAvulsas, filtroClienteId]
  );

  const cardsUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedProjetoIds.length > 0) params.set("projetoIds", selectedProjetoIds.join(","));
    if (includeAvulsas) params.set("avulsas", "true");
    if (filtroClienteId) params.set("clienteId", filtroClienteId);
    const qs = params.toString();
    return qs ? `/api/cards?${qs}` : "/api/cards";
  }, [selectedProjetoIds, includeAvulsas, filtroClienteId]);

  const { data: clientes = [] } = useQuery<Cliente[]>({
    queryKey: ["clientes"],
    queryFn: async () => {
      const res = await fetch("/api/clientes");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: allCards = [], isLoading: cardsLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await fetch(cardsUrl);
      if (!res.ok) throw new Error("Erro ao carregar cards");
      return res.json();
    },
    placeholderData: (prev) => prev,
  });

  // Demandas gerais (sem projeto) — só carrega quando avulsas está ativo
  const { data: demandasGerais = [] } = useQuery<DemandaGeral[]>({
    queryKey: ["demandas", "geral", "kanban"],
    queryFn: async () => {
      const res = await fetch("/api/demandas?geral=true");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: includeAvulsas,
    staleTime: 60 * 1000,
  });

  // Mapeia demandas para o formato CardForKanban
  const demandaCards: CardForKanban[] = useMemo(() => {
    if (!includeAvulsas) return [];
    return (demandasGerais as DemandaGeral[]).map((d) => ({
      id: `demanda-${d.id}`,
      titulo: d.titulo,
      status: DEMANDA_STATUS_MAP[d.statusRefinamento] ?? "BACKLOG",
      prioridade: d.prioridade,
      responsavel: d.responsavel ?? undefined,
      bloqueado: false,
      createdAt: d.createdAt,
      tipo: "demanda" as const,
    }));
  }, [demandasGerais, includeAvulsas]);

  const { data: teamMembers = [] } = useQuery<TeamMember[]>({
    queryKey: ["team"],
    queryFn: async () => {
      const res = await fetch("/api/team");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Filtro client-side — combina cards normais + demandas
  const cards: CardForKanban[] = useMemo(() => {
    let result: CardForKanban[] = [...(allCards as CardForKanban[]), ...demandaCards];
    if (minhasTarefas) {
      result = result.filter((c) => c.responsavel?.id === sessionUserId);
    } else if (filtroResponsavelId) {
      result = result.filter((c) => c.responsavel?.id === filtroResponsavelId);
    }
    if (filtroPrioridade) {
      result = result.filter((c) => c.prioridade === filtroPrioridade);
    }
    return result;
  }, [allCards, demandaCards, minhasTarefas, filtroResponsavelId, filtroPrioridade, sessionUserId]);

  const doisDiasAtras = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    return d.getTime();
  }, []);

  const desatualizadoIds = useMemo(() => {
    const set = new Set<string>();
    (allCards as CardForKanban[]).forEach((c) => {
      if (!c.ultimaAtualizacao) { set.add(c.id); return; }
      const t = new Date(c.ultimaAtualizacao).getTime();
      if (t < doisDiasAtras && !["CONCLUIDO", "CANCELADO"].includes(c.status)) set.add(c.id);
    });
    return set;
  }, [allCards, doisDiasAtras]);

  const updateStatus = useMutation({
    mutationFn: async ({ cardId, status }: { cardId: string; status: string }) => {
      const res = await fetch(`/api/cards/${cardId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar status");
      return res.json();
    },
    onMutate: async ({ cardId, status }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<CardForKanban[]>(queryKey);
      queryClient.setQueryData<CardForKanban[]>(queryKey, (old = []) =>
        old.map((c) => (c.id === cardId ? { ...c, status } : c))
      );
      return { previous };
    },
    onSuccess: (_data, { status }) => {
      toast.success(`Card movido para ${CARD_STATUS_LABEL[status as CardStatus] ?? status}`);
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      toast.error("Não foi possível mover o card. Tente novamente.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const createCard = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Erro ao criar card");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Card criado com sucesso!");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erro ao criar card"),
  });

  const handleStatusChange = async (cardId: string, newStatus: string) => {
    const card = (allCards as CardForKanban[]).find((c) => c.id === cardId);
    const needsAutoAssign =
      ["A_FAZER", "EM_ANDAMENTO"].includes(newStatus) &&
      card != null &&
      !card.responsaveis?.length &&
      !card.responsavel;

    if (needsAutoAssign) {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<CardForKanban[]>(queryKey);
      queryClient.setQueryData<CardForKanban[]>(queryKey, (old = []) =>
        old.map((c) => (c.id === cardId ? { ...c, status: newStatus } : c))
      );
      try {
        await fetch(`/api/cards/${cardId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus, responsaveisIds: [sessionUserId] }),
        });
        toast.success(`Card movido para ${CARD_STATUS_LABEL[newStatus as CardStatus] ?? newStatus}`);
      } catch {
        if (previous) queryClient.setQueryData(queryKey, previous);
        toast.error("Não foi possível mover o card. Tente novamente.");
      } finally {
        queryClient.invalidateQueries({ queryKey });
      }
    } else {
      await updateStatus.mutateAsync({ cardId, status: newStatus });
    }
  };

  const handleQuickAdd = async (
    status: CardStatus,
    titulo: string,
    responsaveisIds?: string[],
    prioridade?: string
  ) => {
    const projetoId =
      selectedProjetoIds.length === 1
        ? selectedProjetoIds[0]
        : selectedProjetoIds.length === 0 && !includeAvulsas && projetos.length > 0
        ? projetos[0].id
        : undefined;

    await createCard.mutateAsync({
      titulo,
      status,
      projetoId,
      responsaveisIds: responsaveisIds?.length ? responsaveisIds : undefined,
      prioridade: prioridade || "MEDIA",
    });
  };

  const hasActiveFilters =
    filtroResponsavelId || filtroPrioridade || minhasTarefas || filtroClienteId;

  const clearFilters = () => {
    setFiltroResponsavelId("");
    setFiltroPrioridade("");
    setMinhasTarefas(false);
    setFiltroClienteId("");
  };

  const showProjeto = selectedProjetoIds.length !== 1 || includeAvulsas;
  const totalAll = (allCards as CardForKanban[]).length + demandaCards.length;

  if (projetos.length === 0 && !includeAvulsas) {
    return (
      <EmptyState
        icon={Columns3}
        title="Nenhum projeto disponível"
        description="Crie um projeto ou use tarefas avulsas para membros da equipe."
        action={{ label: "Criar projeto", href: "/dashboard/projetos/novo" }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Barra de filtros — 2 linhas para não estourar em telas menores */}
      <div className="space-y-2">
        {/* Linha 1: Filtros (wrappable) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Seletor de projetos */}
          <MultiProjectSelector
            projetos={projetos}
            selectedIds={selectedProjetoIds}
            includeAvulsas={includeAvulsas}
            onChange={setSelectedProjetoIds}
            onToggleAvulsas={() => setIncludeAvulsas((v) => !v)}
          />

          {/* Filtro por cliente */}
          {clientes.length > 0 && (
            <select
              value={filtroClienteId}
              onChange={(e) => setFiltroClienteId(e.target.value)}
              className="rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="">Todos os clientes</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          )}

          <div className="w-px h-6 bg-border" />

          {/* Minhas tarefas */}
          <button
            onClick={() => {
              setMinhasTarefas((v) => !v);
              if (!minhasTarefas) setFiltroResponsavelId("");
            }}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              minhasTarefas
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-muted"
            }`}
          >
            <User className="h-3.5 w-3.5" />
            Minhas tarefas
          </button>

          {/* Responsável */}
          {!minhasTarefas && (
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={filtroResponsavelId}
                onChange={(e) => setFiltroResponsavelId(e.target.value)}
                className="rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <option value="">Todos os responsáveis</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Prioridade */}
          <select
            value={filtroPrioridade}
            onChange={(e) => setFiltroPrioridade(e.target.value)}
            className="rounded-lg border bg-background px-3 py-2 text-sm"
          >
            <option value="">Todas as prioridades</option>
            {PRIORIDADES.map((p) => (
              <option key={p} value={p}>
                {PRIORIDADE_LABEL[p]}
              </option>
            ))}
          </select>

          {/* Limpar filtros */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Limpar filtros
            </button>
          )}
        </div>

        {/* Linha 2: Contador + controles de visualização */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">
            {cards.length !== totalAll
              ? `${cards.length} de ${totalAll} cards`
              : `${totalAll} cards`}
          </span>

          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <div className="flex items-center rounded-lg border overflow-hidden">
              <button
                onClick={() => setViewMode("columns")}
                title="Visão de colunas"
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                  viewMode === "columns" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
                }`}
              >
                <Columns3 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode("swimlane")}
                title="Visão por responsável"
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-l ${
                  viewMode === "swimlane" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
                }`}
              >
                <LayoutList className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Equipe panel toggle */}
            <button
              onClick={() => setShowTeamPanel((v) => !v)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                showTeamPanel ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
              }`}
              title="Carga da equipe"
            >
              <Users className="h-3.5 w-3.5" />
              Equipe
            </button>

            {/* Campos do card */}
            <KanbanFieldsMenu fields={fieldConfig} toggle={toggleField} />
          </div>
        </div>
      </div>

      <div className="flex gap-4 min-h-0">
        {/* Board / Swimlane */}
        <div className="flex-1 min-w-0">
          {cardsLoading ? (
            <KanbanSkeleton />
          ) : viewMode === "swimlane" ? (
            <KanbanSwimlane
              cards={cards}
              teamMembers={teamMembers}
              fieldConfig={fieldConfig}
              onStatusChange={handleStatusChange}
            />
          ) : (
            <KanbanBoard
              cards={cards}
              onStatusChange={handleStatusChange}
              onQuickAdd={handleQuickAdd}
              desatualizadoIds={desatualizadoIds}
              showProjeto={showProjeto}
              teamMembers={teamMembers}
              fieldConfig={fieldConfig}
              collapsedColumns={collapsedColumns}
              showAllInColumn={showAllInColumn}
              onToggleCollapse={handleToggleCollapse}
              onShowAll={handleShowAll}
            />
          )}
        </div>

        {/* Team panel sidebar */}
        {showTeamPanel && (
          <KanbanTeamPanel
            onSelectResponsavel={(id) => {
              setFiltroResponsavelId(id);
              setMinhasTarefas(false);
            }}
            selectedResponsavelId={filtroResponsavelId}
            onClose={() => setShowTeamPanel(false)}
          />
        )}
      </div>
    </div>
  );
}
