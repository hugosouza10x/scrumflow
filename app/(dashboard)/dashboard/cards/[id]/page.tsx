import { getSession } from "@/lib/session";
import { redirect, notFound } from "next/navigation";
import { cardService } from "@/services/card.service";
import { usuarioService } from "@/services/usuario.service";
import { sprintService } from "@/services/sprint.service";
import { CardInlineClient } from "./card-inline-client";
import { hasProjectAccess } from "@/lib/authorization";

export default async function CardDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const card = await cardService.getById(id);
  if (!card) notFound();

  // Verificar acesso ao projeto do card
  if (card.projetoId) {
    const temAcesso = await hasProjectAccess(session.id, session.cargo.slug, card.projetoId);
    if (!temAcesso) notFound();
  }

  const [usuarios, sprintsDoProjeto] = await Promise.all([
    usuarioService.listActive(),
    card.projetoId ? sprintService.list({ projetoId: card.projetoId }) : Promise.resolve([]),
  ]);

  // Serialize Date objects before passing to Client Component
  const cardSerializado = {
    id: card.id,
    titulo: card.titulo,
    descricao: card.descricao,
    criteriosAceite: card.criteriosAceite,
    status: card.status,
    prioridade: card.prioridade,
    estimativa: card.estimativa,
    prazo: card.prazo?.toISOString() ?? null,
    bloqueado: card.bloqueado,
    motivoBloqueio: card.motivoBloqueio,
    bloqueadoPorId: card.bloqueadoPorId ?? null,
    bloqueadoPor: card.bloqueadoPor ? { id: card.bloqueadoPor.id, titulo: card.bloqueadoPor.titulo } : null,
    responsavelId: card.responsavelId,
    responsavel: card.responsavel ?? null,
    sprintId: card.sprintId,
    sprint: card.sprint ? { id: card.sprint.id, nome: card.sprint.nome } : null,
    projeto: card.projeto ? { id: card.projeto.id, nome: card.projeto.nome } : null,
    projetoId: card.projetoId,
    subtarefas: (card.subtarefas ?? []).map((s) => ({
      id: s.id,
      titulo: s.titulo,
      status: s.status,
    })),
    historicos: (card.historicos ?? []).map((h) => ({
      id: h.id,
      campo: h.campo,
      valorAnterior: h.valorAnterior,
      valorNovo: h.valorNovo,
      createdAt: h.createdAt.toISOString(),
      user: h.user ? { id: h.user.id, nome: h.user.nome } : null,
    })),
    anexos: (card.anexos ?? []).map((a) => ({
      id: a.id,
      nome: a.nome,
      tamanho: a.tamanho,
    })),
  };

  return (
    <CardInlineClient
      card={cardSerializado}
      usuarios={usuarios.map((u) => ({ id: u.id, nome: u.nome }))}
      sprints={sprintsDoProjeto.map((s) => ({ id: s.id, nome: s.nome }))}
    />
  );
}
