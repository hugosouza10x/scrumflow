"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardStatusBadge, PrioridadeBadge, ProjetoStatusBadge, RefinamentoBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  CheckCircle2, AlertTriangle, ShieldAlert, CalendarDays, Users, Zap,
  LayoutList, ListTodo, Layers, TrendingUp, Clock, ChevronRight,
} from "lucide-react";
import type { CardStatus, Prioridade, ProjetoStatus } from "@/types";
import { CARD_STATUS_LABEL } from "@/types";

type ProjetoDetalhe = {
  id: string;
  nome: string;
  descricao: string | null;
  status: string;
  prioridade: string;
  dataInicio: string | null;
  dataPrevisao: string | null;
  createdAt: string;
  cliente: { id: string; nome: string; cor: string | null } | null;
  lider: { id: string; nome: string; email: string } | null;
  membros: Array<{ userId: string; user: { id: string; nome: string; email: string } }>;
  sprints: Array<{
    id: string; nome: string; status: string;
    dataInicio: string | null; dataFim: string | null;
    _count: { cards: number };
  }>;
  cards: Array<{
    id: string; titulo: string; status: string;
    prioridade: string; prazo: string | null; bloqueado: boolean;
    responsavel: { id: string; nome: string } | null;
    _count: { subtarefas: number };
  }>;
  demandas: Array<{
    id: string; titulo: string; statusRefinamento: string; prioridade: string;
  }>;
  _count: { cards: number; demandas: number; sprints: number; epicos: number };
};

const CARD_STATUS_ORDER = [
  "BACKLOG", "PRONTO_PARA_SPRINT", "A_FAZER", "EM_ANDAMENTO",
  "EM_REVISAO", "BLOQUEADO", "HOMOLOGACAO", "CONCLUIDO", "CANCELADO",
];

const STATUS_BAR_COLOR: Record<string, string> = {
  A_FAZER: "bg-slate-400",
  EM_ANDAMENTO: "bg-blue-500",
  EM_REVISAO: "bg-purple-500",
  BLOQUEADO: "bg-red-500",
  HOMOLOGACAO: "bg-orange-400",
  CONCLUIDO: "bg-green-500",
  CANCELADO: "bg-gray-300",
  BACKLOG: "bg-slate-300",
  PRONTO_PARA_SPRINT: "bg-cyan-400",
};

