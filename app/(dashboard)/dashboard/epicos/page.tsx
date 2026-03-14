import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { projetoService } from "@/services/projeto.service";
import { EpicosPageClient } from "./epicos-page-client";
import { getAccessibleProjectIds } from "@/lib/authorization";

export default async function EpicosPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const projectIds = await getAccessibleProjectIds(session.id, session.cargo.slug);
  const projetos = await projetoService.list(projectIds);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Épicos</h1>
        <p className="text-muted-foreground">
          Agrupe cards relacionados em épicos para rastrear entregas de valor.
        </p>
      </div>
      <EpicosPageClient projetos={projetos} />
    </div>
  );
}
