import { getSession } from "@/lib/session";
import { redirect, notFound } from "next/navigation";
import { projetoService } from "@/services/projeto.service";
import { ProjetoDetalheClient } from "./projeto-detalhe-client";
import { hasProjectAccess } from "@/lib/authorization";

export default async function ProjetoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const projeto = await projetoService.getById(id);
  if (!projeto) notFound();

  const temAcesso = await hasProjectAccess(session.id, session.cargo.slug, id);
  if (!temAcesso) notFound();

  // Serialize Date objects before passing to Client Component
  const projetoSerializado = {
    ...projeto,
    dataInicio: projeto.dataInicio?.toISOString() ?? null,
    dataPrevisao: projeto.dataPrevisao?.toISOString() ?? null,
    createdAt: projeto.createdAt.toISOString(),
    updatedAt: projeto.updatedAt.toISOString(),
    sprints: projeto.sprints.map((s) => ({
      ...s,
      dataInicio: s.dataInicio?.toISOString() ?? null,
      dataFim: s.dataFim?.toISOString() ?? null,
    })),
    cards: projeto.cards.map((c) => ({
      ...c,
      prazo: c.prazo?.toISOString() ?? null,
    })),
  };

  return <ProjetoDetalheClient projeto={projetoSerializado} projetoId={id} />;
}
