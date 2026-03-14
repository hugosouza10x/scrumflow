import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { projetoService } from "@/services/projeto.service";
import { KanbanPageClient } from "./kanban-page-client";
import { Suspense } from "react";
import { getAccessibleProjectIds } from "@/lib/authorization";

export default async function KanbanPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const projectIds = await getAccessibleProjectIds(session.id, session.cargo.slug);
  const projetos = await projetoService.list(projectIds);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Kanban</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Arraste cards entre colunas · clique em <strong>+</strong> para criar rapidamente · use os filtros para focar no que importa.
        </p>
      </div>
      <Suspense>
        <KanbanPageClient projetos={projetos} sessionUserId={session.id} />
      </Suspense>
    </div>
  );
}
