"use client";

import { useEffect, useState } from "react";
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
import { ExternalLink, ChevronDown, X } from "lucide-react";
import Link from "next/link";
import type { CardForKanban, TeamMember } from "./kanban-board";

const PRIORIDADE_OPTIONS = [
  { value: "BAIXA", label: "Baixa" },
  { value: "MEDIA", label: "Média" },
  { value: "ALTA", label: "Alta" },
  { value: "URGENTE", label: "Urgente" },
];

function getInitials(nome: string) {
  return nome.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

type QuickEditForm = {
  titulo: string;
  responsaveisIds: string[];
  prioridade: string;
  prazo: string;
  bloqueado: boolean;
  motivoBloqueio: string;
};

function formFromCard(card: CardForKanban): QuickEditForm {
  const ids = card.responsaveis?.map((r) => r.id)
    ?? (card.responsavel ? [card.responsavel.id] : []);
  return {
    titulo: card.titulo,
    responsaveisIds: ids,
    prioridade: card.prioridade ?? "MEDIA",
    prazo: card.prazo ? card.prazo.toString().slice(0, 10) : "",
    bloqueado: card.bloqueado ?? false,
    motivoBloqueio: "",
  };
}

type Props = {
  card: CardForKanban;
  teamMembers: TeamMember[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function KanbanCardQuickEdit({ card, teamMembers, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<QuickEditForm>(() => formFromCard(card));
  const [saving, setSaving] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (open) setForm(formFromCard(card));
  }, [open, card]);

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
    setSaving(true);
    try {
      const res = await fetch(`/api/cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: form.titulo,
          responsaveisIds: form.responsaveisIds,
          prioridade: form.prioridade,
          prazo: form.prazo || null,
          bloqueado: form.bloqueado,
          motivoBloqueio: form.bloqueado ? form.motivoBloqueio || null : null,
        }),
      });
      if (!res.ok) throw new Error("Erro ao salvar");
      queryClient.invalidateQueries({ queryKey: ["cards", "kanban"] });
      toast.success("Card atualizado!");
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar card.");
    } finally {
      setSaving(false);
    }
  }

  const selectedMembers = teamMembers.filter((m) => form.responsaveisIds.includes(m.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base leading-snug line-clamp-2 pr-6">
            {card.titulo}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label className="text-xs">Título</Label>
            <Input
              value={form.titulo}
              onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
              required
              className="h-8 text-sm"
            />
          </div>

          {/* Responsáveis — multi-select */}
          <div>
            <Label className="text-xs">Responsáveis</Label>
            {/* Chips dos selecionados */}
            {selectedMembers.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1 mb-1">
                {selectedMembers.map((m) => (
                  <span
                    key={m.id}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
                  >
                    <span className="h-4 w-4 rounded-full bg-primary/25 flex items-center justify-center text-[8px] font-bold shrink-0">
                      {getInitials(m.nome)}
                    </span>
                    {m.nome.split(" ")[0]}
                    <button
                      type="button"
                      onClick={() => toggleResponsavel(m.id)}
                      className="ml-0.5 hover:text-destructive transition-colors"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {/* Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen((v) => !v)}
                className="mt-1 w-full h-8 rounded-md border border-input bg-background px-2 text-xs flex items-center justify-between"
              >
                <span className="text-muted-foreground">
                  {selectedMembers.length === 0 ? "Selecionar responsáveis…" : `${selectedMembers.length} selecionado(s)`}
                </span>
                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
              </button>
              {dropdownOpen && (
                <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-md py-1 max-h-40 overflow-y-auto">
                  {teamMembers.map((m) => {
                    const checked = form.responsaveisIds.includes(m.id);
                    return (
                      <label
                        key={m.id}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleResponsavel(m.id)}
                          className="h-3.5 w-3.5 rounded accent-primary"
                        />
                        <span className="h-5 w-5 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[9px] font-bold shrink-0">
                          {getInitials(m.nome)}
                        </span>
                        {m.nome}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Prioridade</Label>
              <select
                value={form.prioridade}
                onChange={(e) => setForm((f) => ({ ...f, prioridade: e.target.value }))}
                className="mt-1 w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
              >
                {PRIORIDADE_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Prazo</Label>
              <Input
                type="date"
                value={form.prazo}
                onChange={(e) => setForm((f) => ({ ...f, prazo: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="qe-bloqueado"
              checked={form.bloqueado}
              onChange={(e) => setForm((f) => ({ ...f, bloqueado: e.target.checked }))}
              className="rounded border-input h-3.5 w-3.5"
            />
            <Label htmlFor="qe-bloqueado" className="text-xs cursor-pointer">
              Bloqueado
            </Label>
          </div>

          {form.bloqueado && (
            <div>
              <Label className="text-xs">Motivo do bloqueio</Label>
              <Input
                value={form.motivoBloqueio}
                onChange={(e) => setForm((f) => ({ ...f, motivoBloqueio: e.target.value }))}
                placeholder="Descreva o bloqueio"
                className="h-8 text-sm"
              />
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <Button type="submit" size="sm" disabled={saving} className="flex-1">
              {saving ? "Salvando…" : "Salvar"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </form>

        <div className="border-t pt-2">
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
