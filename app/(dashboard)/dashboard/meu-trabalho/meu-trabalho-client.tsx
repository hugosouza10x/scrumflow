"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  ShieldAlert, Clock, AlertTriangle, Zap, CalendarDays,
  CheckSquare, FolderKanban, Building2, ArrowRight, ListTodo,
} from "lucide-react";
import { CardStatusBadge, PrioridadeBadge, RefinamentoBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { STATUS_REFINAMENTO_LABEL } from "@/types";
import type { CardStatus, Prioridade, StatusRefinamento } from "@/types";

type ClienteInfo = { id: string; nome: string; cor: string | null } | null;

type MeuCard = {
  id: string;
  titulo: string;
  status: string;
  prioridade: string;
  prazo: string | null;
  bloqueado: boolean;
  motivoBloqueio: string | null;
  _count: { subtarefas: number };
  projeto: { id: string; nome: string; cliente: ClienteInfo } | null;
  cliente: ClienteInfo;
  sprint: { id: string; nome: string; dataFim: string } | null;
};

type MinhaDemanda = {
  id: string;
  titulo: string;
  descricao: string | null;
  statusRefinamento: string;
  prioridade: string;
  tipo: string | null;
  projeto: { id: string; nome: string } | null;
};

type MeuTrabalhoData = {
  cards: MeuCard[];
  demandas: MinhaDemanda[];
  stats: { total: number; bloqueados: number; atrasados: number; urgentes: number };
};

const STATUS_OPTIONS = (Object.keys(STATUS_REFINAMENTO_LABEL) as StatusRefinamento[]).filter(
  (s) => s !== "PRONTO_PARA_SPRINT"
);

function ClienteBadge({ cliente }: { cliente: ClienteInfo }) {
  if (!cliente) return null;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md border"
      style={{
        borderColor: cliente.cor ?? "#94a3b8",
        color: cliente.cor ?? "#94a3b8",
        backgroundColor: cliente.cor ? `${cliente.cor}15` : "#f1f5f9",
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: cliente.cor ?? "#94a3b8" }}
      />
      {cliente.nome}
    </span>
  );
}

