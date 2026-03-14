"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CardStatusBadge, PrioridadeBadge } from "@/components/ui/status-badge";
import { BurndownChart } from "@/components/charts/burndown-chart";
import { AlertTriangle } from "lucide-react";
import type { CardStatus, Prioridade } from "@/types";

type CardItem = {
  id: string;
  titulo: string;
  status: string;
  prioridade: string;
  estimativa: number | null;
  responsavel: { id: string; nome: string } | null;
  _count: { subtarefas: number };
};

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "Todos os status" },
  { value: "A_FAZER", label: "A fazer" },
  { value: "EM_ANDAMENTO", label: "Em andamento" },
  { value: "EM_REVISAO", label: "Em revisão" },
  { value: "BLOQUEADO", label: "Bloqueado" },
  { value: "HOMOLOGACAO", label: "Homologação" },
  { value: "CONCLUIDO", label: "Concluído" },
];

export function SprintDetalheClient({
  sprintId,
  cards,
  capacidadeTotal,
}: {
  sprintId: string;
  cards: CardItem[];
  capacidadeTotal?: number | null;
}) {
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroResponsavel, setFiltroResponsavel] = useState("");

  const responsaveis = useMemo(() => {
    const map = new Map<string, string>();
    cards.forEach((c) => {
      if (c.responsavel) map.set(c.responsavel.id, c.responsavel.nome);
    });
    return Array.from(map.entries()).map(([id, nome]) => ({ id, nome }));
  }, [cards]);

  const totalPontos = cards.reduce((acc, c) => acc + (c.estimativa ?? 0), 0);
  const sobrecargado = capacidadeTotal != null && totalPontos > capacidadeTotal;

  const cardsFiltrados = cards.filter((c) => {
    if (filtroStatus && c.status !== filtroStatus) return false;
    if (filtroResponsavel && c.responsavel?.id !== filtroResponsavel) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {sobrecargado && (
        <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50/50 p-4 dark:border-orange-900 dark:bg-orange-950/20">
          <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">
              Sprint sobrecarregada
            </p>
            <p className="text-sm text-orange-600/80 dark:text-orange-400/70">
              Total de pontos: <strong>{totalPontos}</strong> · Capacidade: <strong>{capacidadeTotal}</strong> pts
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Burndown da Sprint</CardTitle>
        </CardHeader>
        <CardContent>
          <BurndownChart sprintId={sprintId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">
            Cards na sprint ({cardsFiltrados.length}/{cards.length})
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
            >
              {STATUS_FILTER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {responsaveis.length > 0 && (
              <select
                className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                value={filtroResponsavel}
                onChange={(e) => setFiltroResponsavel(e.target.value)}
              >
                <option value="">Todos os membros</option>
                {responsaveis.map((r) => (
                  <option key={r.id} value={r.id}>{r.nome}</option>
                ))}
              </select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {cardsFiltrados.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              {cards.length === 0
                ? "Nenhum card nesta sprint. Adicione cards pelo Kanban ou na edição do card."
                : "Nenhum card corresponde aos filtros."}
            </p>
          ) : (
            <ul className="space-y-2">
              {cardsFiltrados.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center gap-3 rounded-md border p-3 text-sm"
                >
                  <CardStatusBadge status={c.status as CardStatus} className="shrink-0" />
                  <Link href={`/dashboard/cards/${c.id}`} className="font-medium hover:underline flex-1 truncate min-w-0">
                    {c.titulo}
                  </Link>
                  <PrioridadeBadge prioridade={c.prioridade as Prioridade} className="shrink-0 hidden sm:flex" />
                  {c.estimativa != null && (
                    <span className="text-xs text-muted-foreground shrink-0">{c.estimativa} pts</span>
                  )}
                  {c.responsavel && (
                    <span className="text-xs text-muted-foreground shrink-0 hidden md:block">
                      {c.responsavel.nome}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Total: {totalPontos} pts
              {capacidadeTotal != null && ` · Capacidade: ${capacidadeTotal} pts`}
            </span>
            <Link href="/dashboard/kanban">
              <Button variant="outline" size="sm">Abrir Kanban</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
