import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getAccessibleProjectIds, buildProjectFilter } from "@/lib/authorization";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CardStatusBadge } from "@/components/ui/status-badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FolderKanban, LayoutList, ShieldAlert, Clock, AlertTriangle, Users, Zap, CalendarDays } from "lucide-react";
import type { CardStatus } from "@/types";

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

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  // Obter projetos acessíveis ao usuário
  const projectIds = await getAccessibleProjectIds(session.id, session.cargo.slug);
  const projetoFilter = buildProjectFilter(projectIds);
  const cardProjetoFilter = buildProjectFilter(projectIds, { includeAvulsas: true });

  // Filtro para projetos ativos acessíveis
  const projetoAtivoFilter =
    projectIds === "all"
      ? { status: "ATIVO" as const }
      : { status: "ATIVO" as const, id: { in: projectIds as string[] } };

  // Filtro de sprint acessível
  const sprintProjetoFilter =
    projectIds === "all" ? {} : { projetoId: { in: projectIds as string[] } };

  const [totalProjetos, totalCardsAtivos, cardsBloqueados, cardsAtrasados, sprintsAtivas] =
    await Promise.all([
      prisma.projeto.count({ where: projetoAtivoFilter }),
      prisma.card.count({ where: { ...cardProjetoFilter, status: { notIn: ["CONCLUIDO", "CANCELADO"] } } }),
      prisma.card.count({ where: { ...cardProjetoFilter, bloqueado: true } }),
      prisma.card.count({
        where: { ...cardProjetoFilter, prazo: { lt: new Date() }, status: { notIn: ["CONCLUIDO", "CANCELADO"] } },
      }),
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

  const doisDiasAtras = new Date();
  doisDiasAtras.setDate(doisDiasAtras.getDate() - 2);
  const cardsSemAtualizacao = await prisma.card.count({
    where: {
      ...cardProjetoFilter,
      status: { notIn: ["CONCLUIDO", "CANCELADO"] },
      OR: [
        { ultimaAtualizacao: null },
        { ultimaAtualizacao: { lt: doisDiasAtras } },
      ],
    },
  });

  // Cards concluídos por sprint ativa (para calcular progresso)
  const concluidosPorSprint =
    sprintsAtivas.length > 0
      ? await prisma.card.groupBy({
          by: ["sprintId"],
          where: {
            sprintId: { in: sprintsAtivas.map((s) => s.id) },
            status: "CONCLUIDO",
          },
          _count: { id: true },
        })
      : [];

  const sprintsComProgresso = sprintsAtivas.map((s) => {
    const concluidos = concluidosPorSprint.find((c) => c.sprintId === s.id)?._count.id ?? 0;
    const total = s._count.cards;
    const pct = total > 0 ? Math.round((concluidos / total) * 100) : 0;
    const diasRestantes = Math.ceil(
      (new Date(s.dataFim).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return { ...s, concluidos, total, pct, diasRestantes };
  });

  const [cardsPorStatusRaw, teamWorkload] = await Promise.all([
    prisma.card.groupBy({ by: ["status"], where: cardProjetoFilter, _count: { id: true } }),
    prisma.card
      .groupBy({
        by: ["responsavelId"],
        where: { ...cardProjetoFilter, status: { notIn: ["CONCLUIDO", "CANCELADO"] }, responsavelId: { not: null } },
        _count: { id: true },
      })
      .then(async (rows) => {
        const userIds = rows.map((r) => r.responsavelId!);
        const [users, bloqueados, atrasados] = await Promise.all([
          prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, nome: true } }),
          prisma.card.groupBy({
            by: ["responsavelId"],
            where: {
              ...cardProjetoFilter,
              bloqueado: true,
              status: { notIn: ["CONCLUIDO", "CANCELADO"] },
              responsavelId: { in: userIds },
            },
            _count: { id: true },
          }),
          prisma.card.groupBy({
            by: ["responsavelId"],
            where: {
              ...cardProjetoFilter,
              prazo: { lt: new Date() },
              status: { notIn: ["CONCLUIDO", "CANCELADO"] },
              responsavelId: { in: userIds },
            },
            _count: { id: true },
          }),
        ]);
        return rows
          .map((r) => ({
            user:
              users.find((u) => u.id === r.responsavelId) ?? { id: r.responsavelId!, nome: "?" },
            total: r._count.id,
            bloqueados:
              bloqueados.find((b) => b.responsavelId === r.responsavelId)?._count.id ?? 0,
            atrasados: atrasados.find((a) => a.responsavelId === r.responsavelId)?._count.id ?? 0,
          }))
          .sort((a, b) => b.total - a.total);
      }),
  ]);

  const cardsPorStatus = STATUS_ORDER.map((s) => ({
    status: s,
    count: cardsPorStatusRaw.find((r) => r.status === s)?._count.id ?? 0,
  })).filter((s) => s.count > 0);

  const kpis = [
    {
      label: "Projetos ativos",
      value: totalProjetos,
      icon: FolderKanban,
      href: "/dashboard/projetos",
      linkLabel: "Ver projetos",
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      label: "Cards ativos",
      value: totalCardsAtivos,
      icon: LayoutList,
      color: "text-slate-600",
      bg: "bg-slate-50 dark:bg-slate-800/30",
    },
    {
      label: "Cards bloqueados",
      value: cardsBloqueados,
      icon: ShieldAlert,
      color: cardsBloqueados > 0 ? "text-red-600" : "text-slate-600",
      bg: cardsBloqueados > 0 ? "bg-red-50 dark:bg-red-950/30" : "bg-slate-50 dark:bg-slate-800/30",
    },
    {
      label: "Cards atrasados",
      value: cardsAtrasados,
      icon: Clock,
      color: cardsAtrasados > 0 ? "text-orange-600" : "text-slate-600",
      bg:
        cardsAtrasados > 0
          ? "bg-orange-50 dark:bg-orange-950/30"
          : "bg-slate-50 dark:bg-slate-800/30",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral dos projetos e cards.</p>
      </div>

      {/* Sprints ativas em destaque */}
      {sprintsComProgresso.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-primary" /> Sprint{sprintsComProgresso.length > 1 ? "s" : ""} em andamento
          </h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {sprintsComProgresso.map((s) => (
              <Link
                key={s.id}
                href={`/dashboard/sprints/${s.id}`}
                className="rounded-xl border border-primary/30 bg-primary/5 p-4 hover:border-primary/60 hover:bg-primary/10 transition-all group"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="font-semibold text-sm group-hover:text-primary transition-colors">
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

                {/* Barra de progresso */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{s.concluidos}/{s.total} cards</span>
                    <span className="font-semibold text-primary">{s.pct}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-primary/15 overflow-hidden">
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

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{kpi.label}</CardTitle>
                <div className={`rounded-md p-2 ${kpi.bg}`}>
                  <Icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <p className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
                {kpi.href && (
                  <Link href={kpi.href}>
                    <Button variant="link" className="px-0 text-xs text-muted-foreground h-auto mt-1">
                      {kpi.linkLabel} →
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {cardsSemAtualizacao > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <div className="rounded-md bg-amber-100 p-2 dark:bg-amber-900/40">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-base text-amber-800 dark:text-amber-300">
                Cards sem atualização
              </CardTitle>
              <CardDescription className="text-amber-700/70 dark:text-amber-400/70">
                Cards em andamento sem atualização há mais de 2 dias.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-700 dark:text-amber-400">
              {cardsSemAtualizacao}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cards por status</CardTitle>
            <CardDescription>Distribuição atual de todos os cards.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {cardsPorStatus.map((s) => (
                <div
                  key={s.status}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <CardStatusBadge status={s.status} />
                  <span className="text-sm font-semibold tabular-nums">{s.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {teamWorkload.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="rounded-md bg-primary/10 p-2">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle>Carga da equipe</CardTitle>
                <CardDescription>Cards ativos por membro.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {teamWorkload.map(({ user, total, bloqueados, atrasados }) => (
                  <div key={user.id} className="flex items-center gap-3 rounded-lg border p-2.5">
                    <div className="h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      {user.nome
                        .split(" ")
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </div>
                    <Link
                      href={`/dashboard/kanban?responsavelId=${user.id}`}
                      className="flex-1 min-w-0 text-sm font-medium hover:text-primary transition-colors truncate"
                    >
                      {user.nome}
                    </Link>
                    <div className="flex items-center gap-2 text-xs tabular-nums flex-shrink-0">
                      <span className="font-semibold">{total}</span>
                      {bloqueados > 0 && (
                        <span className="text-red-600 font-medium">{bloqueados} bloq.</span>
                      )}
                      {atrasados > 0 && (
                        <span className="text-orange-600 font-medium">{atrasados} atr.</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