function CardRow({ card }: { card: MeuCard }) {
  const isOverdue = card.prazo && new Date(card.prazo) < new Date();
  const efectiveCliente = card.cliente ?? card.projeto?.cliente ?? null;

  return (
    <Link
      href={`/dashboard/cards/${card.id}`}
      className="flex items-start gap-3 rounded-lg border bg-card p-3 hover:border-primary/50 hover:shadow-sm transition-all group"
    >
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-start gap-2 flex-wrap">
          <span className="font-medium text-sm group-hover:text-primary transition-colors line-clamp-2 flex-1">
            {card.titulo}
          </span>
          {card.bloqueado && (
            <span className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded-md px-1.5 py-0.5">
              <ShieldAlert className="h-3 w-3" /> Bloqueado
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <PrioridadeBadge prioridade={card.prioridade as Prioridade} />
          <CardStatusBadge status={card.status as CardStatus} />
          {efectiveCliente && <ClienteBadge cliente={efectiveCliente} />}
          {card.projeto && (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <FolderKanban className="h-3 w-3" />
              {card.projeto.nome}
            </span>
          )}
          {!card.projeto && (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
              Tarefa avulsa
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {card.prazo && (
            <span className={`flex items-center gap-0.5 ${isOverdue ? "text-red-500 font-medium" : ""}`}>
              <CalendarDays className="h-3 w-3" />
              {new Date(card.prazo).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
              {isOverdue && " · Atrasado"}
            </span>
          )}
          {card.sprint && (
            <span className="flex items-center gap-0.5">
              <Zap className="h-3 w-3" />
              {card.sprint.nome}
            </span>
          )}
          {card._count.subtarefas > 0 && (
            <span className="flex items-center gap-0.5">
              <CheckSquare className="h-3 w-3" />
              {card._count.subtarefas} subtarefa{card._count.subtarefas > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors flex-shrink-0 mt-0.5" />
    </Link>
  );
}

function DemandaRow({
  demanda,
  onStatusChange,
  isPending,
}: {
  demanda: MinhaDemanda;
  onStatusChange: (id: string, status: string) => void;
  isPending: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-card p-3">
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-start gap-2 flex-wrap">
          <span className="font-medium text-sm line-clamp-2 flex-1">{demanda.titulo}</span>
          <PrioridadeBadge prioridade={demanda.prioridade as Prioridade} />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <RefinamentoBadge status={demanda.statusRefinamento} />
          {demanda.projeto ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <FolderKanban className="h-3 w-3" />
              {demanda.projeto.nome}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30 px-1.5 py-0.5 rounded">
              Geral
            </span>
          )}
          {demanda.tipo && (
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {demanda.tipo}
            </span>
          )}
        </div>

        {demanda.descricao && (
          <p className="text-xs text-muted-foreground line-clamp-1">{demanda.descricao}</p>
        )}
      </div>

      {/* Ação inline de status */}
      <select
        className="rounded-md border border-input bg-background px-2 py-1 text-xs shrink-0 disabled:opacity-50"
        value={demanda.statusRefinamento}
        disabled={isPending}
        onChange={(e) => onStatusChange(demanda.id, e.target.value)}
        onClick={(e) => e.stopPropagation()}
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>{STATUS_REFINAMENTO_LABEL[s]}</option>
        ))}
      </select>
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, color, bg,
}: {
  icon: React.ElementType; label: string; value: number; color: string; bg: string;
}) {
  return (
    <div className={`rounded-xl border p-4 ${bg}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="rounded-md p-1.5 bg-background/50">
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

export function MeuTrabalhoClient({ userName }: { userName: string }) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<MeuTrabalhoData>({
    queryKey: ["meu-trabalho"],
    queryFn: async () => {
      const res = await fetch("/api/meu-trabalho");
      if (!res.ok) throw new Error("Erro ao carregar");
      return res.json();
    },
  });

  const updateDemandaStatus = useMutation({
    mutationFn: async ({ id, statusRefinamento }: { id: string; statusRefinamento: string }) => {
      const res = await fetch(`/api/demandas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusRefinamento }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar");
      return res.json();
    },
    onMutate: async ({ id, statusRefinamento }) => {
      await queryClient.cancelQueries({ queryKey: ["meu-trabalho"] });
      const previous = queryClient.getQueryData<MeuTrabalhoData>(["meu-trabalho"]);
      queryClient.setQueryData<MeuTrabalhoData>(["meu-trabalho"], (old) => {
        if (!old) return old;
        return {
          ...old,
          demandas: old.demandas.map((d) =>
            d.id === id ? { ...d, statusRefinamento } : d
          ),
        };
      });
      return { previous };
    },
    onSuccess: () => toast.success("Status de refinamento atualizado!"),
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["meu-trabalho"], context.previous);
      toast.error("Erro ao atualizar status.");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["meu-trabalho"] }),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      </div>
    );
  }

  const {
    cards = [],
    demandas = [],
    stats = { total: 0, bloqueados: 0, atrasados: 0, urgentes: 0 },
  } = data ?? {};

  const bloqueados = cards.filter((c) => c.bloqueado);
  const atrasados = cards.filter((c) => c.prazo && new Date(c.prazo) < new Date() && !c.bloqueado);
  const urgentes = cards.filter(
    (c) =>
      !c.bloqueado &&
      !(c.prazo && new Date(c.prazo) < new Date()) &&
      (c.prioridade === "URGENTE" || c.prioridade === "ALTA")
  );
  const restantes = cards.filter(
    (c) =>
      !c.bloqueado &&
      !(c.prazo && new Date(c.prazo) < new Date()) &&
      c.prioridade !== "URGENTE" &&
      c.prioridade !== "ALTA"
  );

  const nada = stats.total === 0 && demandas.length === 0;

  if (nada) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <CheckSquare className="h-12 w-12 text-green-500 mb-4" />
        <h3 className="text-lg font-semibold">Tudo em dia, {userName.split(" ")[0]}!</h3>
        <p className="text-muted-foreground text-sm mt-1">Nenhuma tarefa ou demanda pendente atribuída a você.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={CheckSquare} label="Cards pendentes" value={stats.total} color="text-slate-600" bg="bg-slate-50 dark:bg-slate-800/30" />
        <StatCard icon={ShieldAlert} label="Bloqueados" value={stats.bloqueados} color={stats.bloqueados > 0 ? "text-red-600" : "text-slate-400"} bg={stats.bloqueados > 0 ? "bg-red-50 dark:bg-red-950/20" : "bg-slate-50 dark:bg-slate-800/30"} />
        <StatCard icon={Clock} label="Atrasados" value={stats.atrasados} color={stats.atrasados > 0 ? "text-orange-600" : "text-slate-400"} bg={stats.atrasados > 0 ? "bg-orange-50 dark:bg-orange-950/20" : "bg-slate-50 dark:bg-slate-800/30"} />
        <StatCard icon={ListTodo} label="Para refinar" value={demandas.length} color={demandas.length > 0 ? "text-violet-600" : "text-slate-400"} bg={demandas.length > 0 ? "bg-violet-50 dark:bg-violet-950/20" : "bg-slate-50 dark:bg-slate-800/30"} />
      </div>

      {/* Demandas para refinar */}
      {demandas.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-violet-600 dark:text-violet-400 flex items-center gap-1.5 mb-2">
            <ListTodo className="h-4 w-4" /> Para refinar ({demandas.length})
          </h2>
          <p className="text-xs text-muted-foreground mb-2">
            Demandas atribuídas a você que precisam de refinamento. Atualize o status diretamente aqui.
          </p>
          <div className="space-y-2">
            {demandas.map((d) => (
              <DemandaRow
                key={d.id}
                demanda={d}
                onStatusChange={(id, status) =>
                  updateDemandaStatus.mutate({ id, statusRefinamento: status })
                }
                isPending={updateDemandaStatus.isPending}
              />
            ))}
          </div>
        </section>
      )}

      {/* Cards bloqueados */}
      {bloqueados.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-red-600 flex items-center gap-1.5 mb-2">
            <ShieldAlert className="h-4 w-4" /> Bloqueados ({bloqueados.length})
          </h2>
          <div className="space-y-2">
            {bloqueados.map((c) => <CardRow key={c.id} card={c} />)}
          </div>
        </section>
      )}

      {atrasados.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-orange-600 flex items-center gap-1.5 mb-2">
            <Clock className="h-4 w-4" /> Atrasados ({atrasados.length})
          </h2>
          <div className="space-y-2">
            {atrasados.map((c) => <CardRow key={c.id} card={c} />)}
          </div>
        </section>
      )}

      {urgentes.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-amber-600 flex items-center gap-1.5 mb-2">
            <AlertTriangle className="h-4 w-4" /> Alta prioridade ({urgentes.length})
          </h2>
          <div className="space-y-2">
            {urgentes.map((c) => <CardRow key={c.id} card={c} />)}
          </div>
        </section>
      )}

      {restantes.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
            <CheckSquare className="h-4 w-4" /> Demais tarefas ({restantes.length})
          </h2>
          <div className="space-y-2">
            {restantes.map((c) => <CardRow key={c.id} card={c} />)}
          </div>
        </section>
      )}
    </div>
  );
}
