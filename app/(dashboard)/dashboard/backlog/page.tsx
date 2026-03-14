import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { projetoService } from "@/services/projeto.service";
import { BacklogPageClient } from "./backlog-page-client";
import { getAccessibleProjectIds } from "@/lib/authorization";

export default async function BacklogPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const projectIds = await getAccessibleProjectIds(session.id, session.cargo.slug);
  const projetos = await projetoService.list(projectIds);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Backlog</h1>
        <p className="text-muted-foreground">
          Demandas e refinamento. Transforme demandas em cards quando estiverem prontas.
        </p>
      </div>
      <BacklogPageClient projetos={projetos} />
    </div>
  );
}
