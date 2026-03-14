"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AiButton } from "@/components/ui/ai-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CARD_STATUS_LABEL, PRIORIDADE_LABEL } from "@/types";
import type { CardStatus, Prioridade } from "@/types";

type CardData = {
  id: string;
  titulo: string;
  descricao: string | null;
  criteriosAceite: string | null;
  responsavelId: string | null;
  prioridade: string;
  estimativa: number | null;
  prazo: string | null;
  status: string;
  bloqueado: boolean;
  motivoBloqueio: string | null;
  sprintId: string | null;
};
type Usuario = { id: string; nome: string };
type Sprint = { id: string; nome: string };

export function CardEditar({
  card,
  usuarios,
  sprints,
}: {
  card: CardData;
  usuarios: Usuario[];
  sprints: Sprint[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [aiLoadingDescricao, setAiLoadingDescricao] = useState(false);
  const [aiLoadingCriterios, setAiLoadingCriterios] = useState(false);

  async function handleAiImproveDescricao() {
    setAiLoadingDescricao(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "improve-description", titulo: form.titulo, descricao: form.descricao }),
      });
      if (res.ok) {
        const data = await res.json();
        setForm((f) => ({ ...f, descricao: data.descricao }));
      }
    } finally {
      setAiLoadingDescricao(false);
    }
  }

  async function handleAiGenerateCriterios() {
    setAiLoadingCriterios(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate-criteria", titulo: form.titulo, descricao: form.descricao }),
      });
      if (res.ok) {
        const data = await res.json();
        setForm((f) => ({ ...f, criteriosAceite: data.criteriosAceite }));
      }
    } finally {
      setAiLoadingCriterios(false);
    }
  }
  const [form, setForm] = useState({
    titulo: card.titulo,
    descricao: card.descricao ?? "",
    criteriosAceite: card.criteriosAceite ?? "",
    responsavelId: card.responsavelId ?? "",
    prioridade: card.prioridade,
    estimativa: card.estimativa ?? "",
    prazo: card.prazo ? card.prazo.toString().slice(0, 10) : "",
    status: card.status,
    bloqueado: card.bloqueado,
    motivoBloqueio: card.motivoBloqueio ?? "",
    sprintId: card.sprintId ?? "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: form.titulo,
          descricao: form.descricao || undefined,
          criteriosAceite: form.criteriosAceite || undefined,
          responsavelId: form.responsavelId || null,
          prioridade: form.prioridade,
          estimativa: form.estimativa === "" ? undefined : Number(form.estimativa),
          prazo: form.prazo || null,
          status: form.status,
          bloqueado: form.bloqueado,
          motivoBloqueio: form.bloqueado ? form.motivoBloqueio || null : null,
          sprintId: form.sprintId || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message ?? "Erro ao salvar.");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Editar card</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar card</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Título *</Label>
            <Input
              value={form.titulo}
              onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
              required
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Descrição</Label>
              <AiButton
                onClick={handleAiImproveDescricao}
                loading={aiLoadingDescricao}
                label="Melhorar descrição"
              />
            </div>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.descricao}
              onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Critérios de aceite</Label>
              <AiButton
                onClick={handleAiGenerateCriterios}
                loading={aiLoadingCriterios}
                label="Gerar critérios"
              />
            </div>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.criteriosAceite}
              onChange={(e) => setForm((f) => ({ ...f, criteriosAceite: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Responsável</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.responsavelId}
                onChange={(e) => setForm((f) => ({ ...f, responsavelId: e.target.value }))}
              >
                <option value="">Selecione</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>{u.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Prioridade</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.prioridade}
                onChange={(e) => setForm((f) => ({ ...f, prioridade: e.target.value }))}
              >
                {(Object.keys(PRIORIDADE_LABEL) as Prioridade[]).map((p) => (
                  <option key={p} value={p}>{PRIORIDADE_LABEL[p]}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Estimativa</Label>
              <Input
                type="number"
                min={0}
                value={form.estimativa}
                onChange={(e) => setForm((f) => ({ ...f, estimativa: e.target.value }))}
              />
            </div>
            <div>
              <Label>Prazo</Label>
              <Input
                type="date"
                value={form.prazo}
                onChange={(e) => setForm((f) => ({ ...f, prazo: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label>Status</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              {(Object.keys(CARD_STATUS_LABEL) as CardStatus[]).map((s) => (
                <option key={s} value={s}>{CARD_STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Sprint</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.sprintId}
              onChange={(e) => setForm((f) => ({ ...f, sprintId: e.target.value }))}
            >
              <option value="">Nenhuma</option>
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="bloqueado"
              checked={form.bloqueado}
              onChange={(e) => setForm((f) => ({ ...f, bloqueado: e.target.checked }))}
              className="rounded border-input"
            />
            <Label htmlFor="bloqueado">Bloqueado</Label>
          </div>
          {form.bloqueado && (
            <div>
              <Label>Motivo do bloqueio</Label>
              <Input
                value={form.motivoBloqueio}
                onChange={(e) => setForm((f) => ({ ...f, motivoBloqueio: e.target.value }))}
                placeholder="Descreva o bloqueio"
              />
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "Salvando…" : "Salvar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
