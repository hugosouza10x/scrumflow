import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { projetoService } from "@/services/projeto.service";
import { getAccessibleProjectIds } from "@/lib/authorization";
import { EmptyState } from "@/components/ui/empty-state";
import { PrioridadeBadge, ProjetoStatusBadge } from "@/components/ui/status-badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  FolderKanban, Users, Zap, CalendarDays, AlertTriangle, CheckCircle2,
} from "lucide-react";
import type { Prioridade, ProjetoStatus } from "@/types";

const STATUS_BORDER: Record<string, string> = {
  ATIVO: "border-l-primary",
  PAUSADO: "border-l-amber-400",
  CONCLUIDO: "border-l-green-500",
  CANCELADO: "border-l-gray-300",
};

function ProgressBar({ pct }: { pct: number }) {
  const color = pct === 100 ? "bg-green-500" : pct >= 60 ? "bg-primary" : pct >= 30 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>Conclusão</span>
        <span className="font-semibold">{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default async function ProjetosPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const projectIds = await getAccessibleProjectIds(session.id, session.cargo.slug);
  const projetos = await projetoService.list(projectIds);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projetos</h1>
          <p className="text-muted-foreground">Gerencie os projetos do time.</p>
        </div>
        <Link href="/dashboard/projetos/novo">
          <Button>Novo projeto</Button>
        </Link>
      </div>

      {projetos.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Nenhum projeto cadastrado"
          description="Crie seu primeiro projeto para começar a organizar o trabalho do time."
          action={{ label: "Novo projeto", href: "/dashboard/projetos/novo" }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projetos.map((p) => {
            const totalCards = p.cards.length;
            const concluidosCards = p.cards.filter((c) => c.status === "CONCLUIDO").length;
            const pct = totalCards > 0 ? Math.round((concluidosCards / totalCards) * 100) : 0;
            const today = new Date();
            const atrasadosCards = p.cards.filter(
              (c) => c.prazo && !["CONCLUIDO", "CANCELADO"].includes(c.status) && new Date(c.prazo) < today
            ).length;
            const sprintAtiva = p.sprints[0] ?? null;
            const isOverdue = p.dataPrevisao && new Date(p.dataPrevisao) < today && p.status !== "CONCLUIDO";
            const diasRestantes = p.dataPrevisao
              ? Math.ceil((new Date(p.dataPrevisao).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
              : null;

            return (
              <Link
                key={p.id}
                href={`/dashboard/projetos/${p.id}`}
                className="block group"
              >
                <div
                  className={`flex flex-col h-full rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow border-l-4 ${STATUS_BORDER[p.status] ?? "border-l-muted"}`}
                >
                  {/* Header */}
                  <div className="px-4 pt-4 pb-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {p.cliente && (
                          <span
                            className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded mb-1 leading-tight"
                            style={{
                              color: p.cliente.cor ?? "#94a3b8",
                              backgroundColor: p.cliente.cor ? `${p.cliente.cor}18` : "#f1f5f9",
                              border: `1px solid ${p.cliente.cor ?? "#94a3b8"}40`,
                            }}
                          >
                            {p.cliente.nome}
                          </span>
                        )}
                        <h3 className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
                          {p.nome}
                        </h3>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <PrioridadeBadge prioridade={p.prioridade as Prioridade} />
                        <ProjetoStatusBadge status={p.status as ProjetoStatus} />
                      </div>
                    </div>

                    {p.descricao && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{p.descricao}</p>
                    )}
                  </div>

                  {/* Progress */}
                  <div className="px-4 pb-3">
                    <ProgressBar pct={pct} />
                  </div>

                  {/* Stats */}
                  <div className="px-4 pb-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-md bg-muted/50 px-2 py-1.5">
                      <p className="text-xs font-semibold">{totalCards}</p>
                      <p className="text-[10px] text-muted-foreground">cards</p>
                    </div>
                    <div className={`rounded-md px-2 py-1.5 ${atrasadosCards > 0 ? "bg-red-50 dark:bg-red-950/20" : "bg-muted/50"}`}>
                      <p className={`text-xs font-semibold ${atrasadosCards > 0 ? "text-red-600" : ""}`}>{atrasadosCards}</p>
                      <p className="text-[10px] text-muted-foreground">atrasados</p>
                    </div>
                    <div className="rounded-md bg-muted/50 px-2 py-1.5">
                      <p className="text-xs font-semibold">{p.membros.length}</p>
                      <p className="text-[10px] text-muted-foreground">membros</p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-4 pb-4 mt-auto space-y-1.5">
                    {sprintAtiva && (
                      <div className="flex items-center gap-1 text-[11px] text-primary">
                        <Zap className="h-3 w-3" />
                        <span className="truncate">{sprintAtiva.nome} em andamento</span>
                      </div>
                    )}
                    {p.lider && (
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span className="truncate">Líder: {p.lider.nome}</span>
                      </div>
                    )}
                    {diasRestantes !== null && (
                      <div className={`flex items-center gap-1 text-[11px] ${isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                        {isOverdue ? <AlertTriangle className="h-3 w-3" /> : <CalendarDays className="h-3 w-3" />}
                        {isOverdue
                          ? `Atrasado ${Math.abs(diasRestantes)} dias`
                          : diasRestantes === 0 ? "Entrega hoje"
                          : `${diasRestantes} dias restantes`}
                      </div>
                    )}
                    {pct === 100 && (
                      <div className="flex items-center gap-1 text-[11px] text-green-600 font-medium">
                        <CheckCircle2 className="h-3 w-3" />
                        Todas as tarefas concluídas
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
