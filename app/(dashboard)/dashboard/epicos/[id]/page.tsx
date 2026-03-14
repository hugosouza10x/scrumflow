import { getSession } from "@/lib/session";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardStatusBadge, PrioridadeBadge } from "@/components/ui/status-badge";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { EmptyState } from "@/components/ui/empty-state";
import { EpicoActions } from "./epico-actions";
import { LayoutList } from "lucide-react";
import type { CardStatus, Prioridade } from "@/types";

const STATUS_LABEL: Record<string, string> = {
  ABERTO: "Aberto", EM_ANDAMENTO: "Em andamento", CONCLUIDO: "Concluído", CANCELADO: "Cancelado",
};
const STATUS_COLOR: Record<string, string> = {
  ABERTO: "bg-slate-100 text-slate-600",
  EM_ANDAMENTO: "bg-sky-100 text-sky-700",
  CONCLUIDO: "bg-green-100 text-green-700",
  CANCELADO: "bg-gray-100 text-gray-500",
};

export default async function EpicoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const epico = await prisma.epico.findUnique({
    where: { id },
    include: {
      projeto: { select: { id: true, nome: true } },
      cards: {
        select: {
          id: true, titulo: true, status: true, prioridade: true, estimativa: true,
          responsavel: { select: { id: true, nome: true } },
          _count: { select: { subtarefas: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!epico) notFound();

  const totalPts = epico.cards.reduce((acc, c) => acc + (c.estimativa ?? 0), 0);
  const concluidos = epico.cards.filter((c) => c.status === "CONCLUIDO").length;
  const pctConcluido = epico.cards.length > 0 ? Math.round((concluidos / epico.cards.length) * 100) : 0;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/epicos" className="text-sm text-muted-foreground hover:underline">
            ← Épicos
          </Link>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl font-bold">{epico.nome}</h1>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLOR[epico.status] ?? ""}`}>
              {STATUS_LABEL[epico.status] ?? epico.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Projeto: {epico.projeto.nome}
          </p>
        </div>
        <EpicoActions epico={{ id: epico.id, status: epico.status }} />
      </div>

      {epico.descricao && (
        <Card>
          <CardHeader><CardTitle className="text-base">Descrição</CardTitle></CardHeader>
          <CardContent>
            <MarkdownContent content={epico.descricao} />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{epico.cards.length}</p>
            <p className="text-sm text-muted-foreground mt-1">Cards</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-primary">{totalPts}</p>
            <p className="text-sm text-muted-foreground mt-1">Pontos totais</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-3xl font-bold text-center">{pctConcluido}%</p>
            <p className="text-sm text-muted-foreground mt-1 text-center">Concluído</p>
            <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${pctConcluido}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cards ({epico.cards.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {epico.cards.length === 0 ? (
            <EmptyState
              icon={LayoutList}
              title="Nenhum card neste épico"
              description="Associe cards a este épico ao criar ou editar um card."
              className="border-0 py-8"
            />
          ) : (
            <ul className="space-y-2">
              {epico.cards.map((c) => (
                <li key={c.id} className="flex items-center gap-3 rounded-md border p-3 text-sm">
                  <CardStatusBadge status={c.status as CardStatus} className="shrink-0" />
                  <Link href={`/dashboard/cards/${c.id}`} className="font-medium hover:underline flex-1 truncate">
                    {c.titulo}
                  </Link>
                  <PrioridadeBadge prioridade={c.prioridade as Prioridade} className="shrink-0" />
                  {c.estimativa != null && (
                    <span className="text-xs text-muted-foreground shrink-0">{c.estimativa} pts</span>
                  )}
                  {c.responsavel && (
                    <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                      {c.responsavel.nome}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
