import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getAccessibleProjectIds, buildProjectFilter } from "@/lib/authorization";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CardStatusBadge, PrioridadeBadge } from "@/components/ui/status-badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ShieldAlert,
  Clock,
  AlertTriangle,
  Users,
  Zap,
  CalendarDays,
  ArrowRight,
  AlertCircle,
  ChevronRight,
  Inbox,
  CheckCircle2,
  UserX,
  CalendarX,
  Activity,
} from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────────

function iniciais(nome: string): string {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function isSameWeek(date: Date, weekStart: Date, weekEnd: Date): boolean {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const s = new Date(weekStart);
  s.setHours(0, 0, 0, 0);
  const e = new Date(weekEnd);
  e.setHours(23, 59, 59, 999);
  return d >= s && d <= e;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const projectIds = await getAccessibleProjectIds(session.id, session.cargo.slug);
  const cardProjetoFilter = buildProjectFilter(projectIds, { includeAvulsas: true });

  const sprintProjetoFilter =
    projectIds === "all" ? {} : { projetoId: { in: projectIds as string[] } };

  const demandaFilter =
    projectIds === "all"
      ? { convertida: false }
      : {
          convertida: false,
          OR: [
            { projetoId: { in: projectIds as string[] } },
            { projetoId: null },
          ],
        };

  const cardFilter = cardProjetoFilter as Prisma.CardWhereInput;
  const demandaWhere = demandaFilter as Prisma.DemandaWhereInput;

  const hoje = new Date();
  const doisDiasAtras = new Date(hoje);
  doisDiasAtras.setDate(hoje.getDate() - 2);
  const em21Dias = new Date(hoje);
  em21Dias.setDate(hoje.getDate() + 21);
  const ha7Dias = new Date(hoje);
  ha7Dias.setDate(hoje.getDate() - 7);

  // Semana atual (segunda a domingo)
  const inicioDaSemana = new Date(hoje);
  inicioDaSemana.setDate(hoje.getDate() - ((hoje.getDay() + 6) % 7));
  inicioDaSemana.setHours(0, 0, 0, 0);

  const fimDaSemana = new Date(inicioDaSemana);
  fimDaSemana.setDate(inicioDaSemana.getDate() + 6);
  fimDaSemana.setHours(23, 59, 59, 999);

  const inicioProximaSemana = new Date(inicioDaSemana);
  inicioProximaSemana.setDate(inicioDaSemana.getDate() + 7);

  const fimProximaSemana = new Date(inicioProximaSemana);
  fimProximaSemana.setDate(inicioProximaSemana.getDate() + 6);
  fimProximaSemana.setHours(23, 59, 59, 999);

  // ─── Batch 1: KPIs, sprints e novos contadores ───────────────────────────
  const [
    totalCardsAtivos,
    cardsBloqueados,
    cardsAtrasados,
    cardsSemAtualizacao,
    totalDemandasAtivas,
    sprintsAtivas,
    cardsSemResponsavel,
    cardsSemPrazo,
    cardsConcluidosEstaSemana,
  ] = await prisma.$transaction([
    prisma.card.count({
      where: { ...cardProjetoFilter, status: { notIn: ["CONCLUIDO", "CANCELADO"] } },
    }),
    prisma.card.count({
      where: {
        ...cardProjetoFilter,
        bloqueado: true,
        status: { notIn: ["CONCLUIDO", "CANCELADO"] },
      },
    }),
    prisma.card.count({
      where: {
        ...cardProjetoFilter,
        prazo: { lt: hoje },
        status: { notIn: ["CONCLUIDO", "CANCELADO"] },
      },
    }),
    prisma.card.count({
      where: {
        ...cardProjetoFilter,
        status: { notIn: ["CONCLUIDO", "CANCELADO"] },
        OR: [{ ultimaAtualizacao: null }, { ultimaAtualizacao: { lt: doisDiasAtras } }],
      },
    }),
    prisma.demanda.count({ where: demandaFilter }),
    prisma.sprint.findMany({
      where: { ...sprintProjetoFilter, status: "EM_ANDAMENTO" },
      include: {
        projeto: { select: { id: true, nome: true } },
        _count: { select: { cards: true } },
      },
      orderBy: { dataFim: "asc" },
      take: 3,
    }),
    // Novos contadores
    prisma.card.count({
      where: {
        ...cardProjetoFilter,
        responsavelId: null,
        status: { notIn: ["CONCLUIDO", "CANCELADO"] },
      },
    }),
    prisma.card.count({
      where: {
        ...cardProjetoFilter,
        prazo: null,
        status: { in: ["A_FAZER", "EM_ANDAMENTO", "EM_REVISAO", "BLOQUEADO", "HOMOLOGACAO"] },
      },
    }),
    prisma.card.count({
      where: {
        ...cardProjetoFilter,
        status: "CONCLUIDO",
        concluidoEm: { gte: inicioDaSemana },
      },
    }),
  ]);

  // ─── Batch 2: análise e visualizações ────────────────────────────────────
  const {
    cardsPorStatusRaw,
    demandasPorStatusRaw,
    cardsAtencaoList,
    cardsTimeline,
    sprintsTimeline,
    teamCardsRaw,
    demandasPorUserRaw,
  } = await prisma.$transaction(async (tx) => {
    const cardsPorStatusRaw = await tx.card.groupBy({
      by: ["status"],
      where: cardFilter,
      _count: { id: true },
    });
    const demandasPorStatusRaw = await tx.demanda.groupBy({
      by: ["statusRefinamento"],
      where: demandaWhere,
      _count: { id: true },
    });
    const cardsAtencaoList = await tx.card.findMany({
      where: {
        ...cardFilter,
        status: { notIn: ["CONCLUIDO", "CANCELADO"] },
        OR: [{ bloqueado: true }, { prazo: { lt: hoje } }],
      },
      select: {
        id: true,
        titulo: true,
        status: true,
        prioridade: true,
        prazo: true,
        bloqueado: true,
        responsavel: { select: { id: true, nome: true } },
        projeto: { select: { nome: true } },
      },
      orderBy: [{ bloqueado: "desc" }, { prazo: "asc" }],
      take: 10,
    });
    const cardsTimeline = await tx.card.findMany({
      where: {
        ...cardFilter,
        status: { notIn: ["CONCLUIDO", "CANCELADO"] },
        prazo: { gte: hoje, lte: em21Dias },
      },
      select: {
        id: true,
        titulo: true,
        prazo: true,
        prioridade: true,
        status: true,
        responsavel: { select: { nome: true } },
        projeto: { select: { nome: true } },
      },
      orderBy: { prazo: "asc" },
    });
    const sprintsTimeline = await tx.sprint.findMany({
      where: {
        ...sprintProjetoFilter,
        status: { in: ["EM_ANDAMENTO", "PLANEJADA"] },
        dataFim: { gte: ha7Dias },
        dataInicio: { lte: em21Dias },
      },
      include: { projeto: { select: { nome: true } } },
      orderBy: { dataInicio: "asc" },
      take: 8,
    });
    const teamCardsRaw = await tx.card.groupBy({
      by: ["responsavelId"],
      where: { ...cardFilter, status: { notIn: ["CONCLUIDO", "CANCELADO"] }, responsavelId: { not: null } },
      _count: { id: true },
    });
    const demandasPorUserRaw = await tx.demanda.groupBy({
      by: ["responsavelId"],
      where: { ...demandaWhere, responsavelId: { not: null } },
      _count: { id: true },
    });
    return {
      cardsPorStatusRaw,
      demandasPorStatusRaw,
      cardsAtencaoList,
      cardsTimeline,
      sprintsTimeline,
      teamCardsRaw,
      demandasPorUserRaw,
    };
  });

  // ─── Sprint progress ──────────────────────────────────────────────────────
  const concluidosPorSprint =
    sprintsAtivas.length > 0
      ? await prisma.card.groupBy({
          by: ["sprintId"],
          where: { sprintId: { in: sprintsAtivas.map((s) => s.id) }, status: "CONCLUIDO" },
          _count: { id: true },
        })
      : [];

  const sprintsComProgresso = sprintsAtivas.map((s) => {
    const concluidos = concluidosPorSprint.find((c) => c.sprintId === s.id)?._count.id ?? 0;
    const total = s._count.cards;
    const pct = total > 0 ? Math.round((concluidos / total) * 100) : 0;
    const diasRestantes = Math.ceil(
      (new Date(s.dataFim).getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
    );
    return { ...s, concluidos, total, pct, diasRestantes };
  });

  // ─── Team workload ────────────────────────────────────────────────────────
  const userIds = Array.from(
    new Set([
      ...teamCardsRaw.map((r) => r.responsavelId!),
      ...demandasPorUserRaw.map((r) => r.responsavelId!),
    ])
  );

  const { teamUsers, cardsBloqueadosPorUser, cardsAtrasadosPorUser, cardsEmAndamentoPorUser, cardsSemPrazoPorUser } =
    userIds.length > 0
      ? await prisma.$transaction(async (tx) => {
          const teamUsers = await tx.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, nome: true, cargo: { select: { slug: true, nome: true } } },
          });
          const cardsBloqueadosPorUser = await tx.card.groupBy({
            by: ["responsavelId"],
            where: { ...cardFilter, bloqueado: true, status: { notIn: ["CONCLUIDO", "CANCELADO"] }, responsavelId: { in: userIds } },
            _count: { id: true },
          });
          const cardsAtrasadosPorUser = await tx.card.groupBy({
            by: ["responsavelId"],
            where: { ...cardFilter, prazo: { lt: hoje }, status: { notIn: ["CONCLUIDO", "CANCELADO"] }, responsavelId: { in: userIds } },
            _count: { id: true },
          });
          const cardsEmAndamentoPorUser = await tx.card.groupBy({
            by: ["responsavelId"],
            where: { ...cardFilter, status: { in: ["EM_ANDAMENTO"] }, responsavelId: { in: userIds } },
            _count: { id: true },
          });
          const cardsSemPrazoPorUser = await tx.card.groupBy({
            by: ["responsavelId"],
            where: {
              ...cardFilter,
              prazo: null,
              status: { in: ["A_FAZER", "EM_ANDAMENTO", "EM_REVISAO", "BLOQUEADO", "HOMOLOGACAO"] },
              responsavelId: { in: userIds },
            },
            _count: { id: true },
          });
          return { teamUsers, cardsBloqueadosPorUser, cardsAtrasadosPorUser, cardsEmAndamentoPorUser, cardsSemPrazoPorUser };
        })
      : {
          teamUsers: [],
          cardsBloqueadosPorUser: [],
          cardsAtrasadosPorUser: [],
          cardsEmAndamentoPorUser: [],
          cardsSemPrazoPorUser: [],
        };

  const teamWorkload = teamUsers
    .map((user) => ({
      user,
      total: teamCardsRaw.find((r) => r.responsavelId === user.id)?._count.id ?? 0,
      emAndamento: cardsEmAndamentoPorUser.find((r) => r.responsavelId === user.id)?._count.id ?? 0,
      bloqueados: cardsBloqueadosPorUser.find((r) => r.responsavelId === user.id)?._count.id ?? 0,
      atrasados: cardsAtrasadosPorUser.find((r) => r.responsavelId === user.id)?._count.id ?? 0,
      semPrazo: cardsSemPrazoPorUser.find((r) => r.responsavelId === user.id)?._count.id ?? 0,
      demandas: demandasPorUserRaw.find((r) => r.responsavelId === user.id)?._count.id ?? 0,
    }))
    .filter((m) => m.total > 0 || m.demandas > 0)
    .sort((a, b) => b.total - a.total);

  // ─── Valores computados ───────────────────────────────────────────────────

  const demandasNaoRefinadas =
    demandasPorStatusRaw.find((d) => d.statusRefinamento === "NAO_REFINADO")?._count.id ?? 0;
  const demandasEmRefinamento =
    demandasPorStatusRaw.find((d) => d.statusRefinamento === "EM_REFINAMENTO")?._count.id ?? 0;
  const demandasProntas =
    demandasPorStatusRaw.find((d) => d.statusRefinamento === "PRONTO_PARA_SPRINT")?._count.id ?? 0;
  const totalFunil = demandasNaoRefinadas + demandasEmRefinamento + demandasProntas;

  // Derivados de cardsPorStatusRaw
  const cardsEmAndamento =
    cardsPorStatusRaw.find((r) => r.status === "EM_ANDAMENTO")?._count.id ?? 0;

  // Atenção: vencidos (não bloqueados) para a coluna de prazos
  const cardsVencidos = cardsAtencaoList.filter(
    (c) => c.prazo && new Date(c.prazo) < hoje && !c.bloqueado
  );

  // Timeline por semana
  const cardsEstaSemana = cardsTimeline.filter(
    (c) => c.prazo && isSameWeek(new Date(c.prazo), inicioDaSemana, fimDaSemana)
  );
  const cardsProximaSemana = cardsTimeline.filter(
    (c) => c.prazo && isSameWeek(new Date(c.prazo), inicioProximaSemana, fimProximaSemana)
  );
  const sprintsEstaSemana = sprintsTimeline.filter((s) => {
    const si = new Date(s.dataInicio);
    const sf = new Date(s.dataFim);
    return si <= fimDaSemana && sf >= inicioDaSemana;
  });
  const sprintsProximaSemana = sprintsTimeline.filter((s) => {
    const si = new Date(s.dataInicio);
    const sf = new Date(s.dataFim);
    return si <= fimProximaSemana && sf >= inicioProximaSemana;
  });

  // Chips de alerta
  const alertChips = [
    {
      label: "Bloqueados",
      count: cardsBloqueados,
      icon: ShieldAlert,
      href: "/dashboard/kanban",
      active: "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-900 dark:text-red-400",
    },
    {
      label: "Atrasados",
      count: cardsAtrasados,
      icon: Clock,
      href: undefined as string | undefined,
      active: "bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950/30 dark:border-orange-900 dark:text-orange-400",
    },
    {
      label: "Sem responsável",
      count: cardsSemResponsavel,
      icon: UserX,
      href: undefined as string | undefined,
      active: "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-400",
    },
    {
      label: "Sem prazo",
      count: cardsSemPrazo,
      icon: CalendarX,
      href: undefined as string | undefined,
      active: "bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-950/30 dark:border-yellow-900 dark:text-yellow-400",
    },
    {
      label: "Sem atualização",
      count: cardsSemAtualizacao,
      icon: AlertTriangle,
      href: undefined as string | undefined,
      active: "bg-slate-100 border-slate-300 text-slate-700 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300",
    },
    {
      label: "Prontas p/ sprint",
      count: demandasProntas,
      icon: Inbox,
      href: "/dashboard/backlog",
      active: "bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-950/30 dark:border-violet-900 dark:text-violet-400",
    },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Visão gerencial ·{" "}
          {hoje.toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
      </div>

      {/* ── BLOCO 1: Atenção Imediata ──────────────────────────────────────── */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5" /> Atenção imediata
        </h2>
        <div className="flex flex-wrap gap-2">
          {alertChips.map((chip) => {
            const Icon = chip.icon;
            const inner = (
              <div
                className={[
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  chip.count > 0
                    ? chip.active
                    : "bg-muted border-transparent text-muted-foreground",
                  chip.href && chip.count > 0 ? "cursor-pointer hover:opacity-80" : "",
                ].filter(Boolean).join(" ")}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="tabular-nums">{chip.count}</span>
                <span>{chip.label}</span>
              </div>
            );
            return chip.href && chip.count > 0 ? (
              <Link key={chip.label} href={chip.href}>
                {inner}
              </Link>
            ) : (
              <div key={chip.label}>{inner}</div>
            );
          })}
          {/* Contexto resumido */}
          <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
            <span className="tabular-nums">
              <span className="font-semibold text-foreground">{totalCardsAtivos}</span> cards ativos
            </span>
            <span className="tabular-nums">
              <span className="font-semibold text-foreground">{totalDemandasAtivas}</span> demandas no funil
            </span>
          </div>
        </div>
      </div>

      {/* ── BLOCO 2: Sprints em andamento ─────────────────────────────────── */}
      {sprintsComProgresso.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-primary" />
            Sprint{sprintsComProgresso.length > 1 ? "s" : ""} em andamento
          </h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {sprintsComProgresso.map((s) => (
              <Link
                key={s.id}
                href={`/dashboard/sprints/${s.id}`}
                className="rounded-xl border border-primary/20 bg-primary/5 p-4 hover:border-primary/50 hover:bg-primary/10 transition-all group"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm group-hover:text-primary transition-colors truncate">
                      {s.nome}
                    </p>
                    <p className="text-xs text-muted-foreground">{s.projeto.nome}</p>
                  </div>
                  <span
                    className={`text-xs font-medium shrink-0 ${
                      s.diasRestantes < 0
                        ? "text-red-500"
                        : s.diasRestantes <= 2
                        ? "text-orange-500"
                        : "text-muted-foreground"
                    }`}
                  >
                    <CalendarDays className="h-3 w-3 inline mr-0.5" />
                    {s.diasRestantes < 0
                      ? `${Math.abs(s.diasRestantes)}d atrasada`
                      : s.diasRestantes === 0
                      ? "Encerra hoje"
                      : `${s.diasRestantes}d restante${s.diasRestantes !== 1 ? "s" : ""}`}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {s.concluidos}/{s.total} cards
                    </span>
                    <span className="font-semibold text-primary">{s.pct}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-primary/15 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${s.pct}%` }}
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── BLOCO 3: Saúde da Operação + Funil ────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tiles de saúde operacional */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" /> Saúde da operação
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border bg-sky-50 dark:bg-sky-950/20 p-4 space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide leading-tight">
                Em andamento
              </p>
              <p className="text-3xl font-bold tabular-nums text-sky-700 dark:text-sky-400">
                {cardsEmAndamento}
              </p>
              <p className="text-[10px] text-muted-foreground">cards em execução</p>
            </div>
            <div className="rounded-xl border bg-emerald-50 dark:bg-emerald-950/20 p-4 space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide leading-tight">
                Concluídos esta semana
              </p>
              <p className="text-3xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                {cardsConcluidosEstaSemana}
              </p>
              <p className="text-[10px] text-muted-foreground">desde segunda-feira</p>
            </div>
            <div className="rounded-xl border bg-violet-50 dark:bg-violet-950/20 p-4 space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide leading-tight">
                Prontas para sprint
              </p>
              <p className="text-3xl font-bold tabular-nums text-violet-700 dark:text-violet-400">
                {demandasProntas}
              </p>
              <p className="text-[10px] text-muted-foreground">demandas refinadas</p>
            </div>
            <div className="rounded-xl border bg-amber-50 dark:bg-amber-950/20 p-4 space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide leading-tight">
                Taxa do funil
              </p>
              <p className="text-3xl font-bold tabular-nums text-amber-700 dark:text-amber-400">
                {totalFunil > 0 ? Math.round((demandasProntas / totalFunil) * 100) : 0}%
              </p>
              <p className="text-[10px] text-muted-foreground">
                {demandasProntas}/{totalFunil} prontas
              </p>
            </div>
          </div>
        </div>

        {/* Funil de Demandas */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm">Funil de demandas</CardTitle>
                <CardDescription>
                  Pipeline de refinamento · {totalFunil} demanda
                  {totalFunil !== 1 ? "s" : ""} no funil
                </CardDescription>
              </div>
              <Link href="/dashboard/backlog">
                <Button variant="ghost" size="sm" className="text-xs h-7 gap-1">
                  Ver backlog <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                label: "Não refinadas",
                count: demandasNaoRefinadas,
                color: "bg-slate-400 dark:bg-slate-500",
                textColor: "text-slate-600 dark:text-slate-300",
                desc: "Novas demandas aguardando análise",
              },
              {
                label: "Em refinamento",
                count: demandasEmRefinamento,
                color: "bg-amber-500",
                textColor: "text-amber-700 dark:text-amber-400",
                desc: "Em discussão ou detalhamento",
              },
              {
                label: "Prontas para sprint",
                count: demandasProntas,
                color: "bg-emerald-500",
                textColor: "text-emerald-700 dark:text-emerald-400",
                desc: "Refinadas, aguardando sprint",
              },
            ].map((stage) => (
              <div key={stage.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-medium ${stage.textColor}`}>{stage.label}</span>
                  <span className="font-bold tabular-nums text-foreground">{stage.count}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${stage.color}`}
                    style={{
                      width: `${Math.max(
                        (stage.count / (totalFunil || 1)) * 100,
                        stage.count > 0 ? 4 : 0
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">{stage.desc}</p>
              </div>
            ))}
            {totalFunil === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">
                Nenhuma demanda no funil
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── BLOCO 4: Requer Atenção (full width) ──────────────────────────── */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          {cardsAtencaoList.length > 0 && (
            <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
          )}
          {cardsAtencaoList.length === 0 && (
            <AlertCircle className="h-3.5 w-3.5" />
          )}
          Requer atenção
          {cardsAtencaoList.length > 0 && (
            <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              {cardsAtencaoList.length}
            </span>
          )}
        </h2>
        <Card className={cardsAtencaoList.length > 0 ? "border-amber-200/70 dark:border-amber-900/50" : ""}>
          <CardContent className="pt-4">
            {cardsAtencaoList.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-center gap-2">
                <div className="rounded-full bg-emerald-100 p-3 dark:bg-emerald-900/30">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  Tudo em ordem
                </p>
                <p className="text-xs text-muted-foreground">
                  Nenhum card bloqueado ou atrasado.
                </p>
              </div>
            ) : (
              <div className="grid gap-1.5 lg:grid-cols-2">
                {cardsAtencaoList.map((card) => {
                  const atrasado =
                    card.prazo &&
                    new Date(card.prazo) < hoje &&
                    !["CONCLUIDO", "CANCELADO"].includes(card.status);
                  const diasAtraso =
                    atrasado && card.prazo
                      ? Math.ceil(
                          (hoje.getTime() - new Date(card.prazo).getTime()) /
                            (1000 * 60 * 60 * 24)
                        )
                      : 0;
                  return (
                    <Link
                      key={card.id}
                      href={`/dashboard/cards/${card.id}`}
                      className="flex items-start gap-3 rounded-lg border px-3 py-2.5 hover:bg-muted/50 transition-colors group"
                    >
                      <div className="shrink-0 mt-0.5">
                        {card.bloqueado ? (
                          <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
                        ) : (
                          <Clock className="h-3.5 w-3.5 text-orange-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">
                          {card.titulo}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          {card.projeto && (
                            <span className="text-[10px] text-muted-foreground">
                              {card.projeto.nome}
                            </span>
                          )}
                          {card.responsavel && (
                            <span className="text-[10px] text-muted-foreground">
                              · {card.responsavel.nome.split(" ")[0]}
                            </span>
                          )}
                          {atrasado && (
                            <span className="text-[10px] font-medium text-orange-600 dark:text-orange-400">
                              · {diasAtraso}d atrasado
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <CardStatusBadge
                          status={card.status}
                          className="text-[10px] py-0 px-1.5"
                        />
                        <PrioridadeBadge
                          prioridade={card.prioridade}
                          className="shrink-0 text-[10px] py-0 px-1.5"
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── BLOCO 5: Prazos e Horizonte ───────────────────────────────────── */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" /> Prazos e horizonte
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {/* Coluna: Vencidos */}
          <Card className={cardsVencidos.length > 0 ? "border-red-200/70 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/10" : ""}>
            <CardHeader className="pb-2 pt-4">
              <CardTitle
                className={`text-xs font-semibold ${
                  cardsVencidos.length > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
                }`}
              >
                Vencidos
              </CardTitle>
              <CardDescription className="text-[10px]">Prazo já passou</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {cardsVencidos.length === 0 ? (
                <p className="text-center text-[10px] text-muted-foreground py-3">
                  Nenhum vencido
                </p>
              ) : (
                <>
                  {cardsVencidos.slice(0, 5).map((card) => {
                    const dias = Math.ceil(
                      (hoje.getTime() - new Date(card.prazo!).getTime()) / (1000 * 60 * 60 * 24)
                    );
                    return (
                      <Link
                        key={card.id}
                        href={`/dashboard/cards/${card.id}`}
                        className="flex items-center gap-2 rounded-md border border-red-200/50 dark:border-red-900/30 px-2 py-1.5 text-[10px] hover:bg-red-100/50 dark:hover:bg-red-950/30 transition-colors group"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                        <span className="flex-1 truncate font-medium group-hover:text-primary transition-colors">
                          {card.titulo}
                        </span>
                        <span className="shrink-0 text-red-600 dark:text-red-400 font-medium tabular-nums">
                          {dias}d
                        </span>
                      </Link>
                    );
                  })}
                  {cardsVencidos.length > 5 && (
                    <p className="text-center text-[10px] text-muted-foreground pt-0.5">
                      +{cardsVencidos.length - 5} vencidos
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Coluna: Esta semana */}
          <Card className="border-primary/30 bg-primary/[0.02]">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-xs font-semibold text-primary">
                Esta semana
              </CardTitle>
              <CardDescription className="text-[10px]">
                {formatDate(inicioDaSemana)} – {formatDate(fimDaSemana)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {sprintsEstaSemana.length > 0 && (
                <div className="space-y-1">
                  {sprintsEstaSemana.map((sprint) => (
                    <Link
                      key={sprint.id}
                      href={`/dashboard/sprints/${sprint.id}`}
                      className="flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary hover:bg-primary/20 transition-colors"
                    >
                      <Zap className="h-2.5 w-2.5 shrink-0" />
                      <span className="truncate">{sprint.nome}</span>
                      <span className="shrink-0 opacity-60 ml-auto">{sprint.projeto.nome}</span>
                    </Link>
                  ))}
                </div>
              )}
              {cardsEstaSemana.length > 0 ? (
                <div className="space-y-1">
                  {cardsEstaSemana.slice(0, 5).map((card) => (
                    <Link
                      key={card.id}
                      href={`/dashboard/cards/${card.id}`}
                      className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-[10px] hover:bg-muted/50 transition-colors group"
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                          card.prioridade === "URGENTE"
                            ? "bg-red-500"
                            : card.prioridade === "ALTA"
                            ? "bg-orange-500"
                            : card.prioridade === "MEDIA"
                            ? "bg-blue-500"
                            : "bg-slate-400"
                        }`}
                      />
                      <span className="flex-1 truncate font-medium group-hover:text-primary transition-colors">
                        {card.titulo}
                      </span>
                      {card.prazo && (
                        <span className="shrink-0 text-muted-foreground tabular-nums">
                          {formatDate(new Date(card.prazo))}
                        </span>
                      )}
                    </Link>
                  ))}
                  {cardsEstaSemana.length > 5 && (
                    <p className="text-center text-[10px] text-muted-foreground pt-0.5">
                      +{cardsEstaSemana.length - 5} cards
                    </p>
                  )}
                </div>
              ) : sprintsEstaSemana.length === 0 ? (
                <p className="text-center text-[10px] text-muted-foreground py-3">
                  Sem entregas previstas
                </p>
              ) : null}
            </CardContent>
          </Card>

          {/* Coluna: Próxima semana */}
          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground">
                Próxima semana
              </CardTitle>
              <CardDescription className="text-[10px]">
                {formatDate(inicioProximaSemana)} – {formatDate(fimProximaSemana)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {sprintsProximaSemana.length > 0 && (
                <div className="space-y-1">
                  {sprintsProximaSemana.map((sprint) => (
                    <Link
                      key={sprint.id}
                      href={`/dashboard/sprints/${sprint.id}`}
                      className="flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary hover:bg-primary/20 transition-colors"
                    >
                      <Zap className="h-2.5 w-2.5 shrink-0" />
                      <span className="truncate">{sprint.nome}</span>
                      <span className="shrink-0 opacity-60 ml-auto">{sprint.projeto.nome}</span>
                    </Link>
                  ))}
                </div>
              )}
              {cardsProximaSemana.length > 0 ? (
                <div className="space-y-1">
                  {cardsProximaSemana.slice(0, 5).map((card) => (
                    <Link
                      key={card.id}
                      href={`/dashboard/cards/${card.id}`}
                      className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-[10px] hover:bg-muted/50 transition-colors group"
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                          card.prioridade === "URGENTE"
                            ? "bg-red-500"
                            : card.prioridade === "ALTA"
                            ? "bg-orange-500"
                            : card.prioridade === "MEDIA"
                            ? "bg-blue-500"
                            : "bg-slate-400"
                        }`}
                      />
                      <span className="flex-1 truncate font-medium group-hover:text-primary transition-colors">
                        {card.titulo}
                      </span>
                      {card.prazo && (
                        <span className="shrink-0 text-muted-foreground tabular-nums">
                          {formatDate(new Date(card.prazo))}
                        </span>
                      )}
                    </Link>
                  ))}
                  {cardsProximaSemana.length > 5 && (
                    <p className="text-center text-[10px] text-muted-foreground pt-0.5">
                      +{cardsProximaSemana.length - 5} cards
                    </p>
                  )}
                </div>
              ) : sprintsProximaSemana.length === 0 ? (
                <p className="text-center text-[10px] text-muted-foreground py-3">
                  Sem entregas previstas
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── BLOCO 6: Gestão da Equipe ──────────────────────────────────────── */}
      {teamWorkload.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> Gestão da equipe
          </h2>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left font-semibold text-muted-foreground px-4 py-3 whitespace-nowrap">
                        Colaborador
                      </th>
                      <th className="text-center font-semibold text-muted-foreground px-3 py-3 whitespace-nowrap">
                        Ativos
                      </th>
                      <th className="text-center font-semibold text-muted-foreground px-3 py-3 whitespace-nowrap">
                        Em andamento
                      </th>
                      <th className="text-center font-semibold text-muted-foreground px-3 py-3 whitespace-nowrap">
                        Bloqueados
                      </th>
                      <th className="text-center font-semibold text-muted-foreground px-3 py-3 whitespace-nowrap">
                        Atrasados
                      </th>
                      <th className="text-center font-semibold text-muted-foreground px-3 py-3 whitespace-nowrap">
                        Sem prazo
                      </th>
                      <th className="text-center font-semibold text-muted-foreground px-3 py-3 whitespace-nowrap">
                        Demandas
                      </th>
                      <th className="text-left font-semibold text-muted-foreground px-3 py-3 whitespace-nowrap">
                        Carga
                      </th>
                      <th className="px-3 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {teamWorkload.map(
                      ({ user, total, emAndamento, bloqueados, atrasados, semPrazo, demandas }) => {
                        const hasAlert = bloqueados > 0 || atrasados > 0 || semPrazo > 2;
                        return (
                          <tr
                            key={user.id}
                            className={`hover:bg-muted/30 transition-colors ${
                              hasAlert ? "bg-red-50/30 dark:bg-red-950/10" : ""
                            }`}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="h-7 w-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                                  {iniciais(user.nome)}
                                </div>
                                <div>
                                  <p className="font-semibold text-foreground">{user.nome}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {user.cargo.nome}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className="font-bold tabular-nums text-foreground">
                                {total}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className="font-medium tabular-nums text-sky-600 dark:text-sky-400">
                                {emAndamento || "—"}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              {bloqueados > 0 ? (
                                <span className="font-bold tabular-nums text-red-600 dark:text-red-400">
                                  {bloqueados}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-center">
                              {atrasados > 0 ? (
                                <span className="font-bold tabular-nums text-orange-600 dark:text-orange-400">
                                  {atrasados}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-center">
                              {semPrazo > 0 ? (
                                <span className={`font-bold tabular-nums ${semPrazo > 2 ? "text-yellow-600 dark:text-yellow-400" : "text-muted-foreground"}`}>
                                  {semPrazo}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-center">
                              {demandas > 0 ? (
                                <span className="font-medium tabular-nums text-violet-600 dark:text-violet-400">
                                  {demandas}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-1.5 min-w-[64px]">
                                <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      total >= 8
                                        ? "bg-red-500"
                                        : total >= 5
                                        ? "bg-orange-400"
                                        : "bg-emerald-500"
                                    }`}
                                    style={{ width: `${Math.min((total / 10) * 100, 100)}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-muted-foreground tabular-nums w-4 text-right">
                                  {total}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <Link
                                href={`/dashboard/kanban?responsavelId=${user.id}`}
                                className="text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5 whitespace-nowrap"
                              >
                                Ver <ChevronRight className="h-3 w-3" />
                              </Link>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
