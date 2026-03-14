import { getSession } from "@/lib/session";
import { redirect, notFound } from "next/navigation";
import { clienteService } from "@/services/cliente.service";
import Link from "next/link";
import { CardStatusBadge, PrioridadeBadge } from "@/components/ui/status-badge";
import { Mail, Phone, FolderKanban, LayoutList, ArrowLeft } from "lucide-react";
import type { CardStatus, Prioridade } from "@/types";

export default async function ClienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const cliente = await clienteService.getById(id);
  if (!cliente) notFound();

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div
          className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
          style={{ backgroundColor: cliente.cor ?? "#94a3b8" }}
        >
          {cliente.nome.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <Link
            href="/dashboard/clientes"
            className="text-xs text-muted-foreground hover:underline flex items-center gap-1 mb-1"
          >
            <ArrowLeft className="h-3 w-3" /> Clientes
          </Link>
          <h1 className="text-2xl font-bold">{cliente.nome}</h1>
          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
            {cliente.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" /> {cliente.email}
              </span>
            )}
            {cliente.telefone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> {cliente.telefone}
              </span>
            )}
            {!cliente.ativo && (
              <span className="text-xs bg-muted px-2 py-0.5 rounded">Inativo</span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Projetos", value: cliente._count.projetos, icon: FolderKanban },
          { label: "Cards ativos", value: cliente.cards.length, icon: LayoutList },
          {
            label: "Bloqueados",
            value: cliente.cards.filter((c) => c.bloqueado).length,
            icon: LayoutList,
          },
          {
            label: "Atrasados",
            value: cliente.cards.filter(
              (c) => c.prazo && new Date(c.prazo) < new Date()
            ).length,
            icon: LayoutList,
          },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border p-4 bg-card">
            <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Projetos */}
      {cliente.projetos.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <FolderKanban className="h-4 w-4" /> Projetos ({cliente.projetos.length})
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {cliente.projetos.map((p) => (
              <Link
                key={p.id}
                href={`/dashboard/projetos/${p.id}`}
                className="flex items-center justify-between rounded-xl border bg-card p-4 hover:border-primary/50 hover:shadow-sm transition-all group"
              >
                <div>
                  <p className="font-medium text-sm group-hover:text-primary transition-colors">
                    {p.nome}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {p._count.cards} cards · {p._count.sprints} sprints
                  </p>
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: `${cliente.cor ?? "#94a3b8"}20`,
                    color: cliente.cor ?? "#94a3b8",
                  }}
                >
                  {p.status}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Cards avulsas vinculados ao cliente */}
      {cliente.cards.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <LayoutList className="h-4 w-4" /> Tarefas avulsas ativas ({cliente.cards.length})
          </h2>
          <div className="space-y-2">
            {cliente.cards.map((card) => (
              <Link
                key={card.id}
                href={`/dashboard/cards/${card.id}`}
                className="flex items-center gap-3 rounded-lg border bg-card p-3 hover:border-primary/50 hover:shadow-sm transition-all group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium group-hover:text-primary transition-colors truncate">
                    {card.titulo}
                  </p>
                  {card.responsavel && (
                    <p className="text-xs text-muted-foreground mt-0.5">{card.responsavel.nome}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <PrioridadeBadge prioridade={card.prioridade as Prioridade} />
                  <CardStatusBadge status={card.status as CardStatus} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {cliente.projetos.length === 0 && cliente.cards.length === 0 && (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          <Building2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhum projeto ou tarefa vinculado a este cliente ainda.</p>
        </div>
      )}
    </div>
  );
}

// Needed for server component icon
import { Building2 } from "lucide-react";
