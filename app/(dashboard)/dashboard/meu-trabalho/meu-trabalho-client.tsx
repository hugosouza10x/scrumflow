"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  ShieldAlert, Clock, AlertTriangle, Zap, CalendarDays,
  CheckSquare, FolderKanban, ArrowRight, ListTodo,
  Search, SearchX, CheckCircle2, X,
} from "lucide-react";
import { CardStatusBadge, PrioridadeBadge, RefinamentoBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { STATUS_REFINAMENTO_LABEL } from "@/types";
import type { CardStatus, Prioridade, StatusRefinamento } from "@/types";

// ── Types ──────────────────────────────────────────────────────────────────────

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

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = (Object.keys(STATUS_REFINAMENTO_LABEL) as StatusRefinamento[]).filter(
  (s) => s !== "PRONTO_PARA_SPRINT"
);

const PRIORIDADE_CHIPS = [
  { value: "URGENTE", label: "Urgente", color: "text-red-600 border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-800" },
  { value: "ALTA", label: "Alta", color: "text-orange-600 border-orange-300 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800" },
  { value: "MEDIA", label: "Média", color: "text-blue-600 border-blue-300 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800" },
  { value: "BAIXA", label: "Baixa", color: "text-slate-600 border-slate-300 bg-slate-50 dark:bg-slate-800/30 dark:border-slate-700" },
] as const;

// ── Sub-components ─────────────────────────────────────────────────────────────

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
      <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: cliente.cor ?? "#94a3b8" }} />
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
          {card.projeto ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <FolderKanban className="h-3 w-3" />
              {card.projeto.nome}
            </span>
          ) : (
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
  onOpen,
  isPending,
}: {
  demanda: MinhaDemanda;
  onStatusChange: (id: string, status: string) => void;
  onOpen: (demanda: MinhaDemanda) => void;
  isPending: boolean;
}) {
  return (
    <div
      className="flex items-start gap-3 rounded-lg border bg-card p-3 cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all group"
      onClick={() => onOpen(demanda)}
    >
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-start gap-2 flex-wrap">
          <span className="font-medium text-sm line-clamp-2 flex-1 group-hover:text-primary transition-colors">
            {demanda.titulo}
          </span>
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
      {/* Ação inline de status — stopPropagation para não abrir o dialog */}
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

function DemandaDetailDialog({
  demanda,
  onClose,
  onStatusChange,
  isPending,
}: {
  demanda: MinhaDemanda | null;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
  isPending: boolean;
}) {
  return (
    <Dialog open={!!demanda} onOpenChange={(v) => { if (!v) onClose(); }}>
      {demanda && (
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-start gap-2 pr-6">
              <DialogTitle className="text-base leading-snug flex-1">{demanda.titulo}</DialogTitle>
              <PrioridadeBadge prioridade={demanda.prioridade as Prioridade} />
            </div>
            <DialogDescription className="sr-only">Detalhes da demanda</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Meta */}
            <div className="flex flex-wrap gap-2">
              <RefinamentoBadge status={demanda.statusRefinamento} />
              {demanda.projeto ? (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <FolderKanban className="h-3.5 w-3.5" />
                  {demanda.projeto.nome}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30 px-1.5 py-0.5 rounded">
                  Geral
                </span>
              )}
              {demanda.tipo && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {demanda.tipo}
                </span>
              )}
            </div>

            {/* Descrição */}
            {demanda.descricao ? (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Descrição</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{demanda.descricao}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Sem descrição.</p>
            )}

            {/* Status refinamento editável */}
            <div>
              <Label htmlFor="demanda-status" className="text-xs font-medium text-muted-foreground mb-1 block">
                Status de refinamento
              </Label>
              <select
                id="demanda-status"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm disabled:opacity-50"
                value={demanda.statusRefinamento}
                disabled={isPending}
                onChange={(e) => onStatusChange(demanda.id, e.target.value)}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{STATUS_REFINAMENTO_LABEL[s]}</option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function MeuTrabalhoClient({ userName }: { userName: string }) {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // ── Estado inicializado a partir da URL ──
  const [busca, setBusca] = useState(() => searchParams.get("q") ?? "");
  const [buscaDebounced, setBuscaDebounced] = useState(() => searchParams.get("q") ?? "");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "cards" | "demandas">(
    () => (searchParams.get("tipo") as "todos" | "cards" | "demandas") ?? "todos"
  );
  const [filtroPrioridades, setFiltroPrioridades] = useState<string[]>(
    () => searchParams.get("p") ? searchParams.get("p")!.split(",").filter(Boolean) : []
  );
  const [mostrarConcluidas, setMostrarConcluidas] = useState(
    () => searchParams.get("concluidas") === "1"
  );
  const [demandaDetail, setDemandaDetail] = useState<MinhaDemanda | null>(null);

  // ── Debounce da busca ──
  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca), 300);
    return () => clearTimeout(t);
  }, [busca]);

  // ── Sincronizar estado na URL ──
  useEffect(() => {
    const params = new URLSearchParams();
    if (buscaDebounced) params.set("q", buscaDebounced);
    if (filtroTipo !== "todos") params.set("tipo", filtroTipo);
    if (filtroPrioridades.length > 0) params.set("p", filtroPrioridades.join(","));
    if (mostrarConcluidas) params.set("concluidas", "1");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [buscaDebounced, filtroTipo, filtroPrioridades, mostrarConcluidas, pathname, router]);

  // ── Queries ──
  const { data, isLoading } = useQuery<MeuTrabalhoData>({
    queryKey: ["meu-trabalho"],
    queryFn: async () => {
      const res = await fetch("/api/meu-trabalho");
      if (!res.ok) throw new Error("Erro ao carregar");
      return res.json();
    },
  });

  const { data: concluidasData, isLoading: concluidasLoading } = useQuery<{ cards: MeuCard[] }>({
    queryKey: ["meu-trabalho-concluidas"],
    queryFn: async () => {
      const res = await fetch("/api/meu-trabalho?concluidos=true");
      if (!res.ok) throw new Error("Erro ao carregar concluídas");
      return res.json();
    },
    enabled: mostrarConcluidas,
    staleTime: 2 * 60 * 1000,
  });

  // ── Mutations ──
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
          demandas: old.demandas.map((d) => d.id === id ? { ...d, statusRefinamento } : d),
        };
      });
      // Atualiza também o dialog se aberto
      setDemandaDetail((prev) => prev?.id === id ? { ...prev, statusRefinamento } : prev);
      return { previous };
    },
    onSuccess: () => toast.success("Status de refinamento atualizado!"),
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["meu-trabalho"], context.previous);
      toast.error("Erro ao atualizar status.");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["meu-trabalho"] }),
  });

  // ── Helpers ──
  const togglePrioridade = (p: string) => {
    setFiltroPrioridades((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const limparFiltros = () => {
    setBusca("");
    setBuscaDebounced("");
    setFiltroTipo("todos");
    setFiltroPrioridades([]);
  };

  const temFiltroAtivo = busca || filtroTipo !== "todos" || filtroPrioridades.length > 0;

  // ── Filtragem (hooks antes de qualquer return condicional) ──
  const cards = data?.cards ?? [];
  const demandas = data?.demandas ?? [];
  const stats = data?.stats ?? { total: 0, bloqueados: 0, atrasados: 0, urgentes: 0 };

  const cardsFiltrados = useMemo(() => {
    if (filtroTipo === "demandas") return [];
    return cards.filter((c) => {
      if (filtroPrioridades.length > 0 && !filtroPrioridades.includes(c.prioridade)) return false;
      if (!buscaDebounced) return true;
      const q = buscaDebounced.toLowerCase();
      const cliente = c.cliente ?? c.projeto?.cliente;
      return (
        c.titulo.toLowerCase().includes(q) ||
        c.projeto?.nome.toLowerCase().includes(q) ||
        cliente?.nome.toLowerCase().includes(q)
      );
    });
  }, [cards, filtroTipo, filtroPrioridades, buscaDebounced]);

  const demandasFiltradas = useMemo(() => {
    if (filtroTipo === "cards") return [];
    return demandas.filter((d) => {
      if (filtroPrioridades.length > 0 && !filtroPrioridades.includes(d.prioridade)) return false;
      if (!buscaDebounced) return true;
      const q = buscaDebounced.toLowerCase();
      return (
        d.titulo.toLowerCase().includes(q) ||
        d.projeto?.nome.toLowerCase().includes(q)
      );
    });
  }, [demandas, filtroTipo, filtroPrioridades, buscaDebounced]);

  const bloqueados = useMemo(() => cardsFiltrados.filter((c) => c.bloqueado), [cardsFiltrados]);
  const atrasados = useMemo(() => cardsFiltrados.filter((c) => c.prazo && new Date(c.prazo) < new Date() && !c.bloqueado), [cardsFiltrados]);
  const urgentes = useMemo(() => cardsFiltrados.filter(
    (c) => !c.bloqueado && !(c.prazo && new Date(c.prazo) < new Date()) && (c.prioridade === "URGENTE" || c.prioridade === "ALTA")
  ), [cardsFiltrados]);
  const restantes = useMemo(() => cardsFiltrados.filter(
    (c) => !c.bloqueado && !(c.prazo && new Date(c.prazo) < new Date()) && c.prioridade !== "URGENTE" && c.prioridade !== "ALTA"
  ), [cardsFiltrados]);

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      </div>
    );
  }

  const nadaSemFiltros = stats.total === 0 && demandas.length === 0;
  const nadaComFiltros = temFiltroAtivo && cardsFiltrados.length === 0 && demandasFiltradas.length === 0;

  if (nadaSemFiltros) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <CheckSquare className="h-12 w-12 text-green-500 mb-4" />
        <h3 className="text-lg font-semibold">Tudo em dia, {userName.split(" ")[0]}!</h3>
        <p className="text-muted-foreground text-sm mt-1">Nenhuma tarefa ou demanda pendente atribuída a você.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={CheckSquare} label="Cards pendentes" value={stats.total} color="text-slate-600" bg="bg-slate-50 dark:bg-slate-800/30" />
          <StatCard icon={ShieldAlert} label="Bloqueados" value={stats.bloqueados} color={stats.bloqueados > 0 ? "text-red-600" : "text-slate-400"} bg={stats.bloqueados > 0 ? "bg-red-50 dark:bg-red-950/20" : "bg-slate-50 dark:bg-slate-800/30"} />
          <StatCard icon={Clock} label="Atrasados" value={stats.atrasados} color={stats.atrasados > 0 ? "text-orange-600" : "text-slate-400"} bg={stats.atrasados > 0 ? "bg-orange-50 dark:bg-orange-950/20" : "bg-slate-50 dark:bg-slate-800/30"} />
          <StatCard icon={ListTodo} label="Para refinar" value={demandas.length} color={demandas.length > 0 ? "text-violet-600" : "text-slate-400"} bg={demandas.length > 0 ? "bg-violet-50 dark:bg-violet-950/20" : "bg-slate-50 dark:bg-slate-800/30"} />
        </div>

        {/* Barra de controle */}
        <div className="space-y-2">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") { setBusca(""); setBuscaDebounced(""); } }}
              placeholder="Buscar por título, projeto ou cliente…"
              className="flex h-10 w-full rounded-lg border border-input bg-background pl-9 pr-9 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {busca && (
              <button
                onClick={() => { setBusca(""); setBuscaDebounced(""); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Limpar busca"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filtros + toggle concluídas */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Tipo — segmented control */}
            <div className="flex rounded-lg border overflow-hidden shrink-0">
              {(["todos", "cards", "demandas"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFiltroTipo(t)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors capitalize ${
                    filtroTipo === t
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {t === "todos" ? "Todos" : t === "cards" ? "Cards" : "Demandas"}
                </button>
              ))}
            </div>

            {/* Prioridade — chips toggle */}
            <div className="flex gap-1.5 flex-wrap">
              {PRIORIDADE_CHIPS.map(({ value, label, color }) => {
                const active = filtroPrioridades.includes(value);
                return (
                  <button
                    key={value}
                    onClick={() => togglePrioridade(value)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      active ? color : "bg-background border-input text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Limpar filtros */}
            {temFiltroAtivo && (
              <button
                onClick={limparFiltros}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ml-1"
              >
                <X className="h-3.5 w-3.5" />
                Limpar filtros
              </button>
            )}

            {/* Toggle concluídas */}
            <label className="flex items-center gap-2 ml-auto cursor-pointer select-none">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Incluir concluídas</span>
              <div
                className={`relative inline-flex h-5 w-9 items-center rounded-full border transition-colors ${
                  mostrarConcluidas ? "bg-primary border-primary" : "bg-muted border-input"
                }`}
                onClick={() => setMostrarConcluidas((v) => !v)}
                role="switch"
                aria-checked={mostrarConcluidas}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") setMostrarConcluidas((v) => !v); }}
              >
                <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${mostrarConcluidas ? "translate-x-[18px]" : "translate-x-[2px]"}`} />
              </div>
            </label>
          </div>
        </div>

        {/* Empty state com filtros */}
        {nadaComFiltros ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <SearchX className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium">
              {buscaDebounced
                ? `Nenhum item encontrado para "${buscaDebounced}"`
                : "Nenhum item corresponde aos filtros selecionados"}
            </p>
            <button
              onClick={limparFiltros}
              className="text-xs text-primary hover:underline mt-2"
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Demandas para refinar */}
            {demandasFiltradas.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-violet-600 dark:text-violet-400 flex items-center gap-1.5 mb-2">
                  <ListTodo className="h-4 w-4" /> Para refinar ({demandasFiltradas.length})
                </h2>
                <p className="text-xs text-muted-foreground mb-2">
                  Clique em uma demanda para ver detalhes. Use o seletor à direita para atualizar o status rapidamente.
                </p>
                <div className="space-y-2">
                  {demandasFiltradas.map((d) => (
                    <DemandaRow
                      key={d.id}
                      demanda={d}
                      onStatusChange={(id, status) => updateDemandaStatus.mutate({ id, statusRefinamento: status })}
                      onOpen={setDemandaDetail}
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
        )}

        {/* Concluídas recentemente */}
        {mostrarConcluidas && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
              <CheckCircle2 className="h-4 w-4" /> Concluídas recentemente
            </h2>
            {concluidasLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
              </div>
            ) : (concluidasData?.cards ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma tarefa concluída nos últimos 30 dias.</p>
            ) : (
              <div className="space-y-2 opacity-75">
                {(concluidasData?.cards ?? []).map((c) => <CardRow key={c.id} card={c} />)}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Dialog de detalhe de demanda */}
      <DemandaDetailDialog
        demanda={demandaDetail}
        onClose={() => setDemandaDetail(null)}
        onStatusChange={(id, status) => updateDemandaStatus.mutate({ id, statusRefinamento: status })}
        isPending={updateDemandaStatus.isPending}
      />
    </>
  );
}
