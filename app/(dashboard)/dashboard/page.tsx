import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getAccessibleProjectIds, buildProjectFilter } from "@/lib/authorization";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CardStatusBadge, PrioridadeBadge } from "@/components/ui/status-badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  FolderKanban,
  LayoutList,
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
} from "lucide-react";
import type { CardStatus } from "@/types";

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUS_ORDER: CardStatus[] = [
  "BACKLOG",
  "PRONTO_PARA_SPRINT",
  "A_FAZER",
  "EM_ANDAMENTO",
  "EM_REVISAO",
  "BLOQUEADO",
  "HOMOLOGACAO",
  "CONCLUIDO",
  "CANCELADO",
];

const PRIORIDADE_ORDER = ["URGENTE", "ALTA", "MEDIA", "BAIXA"] as const;

const PRIORIDADE_COLORS = {
  URGENTE: { bar: "bg-red-500", text: "text-red-600 dark:text-red-400", label: "Urgente" },
  ALTA: { bar: "bg-orange-500", text: "text-orange-600 dark:text-orange-400", label: "Alta" },
  MEDIA: { bar: "bg-blue-500", text: "text-blue-600 dark:text-blue-400", label: "Média" },
  BAIXA: { bar: "bg-slate-400", text: "text-slate-500 dark:text-slate-400", label: "Baixa" },
} as const;

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

  const projetoAtivoFilter =
    projectIds === "all"
      ? { status: "ATIVO" as const }
      : { status: "ATIVO" as const, id: { in: projectIds as string[] } };

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

  // Typed aliases for use inside $transaction (groupBy requires exact types)
  const cardFilter = cardProjetoFilter as Prisma.CardWhereInput;
  const demandaWhere = demandaFilter as Prisma.DemandaWhereInput;

  const hoje = new Date();
  const doisDiasAtras = new Date(hoje);
  doisDiasAtras.setDate(hoje.getDate() - 2);
  const em21Dias = new Date(hoje);
  em21Dias.setDate(hoje.getDate() + 21);
  const ha7Dias = new Date(hoje);
  ha7Dias.setDate(hoje.getDate() - 7);

  // ─── Batch 1: KPIs e sprints (transação única) ───────────────────────────
  const [
    totalProjetos,
    totalCardsAtivos,
    cardsBloqueados,
    cardsAtrasados,
    cardsSemAtualizacao,
    totalDemandasAtivas,
    sprintsAtivas,
  ] = await prisma.$transaction([
    prisma.projeto.count({ where: projetoAtivoFilter }),
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
  ]);

  // ─── Batch 2: análise e visualizações (interactive transaction — 1 conexão) ─
  const {
    cardsPorStatusRaw,
    cardsPorPrioridadeRaw,
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
    const cardsPorPrioridadeRaw = await tx.card.groupBy({
      by: ["prioridade"],
      where: { ...cardFilter, status: { notIn: ["CONCLUIDO", "CANCELADO"] } },
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
      take: 7,
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
      cardsPorPrioridadeRaw,
      demandasPorStatusRaw,
      cardsAtencaoList,
      cardsTimeline,
      sprintsTimeline,
      teamCardsRaw,
      demandasPorUserRaw,
    };
  });

  // ─── Sprint progress (standalone — conditional) ───────────────────────────
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

  const { teamUsers, cardsBloqueadosPorUser, cardsAtrasadosPorUser, cardsEmAndamentoPorUser } =
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
          return { teamUsers, cardsBloqueadosPorUser, cardsAtrasadosPorUser, cardsEmAndamentoPorUser };
        })
      : { teamUsers: [], cardsBloqueadosPorUser: [], cardsAtrasadosPorUser: [], cardsEmAndamentoPorUser: [] };

  const teamWorkload = teamUsers
    .map((user) => ({
      user,
      total: teamCardsRaw.find((r) => r.responsavelId === user.id)?._count.id ?? 0,
      emAndamento:
        cardsEmAndamentoPorUser.find((r) => r.responsavelId === user.id)?._count.id ?? 0,
      bloqueados:
        cardsBloqueadosPorUser.find((r) => r.responsavelId === user.id)?._count.id ?? 0,
      atrasados:
        cardsAtrasadosPorUser.find((r) => r.responsavelId === user.id)?._count.id ?? 0,
      demandas: demandasPorUserRaw.find((r) => r.responsavelId === user.id)?._count.id ?? 0,
    }))
    .filter((m) => m.total > 0 || m.demandas > 0)
    .sort((a, b) => b.total - a.total);

  // ─── Computed values ──────────────────────────────────────────────────────
  const cardsPorStatus = STATUS_ORDER.map((s) => ({
    status: s,
    count: cardsPorStatusRaw.find((r) => r.status === s)?._count.id ?? 0,
  })).filter((s) => s.count > 0);

  const cardsPorPrioridade = PRIORIDADE_ORDER.map((p) => ({
    prioridade: p,
    count: cardsPorPrioridadeRaw.find((r) => r.prioridade === p)?._count.id ?? 0,
  }));
  const maxPrioridade = Math.max(...cardsPorPrioridade.map((p) => p.count), 1);

  const demandasNaoRefinadas =
    demandasPorStatusRaw.find((d) => d.statusRefinamento === "NAO_REFINADO")?._count.id ?? 0;
  const demandasEmRefinamento =
    demandasPorStatusRaw.find((d) => d.statusRefinamento === "EM_REFINAMENTO")?._count.id ?? 0;
  const demandasProntas =
    demandasPorStatusRaw.find((d) => d.statusRefinamento === "PRONTO_PARA_SPRINT")?._count.id ?? 0;
  const totalFunil = demandasNaoRefinadas + demandasEmRefinamento + demandasProntas;

  // Timeline: 3 semanas
  const weeks = [0, 1, 2].map((i) => {
    const start = new Date(hoje);
    start.setDate(hoje.getDate() + i * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const label =
      i === 0
        ? "Esta semana"
        : i === 1
        ? "Próxima semana"
        : `${formatDate(start)} – ${formatDate(end)}`;
    const cardsNaSemana = cardsTimeline.filter(
      (c) => c.prazo && isSameWeek(new Date(c.prazo), start, end)
    );
    const sprintsNaSemana = sprintsTimeline.filter((s) => {
      const si = new Date(s.dataInicio);
      const sf = new Date(s.dataFim);
      return si <= end && sf >= start;
    });
    return { label, start, end, cards: cardsNaSemana, sprints: sprintsNaSemana };
  });

  // ─── KPIs ─────────────────────────────────────────────────────────────────
  const kpis = [
    {
      label: "Projetos ativos",
      value: totalProjetos,
      icon: FolderKanban,
      href: "/dashboard/projetos",
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      label: "Cards ativos",
      value: totalCardsAtivos,
      icon: LayoutList,
      color: "text-slate-600 dark:text-slate-300",
      bg: "bg-slate-50 dark:bg-slate-800/40",
    },
    {
      label: "Bloqueados",
      value: cardsBloqueados,
      icon: ShieldAlert,
      href: "/dashboard/kanban",
      color:
        cardsBloqueados > 0
          ? "text-red-600 dark:text-red-400"
          : "text-slate-500 dark:text-slate-400",
      bg: cardsBloqueados > 0 ? "bg-red-50 dark:bg-red-950/30" : "bg-slate-50 dark:bg-slate-800/40",
      border: cardsBloqueados > 0 ? "border-red-200 dark:border-red-900" : undefined,
    },
    {
      label: "Atrasados",
      value: cardsAtrasados,
      icon: Clock,
      color:
        cardsAtrasados > 0
          ? "text-orange-600 dark:text-orange-400"
          : "text-slate-500 dark:text-slate-400",
      bg:
        cardsAtrasados > 0
          ? "bg-orange-50 dark:bg-orange-950/30"
          : "bg-slate-50 dark:bg-slate-800/40",
      border: cardsAtrasados > 0 ? "border-orange-200 dark:border-orange-900" : undefined,
    },
    {
      label: "Demandas no funil",
      value: totalDemandasAtivas,
      icon: Inbox,
      href: "/dashboard/backlog",
      color: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-50 dark:bg-violet-950/30",
    },
    {
      label: "Sem atualização",
      value: cardsSemAtualizacao,
      icon: AlertTriangle,
      color:
        cardsSemAtualizacao > 0
          ? "text-amber-600 dark:text-amber-400"
          : "text-slate-500 dark:text-slate-400",
      bg:
        cardsSemAtualizacao > 0
          ? "bg-amber-50 dark:bg-amber-950/30"
          : "bg-slate-50 dark:bg-slate-800/40",
      border:
        cardsSemAtualizacao > 0 ? "border-amber-200 dark:border-amber-900" : undefined,
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

      {/* ── KPI Strip ─────────────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          const inner = (
            <Card
              className={[
                "transition-all",
                kpi.border ? `border ${kpi.border}` : "",
                kpi.href ? "hover:shadow-sm" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground leading-tight">
                  {kpi.label}
                </CardTitle>
                <div className={`rounded-md p-1.5 ${kpi.bg} shrink-0`}>
                  <Icon className={`h-3.5 w-3.5 ${kpi.color}`} />
                </div>
              </CardHeader>
              <CardContent className="pb-4 px-4">
                <p className={`text-2xl font-bold tabular-nums ${kpi.color}`}>{kpi.value}</p>
              </CardContent>
            </Card>
          );
          return kpi.href ? (
            <Link key={kpi.label} href={kpi.href} className="block">
              {inner}
            </Link>
          ) : (
            <div key={kpi.label}>{inner}</div>
          );
        })}
      </div>

      {/* ── Sprints em andamento ───────────────────────────────────────────── */}
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

      {/* ── Funil de Demandas + Atenção ───────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
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

        {/* Requer atenção */}
        <Card
          className={
            cardsAtencaoList.length > 0
              ? "border-amber-200/70 dark:border-amber-900/50"
              : ""
          }
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {cardsAtencaoList.length > 0 && (
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                )}
                <div>
                  <CardTitle className="text-sm">Requer atenção</CardTitle>
                  <CardDescription>Cards bloqueados ou com prazo vencido</CardDescription>
                </div>
              </div>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  cardsAtencaoList.length > 0
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {cardsAtencaoList.length}
              </span>
            </div>
          </CardHeader>
          <CardContent>
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
              <div className="space-y-1.5">
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
                      <PrioridadeBadge
                        prioridade={card.prioridade}
                        className="shrink-0 text-[10px] py-0 px-1.5"
                      />
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Distribuição por Prioridade + Status ──────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Por Prioridade */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Distribuição por prioridade</CardTitle>
            <CardDescription>Cards ativos por nível de urgência</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {cardsPorPrioridade.map(({ prioridade, count }) => {
              const cfg = PRIORIDADE_COLORS[prioridade as keyof typeof PRIORIDADE_COLORS];
              const pct = Math.max((count / maxPrioridade) * 100, count > 0 ? 5 : 0);
              return (
                <div key={prioridade} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-medium ${cfg.text}`}>{cfg.label}</span>
                    <span className="font-bold tabular-nums text-foreground">{count}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${cfg.bar}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Por Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Distribuição por status</CardTitle>
            <CardDescription>Todos os cards por etapa do fluxo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {cardsPorStatus.map((s) => (
                <div
                  key={s.status}
                  className="flex items-center justify-between rounded-lg border px-3 py-2"
                >
                  <CardStatusBadge status={s.status} />
                  <span className="text-sm font-bold tabular-nums">{s.count}</span>
                </div>
              ))}
              {cardsPorStatus.length === 0 && (
                <p className="col-span-2 text-center text-sm text-muted-foreground py-4">
                  Nenhum card.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Linha do tempo: próximas 3 semanas ────────────────────────────── */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" /> Linha do tempo · Próximas 3 semanas
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {weeks.map((week, wi) => (
            <Card key={wi} className={wi === 0 ? "border-primary/30 bg-primary/[0.02]" : ""}>
              <CardHeader className="pb-2 pt-4">
                <CardTitle
                  className={`text-xs font-semibold ${
                    wi === 0 ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {week.label}
                </CardTitle>
                <CardDescription className="text-[10px]">
                  {formatDate(week.start)} – {formatDate(week.end)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {/* Sprints desta semana */}
                {week.sprints.length > 0 && (
                  <div className="space-y-1">
                    {week.sprints.map((sprint) => (
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
                {/* Cards com prazo nesta semana */}
                {week.cards.length > 0 ? (
                  <div className="space-y-1">
                    {week.cards.slice(0, 5).map((card) => (
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
                    {week.cards.length > 5 && (
                      <p className="text-center text-[10px] text-muted-foreground pt-0.5">
                        +{week.cards.length - 5} cards
                      </p>
                    )}
                  </div>
                ) : week.sprints.length === 0 ? (
                  <p className="text-center text-[10px] text-muted-foreground py-3">
                    Sem entregas previstas
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ── Distribuição da equipe ─────────────────────────────────────────── */}
      {teamWorkload.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> Distribuição da equipe
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
                        Cards ativos
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
                        Demandas
                      </th>
                      <th className="px-3 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {teamWorkload.map(
                      ({ user, total, emAndamento, bloqueados, atrasados, demandas }) => {
                        const hasAlert = bloqueados > 0 || atrasados > 0;
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
                              <span
                                className={`font-bold tabular-nums ${
                                  total >= 8
                                    ? "text-red-600 dark:text-red-400"
                                    : total >= 5
                                    ? "text-orange-600 dark:text-orange-400"
                                    : "text-foreground"
                                }`}
                              >
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
                              {demandas > 0 ? (
                                <span className="font-medium tabular-nums text-violet-600 dark:text-violet-400">
                                  {demandas}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
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