function getInitials(nome: string) {
  return nome.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function MetricCard({
  label, value, sub, color, icon: Icon,
}: {
  label: string; value: string | number; sub?: string; color?: string; icon: React.ElementType;
}) {
  return (
    <div className={`rounded-xl border p-4 space-y-1 ${color ?? "bg-card"}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground/60" />
      </div>
      <p className={`text-2xl font-bold ${color?.includes("red") ? "text-red-600" : color?.includes("amber") ? "text-amber-600" : color?.includes("green") ? "text-green-600" : ""}`}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function ProjetoDetalheClient({ projeto, projetoId }: { projeto: ProjetoDetalhe; projetoId: string }) {
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroBusca, setFiltroBusca] = useState("");

  const today = new Date();

  const stats = useMemo(() => {
    const total = projeto.cards.length;
    const concluidos = projeto.cards.filter((c) => c.status === "CONCLUIDO").length;
    const cancelados = projeto.cards.filter((c) => c.status === "CANCELADO").length;
    const ativos = projeto.cards.filter((c) => !["CONCLUIDO", "CANCELADO"].includes(c.status)).length;
    const bloqueados = projeto.cards.filter((c) => c.bloqueado || c.status === "BLOQUEADO").length;
    const atrasados = projeto.cards.filter(
      (c) => c.prazo && !["CONCLUIDO", "CANCELADO"].includes(c.status) && new Date(c.prazo) < today
    ).length;
    const pct = total > 0 ? Math.round((concluidos / (total - cancelados || 1)) * 100) : 0;
    return { total, concluidos, cancelados, ativos, bloqueados, atrasados, pct };
  }, [projeto.cards]);

  const diasRestantes = projeto.dataPrevisao
    ? Math.ceil((new Date(projeto.dataPrevisao).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const isOverdue = diasRestantes !== null && diasRestantes < 0 && projeto.status !== "CONCLUIDO";

  const sprintAtiva = projeto.sprints.find((s) => s.status === "EM_ANDAMENTO");

  // Status distribution for bar
  const statusDistribuicao = useMemo(() => {
    const counts: Record<string, number> = {};
    projeto.cards.forEach((c) => { counts[c.status] = (counts[c.status] ?? 0) + 1; });
    return Object.entries(counts).sort(
      ([a], [b]) => CARD_STATUS_ORDER.indexOf(a) - CARD_STATUS_ORDER.indexOf(b)
    );
  }, [projeto.cards]);

  // Filtered cards
  const cardsFiltrados = useMemo(() => {
    return projeto.cards.filter((c) => {
      if (filtroStatus && c.status !== filtroStatus) return false;
      if (filtroBusca && !c.titulo.toLowerCase().includes(filtroBusca.toLowerCase())) return false;
      return true;
    });
  }, [projeto.cards, filtroStatus, filtroBusca]);

  // Group cards by responsavel for workload
  const cargaEquipe = useMemo(() => {
    const map = new Map<string, { nome: string; total: number; ativos: number }>();
    projeto.cards
      .filter((c) => !["CONCLUIDO", "CANCELADO"].includes(c.status))
      .forEach((c) => {
        if (!c.responsavel) return;
        const entry = map.get(c.responsavel.id) ?? { nome: c.responsavel.nome, total: 0, ativos: 0 };
        entry.total++;
        if (!["CONCLUIDO", "CANCELADO"].includes(c.status)) entry.ativos++;
        map.set(c.responsavel.id, entry);
      });
    return Array.from(map.values()).sort((a, b) => b.ativos - a.ativos);
  }, [projeto.cards]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href="/dashboard/projetos" className="text-sm text-muted-foreground hover:underline flex items-center gap-1">
            ← Projetos
          </Link>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <h1 className="text-2xl font-bold">{projeto.nome}</h1>
            <ProjetoStatusBadge status={projeto.status as ProjetoStatus} />
            <PrioridadeBadge prioridade={projeto.prioridade as Prioridade} />
          </div>
          {projeto.cliente && (
            <span
              className="inline-block text-xs font-medium px-2 py-0.5 rounded mt-1"
              style={{
                color: projeto.cliente.cor ?? "#94a3b8",
                backgroundColor: projeto.cliente.cor ? `${projeto.cliente.cor}18` : "#f1f5f9",
                border: `1px solid ${projeto.cliente.cor ?? "#94a3b8"}40`,
              }}
            >
              {projeto.cliente.nome}
            </span>
          )}
          {projeto.descricao && (
            <p className="text-muted-foreground mt-2 text-sm max-w-2xl">{projeto.descricao}</p>
          )}
        </div>
        <Link href={`/dashboard/projetos/${projetoId}/editar`} className="shrink-0">
          <Button variant="outline" size="sm">Editar projeto</Button>
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Conclusão"
          value={`${stats.pct}%`}
          sub={`${stats.concluidos} de ${stats.total - stats.cancelados} cards`}
          icon={TrendingUp}
          color={stats.pct === 100 ? "bg-green-50 dark:bg-green-950/20" : undefined}
        />
        <MetricCard
          label="Cards ativos"
          value={stats.ativos}
          sub="em andamento"
          icon={LayoutList}
        />
        <MetricCard
          label="Bloqueados"
          value={stats.bloqueados}
          icon={ShieldAlert}
          color={stats.bloqueados > 0 ? "bg-red-50 dark:bg-red-950/20" : undefined}
        />
        <MetricCard
          label={isOverdue ? "Prazo" : diasRestantes !== null ? "Dias restantes" : "Prazo"}
          value={
            diasRestantes === null ? "—"
            : isOverdue ? `${Math.abs(diasRestantes)}d atraso`
            : diasRestantes === 0 ? "Hoje"
            : diasRestantes
          }
          sub={projeto.dataPrevisao ? formatDate(projeto.dataPrevisao) : undefined}
          icon={isOverdue ? AlertTriangle : CalendarDays}
          color={isOverdue ? "bg-red-50 dark:bg-red-950/20" : diasRestantes !== null && diasRestantes <= 7 ? "bg-amber-50 dark:bg-amber-950/20" : undefined}
        />
      </div>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">

        {/* LEFT: Cards */}
        <div className="space-y-4">

          {/* Status distribution bar */}
          {projeto.cards.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Distribuição por status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex h-3 rounded-full overflow-hidden gap-px">
                  {statusDistribuicao.map(([status, count]) => (
                    <div
                      key={status}
                      className={`${STATUS_BAR_COLOR[status] ?? "bg-slate-200"} transition-all`}
                      style={{ width: `${(count / projeto.cards.length) * 100}%` }}
                      title={`${CARD_STATUS_LABEL[status as CardStatus] ?? status}: ${count}`}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {statusDistribuicao.map(([status, count]) => (
                    <button
                      key={status}
                      onClick={() => setFiltroStatus(filtroStatus === status ? "" : status)}
                      className={`flex items-center gap-1 text-[11px] transition-opacity ${filtroStatus && filtroStatus !== status ? "opacity-40" : ""}`}
                    >
                      <span className={`h-2 w-2 rounded-full ${STATUS_BAR_COLOR[status] ?? "bg-slate-200"}`} />
                      <span className="text-muted-foreground">{CARD_STATUS_LABEL[status as CardStatus] ?? status}</span>
                      <span className="font-semibold">{count}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cards list */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2 pb-3">
              <CardTitle className="text-base">
                Cards ({cardsFiltrados.length}{filtroStatus || filtroBusca ? ` / ${projeto.cards.length}` : ""})
              </CardTitle>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={filtroBusca}
                  onChange={(e) => setFiltroBusca(e.target.value)}
                  className="rounded-md border border-input bg-background px-2 py-1 text-xs w-36"
                />
                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                  className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                >
                  <option value="">Todos os status</option>
                  {CARD_STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>{CARD_STATUS_LABEL[s as CardStatus] ?? s}</option>
                  ))}
                </select>
                <Button asChild size="sm">
                  <Link href={`/dashboard/projetos/${projetoId}/cards/novo`}>+ Card</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {cardsFiltrados.length === 0 ? (
                <EmptyState
                  icon={LayoutList}
                  title={projeto.cards.length === 0 ? "Nenhum card neste projeto" : "Nenhum card corresponde aos filtros"}
                  description={projeto.cards.length === 0 ? "Crie o primeiro card para começar a trabalhar." : "Tente ajustar os filtros."}
                  action={projeto.cards.length === 0 ? { label: "Novo card", href: `/dashboard/projetos/${projetoId}/cards/novo` } : undefined}
                  className="border-0 py-8"
                />
              ) : (
                <div className="divide-y">
                  {cardsFiltrados.map((c) => {
                    const isOverdueCard = c.prazo && !["CONCLUIDO", "CANCELADO"].includes(c.status) && new Date(c.prazo) < today;
                    return (
                      <Link
                        key={c.id}
                        href={`/dashboard/cards/${c.id}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors group"
                      >
                        <CardStatusBadge status={c.status as CardStatus} className="shrink-0" />
                        <span className="flex-1 font-medium text-sm truncate group-hover:text-primary transition-colors min-w-0">
                          {c.titulo}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          {c.bloqueado && (
                            <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
                          )}
                          {c.prazo && (
                            <span className={`text-[11px] flex items-center gap-0.5 ${isOverdueCard ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                              <CalendarDays className="h-3 w-3" />
                              {new Date(c.prazo).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                            </span>
                          )}
                          <PrioridadeBadge prioridade={c.prioridade as Prioridade} className="hidden sm:flex" />
                          {c.responsavel && (
                            <div
                              className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0"
                              title={c.responsavel.nome}
                            >
                              {getInitials(c.responsavel.nome)}
                            </div>
                          )}
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Sidebar */}
        <div className="space-y-4">

          {/* Project info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {projeto.lider && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-16 text-xs shrink-0">Líder</span>
                  <div className="flex items-center gap-1.5">
                    <div className="h-5 w-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[9px] font-bold">
                      {getInitials(projeto.lider.nome)}
                    </div>
                    <span className="text-xs truncate">{projeto.lider.nome}</span>
                  </div>
                </div>
              )}
              {projeto.dataInicio && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-16 text-xs shrink-0">Início</span>
                  <span className="text-xs">{formatDate(projeto.dataInicio)}</span>
                </div>
              )}
              {projeto.dataPrevisao && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-16 text-xs shrink-0">Previsão</span>
                  <span className={`text-xs ${isOverdue ? "text-red-500 font-medium" : ""}`}>
                    {formatDate(projeto.dataPrevisao)}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-16 text-xs shrink-0">Cards</span>
                <span className="text-xs">{stats.concluidos}/{stats.total} concluídos</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-16 text-xs shrink-0">Épicos</span>
                <Link href={`/dashboard/epicos`} className="text-xs text-primary hover:underline">
                  {projeto._count.epicos} épicos
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Active sprint */}
          {sprintAtiva ? (
            <Card className="border-primary/40 bg-primary/5">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                  <CardTitle className="text-sm text-primary">Sprint ativa</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href={`/dashboard/sprints/${sprintAtiva.id}`} className="text-sm font-medium hover:underline block">
                  {sprintAtiva.nome}
                </Link>
                {sprintAtiva.dataFim && (() => {
                  const dias = Math.ceil((new Date(sprintAtiva.dataFim).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <p className={`text-xs ${dias < 0 ? "text-red-500" : dias <= 2 ? "text-amber-500" : "text-muted-foreground"}`}>
                      {dias < 0 ? `Encerrou há ${Math.abs(dias)} dia${Math.abs(dias) !== 1 ? "s" : ""}`
                        : dias === 0 ? "Encerra hoje"
                        : `${dias} dia${dias !== 1 ? "s" : ""} restante${dias !== 1 ? "s" : ""}`}
                    </p>
                  );
                })()}
                <p className="text-xs text-muted-foreground">{sprintAtiva._count.cards} cards na sprint</p>
                <Link href={`/dashboard/sprints/${sprintAtiva.id}`}>
                  <Button size="sm" variant="outline" className="w-full h-7 text-xs mt-1">Ver sprint</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-4 text-center">
                <Zap className="h-6 w-6 text-muted-foreground/40 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Nenhuma sprint ativa</p>
                <Link href="/dashboard/sprints">
                  <Button size="sm" variant="ghost" className="mt-2 h-7 text-xs">Gerenciar sprints</Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Team */}
          {projeto.membros.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <CardTitle className="text-sm">Equipe ({projeto.membros.length})</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {projeto.membros.map((m) => {
                  const carga = cargaEquipe.find((c) => c.nome === m.user.nome);
                  return (
                    <div key={m.userId} className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                        {getInitials(m.user.nome)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{m.user.nome}</p>
                        {carga && (
                          <p className="text-[10px] text-muted-foreground">{carga.ativos} cards ativos</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Backlog */}
          {projeto.demandas.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ListTodo className="h-3.5 w-3.5 text-muted-foreground" />
                    <CardTitle className="text-sm">Backlog ({projeto.demandas.length})</CardTitle>
                  </div>
                  <Link href="/dashboard/backlog" className="text-[11px] text-primary hover:underline">
                    Ver tudo
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {projeto.demandas.slice(0, 5).map((d) => (
                  <div key={d.id} className="flex items-center gap-2">
                    <RefinamentoBadge status={d.statusRefinamento} className="shrink-0" />
                    <span className="text-xs truncate flex-1">{d.titulo}</span>
                  </div>
                ))}
                {projeto.demandas.length > 5 && (
                  <p className="text-[11px] text-muted-foreground pt-1">
                    +{projeto.demandas.length - 5} demandas no backlog
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* All sprints */}
          {projeto.sprints.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <CardTitle className="text-sm">Sprints ({projeto.sprints.length})</CardTitle>
                  </div>
                  <Link href="/dashboard/sprints" className="text-[11px] text-primary hover:underline">Ver todas</Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {projeto.sprints.slice(0, 4).map((s) => (
                  <Link
                    key={s.id}
                    href={`/dashboard/sprints/${s.id}`}
                    className="flex items-center gap-2 hover:bg-muted/40 rounded px-1 py-0.5 transition-colors"
                  >
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                      s.status === "EM_ANDAMENTO" ? "bg-primary" :
                      s.status === "CONCLUIDA" ? "bg-green-500" : "bg-muted-foreground/40"
                    }`} />
                    <span className="text-xs truncate flex-1">{s.nome}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{s._count.cards}c</span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
