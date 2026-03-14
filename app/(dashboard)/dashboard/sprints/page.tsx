import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { projetoService } from "@/services/projeto.service";
import { SprintsPageClient } from "./sprints-page-client";
import { getAccessibleProjectIds } from "@/lib/authorization";

export default async function SprintsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const projectIds = await getAccessibleProjectIds(session.id, session.cargo.slug);
  const projetos = await projetoService.list(projectIds);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sprints</h1>
        <p className="text-muted-foreground">
          Ciclos de trabalho. Crie sprints e gerencie os cards.
        </p>
      </div>
      <SprintsPageClient projetos={projetos} />
    </div>
  );
}
