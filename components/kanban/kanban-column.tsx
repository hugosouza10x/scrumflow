"use client";

import { useDroppable } from "@dnd-kit/core";
import { Plus, X, Loader2, Sparkles, ChevronDown, ChevronRight, Archive } from "lucide-react";
import { useRef, useState } from "react";
import { KanbanCard } from "./kanban-card";
import type { CardForKanban, TeamMember } from "./kanban-board";
import type { KanbanCardFields } from "./use-kanban-card-fields";

function getInitials(nome: string) {
  return nome.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

type KanbanColumnProps = {
  id: string;
  title: string;
  cards: CardForKanban[];
  desatualizadoIds: Set<string>;
  showProjeto?: boolean;
  isQuickAdding: boolean;
  onOpenQuickAdd: () => void;
  onCancelQuickAdd: () => void;
  onQuickAdd: (titulo: string, responsaveisIds?: string[], prioridade?: string) => Promise<void>;
  teamMembers: TeamMember[];
  fieldConfig?: KanbanCardFields;
  // Archive/limit props
  collapsed?: boolean;
  showAll?: boolean;
  hasLimit?: boolean;
  cardLimit?: number;
  onToggleCollapse?: () => void;
  onShowAll?: () => void;
};

const PRIORIDADES = ["BAIXA", "MEDIA", "ALTA", "URGENTE"] as const;
const PRIORIDADE_LABEL: Record<string, string> = {
  BAIXA: "Baixa",
  MEDIA: "Média",
  ALTA: "Alta",
  URGENTE: "Urgente",
};

export function KanbanColumn({
  id,
  title,
  cards,
  desatualizadoIds,
  showProjeto,
  isQuickAdding,
  onOpenQuickAdd,
  onCancelQuickAdd,
  onQuickAdd,
  teamMembers,
  fieldConfig,
  collapsed = false,
  showAll = false,
  hasLimit = false,
  cardLimit = 10,
  onToggleCollapse,
  onShowAll,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const [titulo, setTitulo] = useState("");
  const [responsaveisIds, setResponsaveisIds] = useState<string[]>([]);
  const [responsaveisDropdownOpen, setResponsaveisDropdownOpen] = useState(false);
  const [prioridade, setPrioridade] = useState("MEDIA");
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function toggleResponsavel(id: string) {
    setResponsaveisIds((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  }

  async function handleAiSuggest() {
    if (!titulo.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "suggest-title", prompt: titulo }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.titulo) setTitulo(data.titulo);
        if (data.prioridade) setPrioridade(data.prioridade);
      }
    } finally {
      setAiLoading(false);
    }
  }

  const handleOpen = () => {
    setTitulo("");
    setResponsaveisIds([]);
    setResponsaveisDropdownOpen(false);
    setPrioridade("MEDIA");
    onOpenQuickAdd();
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!titulo.trim()) return;
    setSaving(true);
    try {
      await onQuickAdd(titulo.trim(), responsaveisIds.length > 0 ? responsaveisIds : undefined, prioridade);
      setTitulo("");
      setResponsaveisIds([]);
      setPrioridade("MEDIA");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
    if (e.key === "Escape") onCancelQuickAdd();
  };

  // Determine which cards to show (limit for archive columns)
  const visibleCards = hasLimit && !showAll ? cards.slice(0, cardLimit) : cards;
  const hiddenCount = cards.length - visibleCards.length;

  // Archive column styling (CANCELADO / CONCLUIDO)
  const isArchiveColumn = hasLimit;

  return (
    <div
      ref={setNodeRef}
      className={[
        "flex-shrink-0 w-68 min-w-[272px] max-w-[272px] flex flex-col rounded-xl border transition-colors",
        isArchiveColumn ? "bg-muted/10 border-dashed" : "bg-muted/20",
        isOver ? "ring-2 ring-primary/50 bg-primary/5" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Header */}
      <div
        className={[
          "flex items-center justify-between px-3 py-2.5 border-b",
          onToggleCollapse ? "cursor-pointer hover:bg-muted/40 rounded-t-xl transition-colors" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={onToggleCollapse}
      >
        <div className="flex items-center gap-2">
          {onToggleCollapse && (
            collapsed
              ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          )}
          {isArchiveColumn && <Archive className="h-3 w-3 text-muted-foreground/60 flex-shrink-0" />}
          <h3 className={`font-semibold text-sm ${isArchiveColumn ? "text-muted-foreground" : ""}`}>{title}</h3>
          <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${
            isArchiveColumn ? "text-muted-foreground/70 bg-muted/50" : "text-muted-foreground bg-muted"
          }`}>
            {cards.length}
          </span>
        </div>
        {/* Only show quick-add button for non-archive non-collapsed columns */}
        {!isArchiveColumn && (
          <button
            onClick={(e) => { e.stopPropagation(); handleOpen(); }}
            title="Adicionar card"
            className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Content: hidden if collapsed */}
      {!collapsed && (
        <>
          {/* Quick add form */}
          {isQuickAdding && (
            <div className="px-2 pt-2">
              <form onSubmit={handleSubmit} className="rounded-lg border bg-card p-2.5 space-y-2 shadow-sm">
                <div className="flex items-center gap-1">
                  <input
                    ref={inputRef}
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Título do card..."
                    className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground min-w-0"
                    disabled={saving || aiLoading}
                  />
                  {titulo.trim() && (
                    <button
                      type="button"
                      onClick={handleAiSuggest}
                      disabled={aiLoading}
                      title="Refinar título com IA"
                      className="flex-shrink-0 text-violet-500 hover:text-violet-700 dark:text-violet-400 disabled:opacity-50 transition-colors"
                    >
                      {aiLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                    </button>
                  )}
                </div>
                <div className="space-y-1.5">
                  {/* Responsáveis chips */}
                  {responsaveisIds.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {responsaveisIds.map((rid) => {
                        const m = teamMembers.find((t) => t.id === rid);
                        if (!m) return null;
                        return (
                          <span key={rid} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                            <span className="h-3.5 w-3.5 rounded-full bg-primary/25 flex items-center justify-center text-[7px] font-bold shrink-0">
                              {getInitials(m.nome)}
                            </span>
                            {m.nome.split(" ")[0]}
                            <button type="button" onClick={() => toggleResponsavel(rid)} className="ml-0.5 hover:text-destructive transition-colors">
                              <X className="h-2 w-2" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex gap-1.5">
                    {/* Multi-select dropdown */}
                    <div className="relative flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => setResponsaveisDropdownOpen((v) => !v)}
                        disabled={saving}
                        className="w-full text-xs rounded border bg-background px-2 py-1 flex items-center justify-between text-muted-foreground"
                      >
                        <span>{responsaveisIds.length === 0 ? "Responsável..." : `${responsaveisIds.length} selecionado(s)`}</span>
                        <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
                      </button>
                      {responsaveisDropdownOpen && (
                        <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-md py-1 max-h-32 overflow-y-auto">
                          {teamMembers.map((m) => (
                            <label key={m.id} className="flex items-center gap-2 px-2 py-1 text-xs hover:bg-muted cursor-pointer">
                              <input
                                type="checkbox"
                                checked={responsaveisIds.includes(m.id)}
                                onChange={() => toggleResponsavel(m.id)}
                                className="h-3 w-3 rounded accent-primary"
                              />
                              <span className="h-4 w-4 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[8px] font-bold shrink-0">
                                {getInitials(m.nome)}
                              </span>
                              {m.nome}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                    <select
                      value={prioridade}
                      onChange={(e) => setPrioridade(e.target.value)}
                      className="text-xs rounded border bg-background px-2 py-1"
                      disabled={saving}
                    >
                      {PRIORIDADES.map((p) => (
                        <option key={p} value={p}>
                          {PRIORIDADE_LABEL[p]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 justify-end">
                  <button
                    type="button"
                    onClick={onCancelQuickAdd}
                    className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                    disabled={saving}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="submit"
                    disabled={!titulo.trim() || saving}
                    className="flex items-center gap-1 rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50 hover:opacity-90 transition-opacity"
                  >
                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                    Adicionar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Cards */}
          <div className="flex-1 space-y-2 p-2 min-h-[80px]">
            {visibleCards.map((card) => (
              <KanbanCard
                key={card.id}
                card={card}
                desatualizado={desatualizadoIds.has(card.id)}
                showProjeto={showProjeto}
                teamMembers={teamMembers}
                fieldConfig={fieldConfig}
              />
            ))}
          </div>

          {/* "Ver todos" footer — only shown when there are hidden cards */}
          {hiddenCount > 0 && onShowAll && (
            <button
              onClick={(e) => { e.stopPropagation(); onShowAll(); }}
              className="flex items-center justify-center gap-1.5 mx-2 mb-2 rounded-lg border border-dashed py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <ChevronDown className="h-3 w-3" />
              Ver {hiddenCount} {hiddenCount === 1 ? "card oculto" : "cards ocultos"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
