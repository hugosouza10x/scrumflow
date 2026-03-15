"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ExternalLink, X, CalendarDays, ChevronDown, UserCircle2 } from "lucide-react";
import Link from "next/link";
import type { CardForKanban, TeamMember } from "./kanban-board";

// ── Priority chips ──────────────────────────────────────────────────────────

const PRIORIDADE_CHIPS = [
  {
    value: "BAIXA",
    label: "Baixa",
    idle: "bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-400",
    active: "bg-slate-500 text-white border-slate-500 font-semibold",
    dot: "bg-slate-400",
  },
  {
    value: "MEDIA",
    label: "Média",
    idle: "bg-blue-50 text-blue-500 border-blue-200 hover:border-blue-400",
    active: "bg-blue-500 text-white border-blue-500 font-semibold",
    dot: "bg-blue-500",
  },
  {
    value: "ALTA",
    label: "Alta",
    idle: "bg-orange-50 text-orange-500 border-orange-200 hover:border-orange-400",
    active: "bg-orange-500 text-white border-orange-500 font-semibold",
    dot: "bg-orange-500",
  },
  {
    value: "URGENTE",
    label: "Urgente",
    idle: "bg-red-50 text-red-500 border-red-200 hover:border-red-400",
    active: "bg-red-500 text-white border-red-500 font-semibold",
    dot: "bg-red-500",
  },
] as const;

function getInitials(nome: string) {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

// ── Types ────────────────────────────────────────────────────────────────────

type QuickEditForm = {
  titulo: string;
  responsaveisIds: string[];
  prioridade: string;
  prazo: string;
};

function formFromCard(card: CardForKanban): QuickEditForm {
  const ids =
    card.responsaveis?.map((r) => r.id) ??
    (card.responsavel ? [card.responsavel.id] : []);
  return {
    titulo: card.titulo,
    responsaveisIds: ids,
    prioridade: card.prioridade ?? "MEDIA",
    prazo: card.prazo ? card.prazo.toString().slice(0, 10) : "",
  };
}

type Props = {
  card: CardForKanban;
  teamMembers: TeamMember[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

// ── Component ────────────────────────────────────────────────────────────────

export function KanbanCardQuickEdit({
  card,
  teamMembers,
  open,
  onOpenChange,
}: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<QuickEditForm>(() => formFromCard(card));
  const [saving, setSaving] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setForm(formFromCard(card));
      setDropdownOpen(false);
    }
  }, [open, card]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  function toggleResponsavel(id: string) {
    setForm((f) => ({
      ...f,
      responsaveisIds: f.responsaveisIds.includes(id)
        ? f.responsaveisIds.filter((r) => r !== id)
        : [...f.responsaveisIds, id],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titulo.trim()) {
      toast.error("O título não pode estar vazio.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: form.titulo.trim(),
          responsaveisIds: form.responsaveisIds,
          prioridade: form.prioridade,
          prazo: form.prazo || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Erro ao salvar");
      }
      queryClient.invalidateQueries({ queryKey: ["cards", "kanban"] });
      toast.success("Card atualizado!");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar card.");
    } finally {
      setSaving(false);
    }
  }

  const selectedMembers = teamMembers.filter((m) =>
    form.responsaveisIds.includes(m.id)
  );
  const unselectedMembers = teamMembers.filter(
    (m) => !form.responsaveisIds.includes(m.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-4 pt-4 pb-3 border-b">
          <DialogTitle className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
            Edição rápida
          </DialogTitle>
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
            {card.titulo}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-4 py-3 space-y-4">
          {/* ── Título ── */}
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Título
            </Label>
            <Input
              value={form.titulo}
              onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
              required
              className="h-8 text-sm"
              autoFocus
            />
          </div>

          {/* ── Prioridade — chips coloridos ── */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Prioridade
            </Label>
            <div className="flex gap-1.5 flex-wrap">
              {PRIORIDADE_CHIPS.map((chip) => {
                const isActive = form.prioridade === chip.value;
                return (
                  <button
                    key={chip.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, prioridade: chip.value }))}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] transition-all ${
                      isActive ? chip.active : chip.idle
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                        isActive ? "bg-current opacity-80" : chip.dot
                      }`}
                    />
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Prazo ── */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Prazo
            </Label>
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="date"
                  value={form.prazo}
                  onChange={(e) => setForm((f) => ({ ...f, prazo: e.target.value }))}
                  className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              {form.prazo && (
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, prazo: "" }))}
                  className="flex-shrink-0 h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Limpar prazo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* ── Responsáveis ── */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Responsáveis
            </Label>

            {/* Chips dos selecionados */}
            {selectedMembers.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1">
                {selectedMembers.map((m) => (
                  <span
                    key={m.id}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-medium text-primary"
                  >
                    <span className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-bold shrink-0">
                      {getInitials(m.nome)}
                    </span>
                    {m.nome.split(" ")[0]}
                    <button
                      type="button"
                      onClick={() => toggleResponsavel(m.id)}
                      className="ml-0.5 opacity-60 hover:opacity-100 hover:text-destructive transition-colors"
                      aria-label={`Remover ${m.nome}`}
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Dropdown adicionar */}
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen((v) => !v)}
                className="w-full h-8 rounded-md border border-input bg-background px-2.5 text-xs flex items-center gap-2 hover:bg-muted transition-colors"
              >
                <UserCircle2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground flex-1 text-left">
                  {selectedMembers.length === 0
                    ? "Adicionar responsável…"
                    : unselectedMembers.length > 0
                    ? "Adicionar mais…"
                    : "Todos adicionados"}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
                    dropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {dropdownOpen && teamMembers.length > 0 && (
                <div className="absolute z-50 top-full mt-1 w-full bg-popover border rounded-lg shadow-lg py-1 max-h-44 overflow-y-auto">
                  {teamMembers.map((m) => {
                    const checked = form.responsaveisIds.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleResponsavel(m.id)}
                        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left"
                      >
                        <span
                          className={`h-4 w-4 rounded flex items-center justify-center border transition-colors flex-shrink-0 ${
                            checked
                              ? "bg-primary border-primary"
                              : "border-muted-foreground/30"
                          }`}
                        >
                          {checked && (
                            <svg
                              className="h-2.5 w-2.5 text-primary-foreground"
                              fill="none"
                              viewBox="0 0 12 12"
                            >
                              <path
                                d="M2 6l3 3 5-5"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </span>
                        <span className="h-5 w-5 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[9px] font-bold shrink-0">
                          {getInitials(m.nome)}
                        </span>
                        <span className="truncate">{m.nome}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              type="submit"
              size="sm"
              disabled={saving}
              className="flex-1"
            >
              {saving ? "Salvando…" : "Salvar alterações"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
          </div>
        </form>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t bg-muted/30">
          <Link
            href={`/dashboard/cards/${card.id}`}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => onOpenChange(false)}
          >
            <ExternalLink className="h-3 w-3" />
            Abrir card completo
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
