import { getSession } from "@/lib/session";
import { redirect, notFound } from "next/navigation";
import { sprintService } from "@/services/sprint.service";
import { hasProjectAccess } from "@/lib/authorization";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SprintStatusBadge } from "@/components/ui/status-badge";
import type { SprintStatus } from "@/types";
import { SprintDetalheClient } from "./sprint-detalhe-client";
import { VelocityChart } from "@/components/charts/velocity-chart";

export default async function SprintDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const sprint = await sprintService.getById(id);
  if (!sprint) notFound();

  const temAcesso = await hasProjectAccess(session.id, session.cargo.slug, sprint.projetoId);
  if (!temAcesso) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/sprints" className="text-sm text-muted-foreground hover:underline">
          ← Sprints
        </Link>
        <h1 className="text-2xl font-bold mt-1">{sprint.nome}</h1>
        <div className="flex items-center gap-2 mt-1">
          <SprintStatusBadge status={sprint.status as SprintStatus} />
          <span className="text-sm text-muted-foreground">· {sprint.projeto.nome}</span>
        </div>
        {sprint.objetivo && (
          <p className="text-sm mt-1">{sprint.objetivo}</p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informações</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <p>
            {new Date(sprint.dataInicio).toLocaleDateString("pt-BR")} –{" "}
            {new Date(sprint.dataFim).toLocaleDateString("pt-BR")}
          </p>
          {sprint.capacidadeTotal != null && (
            <p>Capacidade: {sprint.capacidadeTotal} pts</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Velocity do projeto</CardTitle>
        </CardHeader>
        <CardContent>
          <VelocityChart projetoId={sprint.projetoId} />
        </CardContent>
      </Card>

      <SprintDetalheClient
        sprintId={id}
        cards={sprint.cards as Parameters<typeof SprintDetalheClient>[0]["cards"]}
        capacidadeTotal={sprint.capacidadeTotal}
      />
    </div>
  );
}
