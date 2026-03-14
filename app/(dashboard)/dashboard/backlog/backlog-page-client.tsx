"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { RefinamentoBadge, PrioridadeBadge } from "@/components/ui/status-badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ListTodo, FolderKanban, X, User, Pencil, LayoutGrid, LayoutList, ArrowRight,
  Sparkles, Loader2, MoreVertical, Archive, Trash2, ArchiveX,
} from "lucide-react";
import { STATUS_REFINAMENTO_LABEL } from "@/types";
import type { StatusRefinamento } from "@/types";

type Projeto = { id: string; nome: string; clienteId?: string | null };
type Cliente = { id: string; nome: string; cor: string | null };
type TeamMember = { id: string; nome: string };
type Demanda = {
  id: string;
  titulo: string;
  descricao: string | null;
  statusRefinamento: string;
  prioridade: string;
  tipo: string | null;
  projetoId: string | null;
  convertida: boolean;
  arquivada: boolean;
  solicitante: { id: string; nome: string } | null;
  responsavel: { id: string; nome: string } | null;
  projeto: { id: string; nome: string } | null;
};

const STATUS_OPTIONS = Object.keys(STATUS_REFINAMENTO_LABEL) as StatusRefinamento[];
const PRIORIDADE_OPTIONS = ["BAIXA", "MEDIA", "ALTA", "URGENTE"] as const;
const PRIORIDADE_LABEL: Record<string, string> = {
  BAIXA: "Baixa", MEDIA: "Média", ALTA: "Alta", URGENTE: "Urgente",
};

const BACKLOG_VIEW_LS_KEY = "backlog-view-mode";

// ---- Edit Dialog ----
type EditForm = {
  titulo: string;
  descricao: string;
  prioridade: string;
  responsavelId: string;
  tipo: string;
  statusRefinamento: string;
};

function DemandaEditDialog({
  demanda,
  teamMembers,
  onSave,
  onClose,
  isPending,
}: {
  demanda: Demanda;
  teamMembers: TeamMember[];
  onSave: (id: string, data: EditForm) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState<EditForm>({
    titulo: demanda.titulo,
    descricao: demanda.descricao ?? "",
    prioridade: demanda.prioridade,
    responsavelId: demanda.responsavel?.id ?? "",
    tipo: demanda.tipo ?? "",
    statusRefinamento: demanda.statusRefinamento,
  });

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Editar demanda</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={(e) => { e.preventDefault(); onSave(demanda.id, form); }}
        className="space-y-4"
      >
        <div>
          <Label htmlFor="edit-titulo">Título *</Label>
          <Input
            id="edit-titulo"
            value={form.titulo}
            onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="edit-status">Status</Label>
            <select
              id="edit-status"
              value={form.statusRefinamento}
              onChange={(e) => setForm((f) => ({ ...f, statusRefinamento: e.target.value }))}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{STATUS_REFINAMENTO_LABEL[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="edit-prioridade">Prioridade</Label>
            <select
              id="edit-prioridade"
              value={form.prioridade}
              onChange={(e) => setForm((f) => ({ ...f, prioridade: e.target.value }))}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              {PRIORIDADE_OPTIONS.map((p) => (
                <option key={p} value={p}>{PRIORIDADE_LABEL[p]}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <Label htmlFor="edit-responsavel">Responsável</Label>
          <select
            id="edit-responsavel"
            value={form.responsavelId}
            onChange={(e) => setForm((f) => ({ ...f, responsavelId: e.target.value }))}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="">Sem responsável</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>{m.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="edit-descricao">Descrição</Label>
          <textarea
            id="edit-descricao"
            className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
            value={form.descricao}
            onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
            placeholder="Descreva a demanda..."
          />
        </div>

        <div>
          <Label htmlFor="edit-tipo">Tipo</Label>
          <Input
            id="edit-tipo"
            value={form.tipo}
            onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
            placeholder="ex: bug, feature, melhoria"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending || !form.titulo.trim()}>
            {isPending ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

// ---- Delete Confirmation Dialog ----
function DeleteDemandaDialog({
  demanda,
  onConfirm,
  onClose,
  isPending,
}: {
  demanda: Demanda;
  onConfirm: (id: string) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Excluir demanda</DialogTitle>
        <DialogDescription>
          Esta ação não pode ser desfeita. A demanda será removida permanentemente do sistema.
        </DialogDescription>
      </DialogHeader>
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
        <p className="text-sm font-medium">{demanda.titulo}</p>
        {demanda.projeto && (
          <p className="text-xs text-muted-foreground mt-0.5">{demanda.projeto.nome}</p>
        )}
      </div>
      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button
          variant="destructive"
          disabled={isPending}
          onClick={() => onConfirm(demanda.id)}
        >
          {isPending ? "Excluindo…" : "Excluir demanda"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ---- Demanda Actions Dropdown ----
function DemandaActionsMenu({
  demanda,
  onEdit,
  onArquivar,
  onDesarquivar,
  onDelete,
}: {
  demanda: Demanda;
  onEdit: () => void;
  onArquivar: () => void;
  onDesarquivar: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="Ações"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="h-4 w-4 mr-2" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {demanda.arquivada ? (
          <DropdownMenuItem onClick={onDesarquivar}>
            <ArchiveX className="h-4 w-4 mr-2" />
            Desarquivar
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={onArquivar}>
            <Archive className="h-4 w-4 mr-2" />
            Arquivar
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onDelete}
          className="text-destructive focus:text-destructive focus:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ---- Main component ----
export function BacklogPageClient({ projetos }: { projetos: Projeto[] }) {
  const queryClient = useQueryClient();

  // Always init with "grid" to match SSR; sync from localStorage after hydration
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    const stored = localStorage.getItem(BACKLOG_VIEW_LS_KEY) as "grid" | "list" | null;
    if (stored === "list") setViewMode("list");
  }, []);

  const [editingDemanda, setEditingDemanda] = useState<Demanda | null>(null);
  const [deletingDemanda, setDeletingDemanda] = useState<Demanda | null>(null);

  // Filtros
  const [selectedProjetoIds, setSelectedProjetoIds] = useState<string[]>([]);
  const [mostrarGeral, setMostrarGeral] = useState(false);
  const [filtroClienteId, setFiltroClienteId] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("");
  const [filtroBusca, setFiltroBusca] = useState("");
  const [mostrarArquivadas, setMostrarArquivadas] = useState(false);

  // Form nova demanda
  const [dialogOpen, setDialogOpen] = useState(false);
  const [novaProjetoId, setNovaProjetoId] = useState("");
  const [novaResponsavelId, setNovaResponsavelId] = useState("");
  const [form, setForm] = useState({ titulo: "", descricao: "", tipo: "" });
  const [novaPrioridade, setNovaPrioridade] = useState("MEDIA");
  const [aiFilledFields, setAiFilledFields] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const toggleViewMode = () => {
    const next = viewMode === "grid" ? "list" : "grid";
    setViewMode(next);
    try { localStorage.setItem(BACKLOG_VIEW_LS_KEY, next); } catch {}
  };
  void toggleViewMode; // evitar warning de unused

  const { data: clientes = [] } = useQuery<Cliente[]>({
    queryKey: ["clientes"],
    queryFn: async () => {
      const res = await fetch("/api/clientes");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: teamMembers = [] } = useQuery<TeamMember[]>({
    queryKey: ["team"],
    queryFn: async () => {
      const res = await fetch("/api/team");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
  });

  const projetosFiltradosPorCliente = useMemo(() => {
    if (!filtroClienteId) return projetos;
    return projetos.filter((p) => p.clienteId === filtroClienteId);
  }, [projetos, filtroClienteId]);

  const demandasUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (mostrarArquivadas) {
      params.set("incluirArquivadas", "true");
      params.set("incluirConvertidas", "true");
    }

    if (mostrarGeral) {
      params.set("geral", "true");
      return `/api/demandas?${params}`;
    }
    if (selectedProjetoIds.length === 1) {
      params.set("projetoId", selectedProjetoIds[0]);
      return `/api/demandas?${params}`;
    }
    if (selectedProjetoIds.length > 1) {
      params.set("projetoIds", selectedProjetoIds.join(","));
      return `/api/demandas?${params}`;
    }
    if (filtroClienteId) {
      const ids = projetosFiltradosPorCliente.map((p) => p.id);
      if (ids.length === 0) return null;
      if (ids.length === 1) params.set("projetoId", ids[0]);
      else params.set("projetoIds", ids.join(","));
      return `/api/demandas?${params}`;
    }
    const base = `/api/demandas`;
    return params.toString() ? `${base}?${params}` : base;
  }, [mostrarGeral, selectedProjetoIds, filtroClienteId, projetosFiltradosPorCliente, mostrarArquivadas]);

  const queryKey = useMemo(
    () => ["demandas", mostrarGeral ? "geral" : selectedProjetoIds.join(","), filtroClienteId, mostrarArquivadas],
    [mostrarGeral, selectedProjetoIds, filtroClienteId, mostrarArquivadas]
  );

  const { data: demandas = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!demandasUrl) return [];
      const res = await fetch(demandasUrl);
      if (!res.ok) throw new Error("Erro ao carregar demandas");
      return res.json();
    },
    enabled: demandasUrl !== null,
    placeholderData: (prev) => prev,
  });

  const demandasFiltradas = useMemo(() => {
    return (demandas as Demanda[]).filter((d) => {
      if (filtroStatus && d.statusRefinamento !== filtroStatus) return false;
      if (filtroBusca && !d.titulo.toLowerCase().includes(filtroBusca.toLowerCase())) return false;
      return true;
    });
  }, [demandas, filtroStatus, filtroBusca]);

  // ---- IA ----
  async function handleAiGenerate() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate-task", prompt: aiPrompt }),
      });
      if (res.ok) {
        const data = await res.json();
        setForm((f) => ({
          titulo: data.titulo ?? f.titulo,
          descricao: data.descricao ?? f.descricao,
          tipo: data.tipo ?? f.tipo,
        }));
        if (data.prioridade) setNovaPrioridade(data.prioridade);
        setAiFilledFields(true);
        toast.success("Demanda preenchida pela IA!");
      } else {
        toast.error("Erro ao gerar com IA.");
      }
    } catch {
      toast.error("Erro ao gerar com IA.");
    } finally {
      setAiLoading(false);
    }
  }

  // ---- Mutations ----
  const createDemanda = useMutation({
    mutationFn: async (data: { titulo: string; descricao?: string; tipo?: string; prioridade?: string }) => {
      const res = await fetch("/api/demandas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          projetoId: novaProjetoId || undefined,
          responsavelId: novaResponsavelId || undefined,
        }),
      });
      if (!res.ok) throw new Error("Erro ao criar demanda");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setDialogOpen(false);
      toast.success("Demanda criada!");
    },
    onError: () => toast.error("Erro ao criar demanda."),
  });

  const updateStatus = useMutation({
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
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Demanda[]>(queryKey);
      queryClient.setQueryData<Demanda[]>(queryKey, (old = []) =>
        old.map((d) => (d.id === id ? { ...d, statusRefinamento } : d))
      );
      return { previous };
    },
    onSuccess: () => toast.success("Status atualizado!"),
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      toast.error("Erro ao atualizar status.");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateDemanda = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EditForm }) => {
      const res = await fetch(`/api/demandas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: data.titulo,
          descricao: data.descricao || undefined,
          prioridade: data.prioridade,
          responsavelId: data.responsavelId || null,
          tipo: data.tipo || undefined,
          statusRefinamento: data.statusRefinamento,
        }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar demanda");
      return res.json();
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Demanda[]>(queryKey);
      const newResponsavel = data.responsavelId
        ? (teamMembers as TeamMember[]).find((m) => m.id === data.responsavelId) ?? null
        : null;
      queryClient.setQueryData<Demanda[]>(queryKey, (old = []) =>
        old.map((d) =>
          d.id !== id ? d : {
            ...d,
            titulo: data.titulo,
            descricao: data.descricao || null,
            prioridade: data.prioridade,
            statusRefinamento: data.statusRefinamento,
            tipo: data.tipo || null,
            responsavel: newResponsavel,
          }
        )
      );
      return { previous };
    },
    onSuccess: () => {
      setEditingDemanda(null);
      toast.success("Demanda atualizada!");
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous);
      toast.error("Erro ao atualizar demanda.");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const arquivarDemanda = useMutation({
    mutationFn: async ({ id, arquivada }: { id: string; arquivada: boolean }) => {
      const res = await fetch(`/api/demandas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ arquivada }),
      });
      if (!res.ok) throw new Error("Erro ao arquivar demanda");
      return res.json();
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Demanda[]>(queryKey);
      // Remove da listagem atual (seja arquivando ou desarquivando, o item sai da view ativa)
      if (!mostrarArquivadas) {
        queryClient.setQueryData<Demanda[]>(queryKey, (old = []) => old.filter((d) => d.id !== id));
      }
      return { previous };
    },
    onSuccess: (_data, { arquivada }) => {
      toast.success(arquivada ? "Demanda arquivada." : "Demanda desarquivada.");
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous);
      toast.error("Erro ao arquivar demanda.");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteDemanda = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/demandas/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir demanda");
      return res.json();
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Demanda[]>(queryKey);
      queryClient.setQueryData<Demanda[]>(queryKey, (old = []) => old.filter((d) => d.id !== id));
      return { previous };
    },
    onSuccess: () => {
      setDeletingDemanda(null);
      toast.success("Demanda excluída.");
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous);
      toast.error("Erro ao excluir demanda.");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const criarCard = useMutation({
    mutationFn: async (demandaId: string) => {
      const demanda = (demandas as Demanda[]).find((d) => d.id === demandaId);
      if (!demanda) throw new Error("Demanda não encontrada");
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: demanda.titulo,
          descricao: demanda.descricao ?? undefined,
          prioridade: demanda.prioridade,
          demandaId: demanda.id,
          ...(demanda.projetoId && { projetoId: demanda.projetoId }),
          ...(demanda.responsavel?.id && { responsavelId: demanda.responsavel.id }),
        }),
      });
      if (!res.ok) throw new Error("Erro ao criar card");
      return res.json();
    },
    onMutate: async (demandaId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Demanda[]>(queryKey);
      // Remove a demanda do backlog ativo após converter (a demanda vira convertida=true no servidor)
      if (!mostrarArquivadas) {
        queryClient.setQueryData<Demanda[]>(queryKey, (old = []) =>
          old.filter((d) => d.id !== demandaId)
        );
      }
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["cards", "kanban"] });
      toast.success("Card criado a partir da demanda!");
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous);
      toast.error("Erro ao criar card.");
    },
  });

  // ---- Helpers ----
  const toggleProjeto = (id: string) => {
    setMostrarGeral(false);
    setSelectedProjetoIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleGeral = () => {
    setSelectedProjetoIds([]);
    setMostrarGeral((v) => !v);
  };

  const limparFiltros = () => {
    setFiltroStatus("");
    setFiltroBusca("");
    setSelectedProjetoIds([]);
    setFiltroClienteId("");
    setMostrarGeral(false);
    setMostrarArquivadas(false);
  };

  const resetDialog = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setForm({ titulo: "", descricao: "", tipo: "" });
      setNovaPrioridade("MEDIA");
      setAiFilledFields(false);
      setAiPrompt("");
      setAiOpen(false);
      setNovaResponsavelId("");
      setNovaProjetoId("");
    }
  };

  const hasFilters = filtroStatus || filtroBusca || selectedProjetoIds.length > 0 || filtroClienteId || mostrarGeral || mostrarArquivadas;

  // ---- Render helpers ----
  function ProjetoTag({ d }: { d: Demanda }) {
    if (d.projeto) return (
      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
        <FolderKanban className="h-3 w-3" />
        {d.projeto.nome}
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30 px-1.5 py-0.5 rounded shrink-0">
        Geral
      </span>
    );
  }

  return (
    <div className="space-y-4">

      {/* Edit dialog */}
      <Dialog open={!!editingDemanda} onOpenChange={(v) => { if (!v) setEditingDemanda(null); }}>
        {editingDemanda && (
          <DemandaEditDialog
            demanda={editingDemanda}
            teamMembers={teamMembers as TeamMember[]}
            onSave={(id, data) => updateDemanda.mutate({ id, data })}
            onClose={() => setEditingDemanda(null)}
            isPending={updateDemanda.isPending}
          />
        )}
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deletingDemanda} onOpenChange={(v) => { if (!v) setDeletingDemanda(null); }}>
        {deletingDemanda && (
          <DeleteDemandaDialog
            demanda={deletingDemanda}
            onConfirm={(id) => deleteDemanda.mutate(id)}
            onClose={() => setDeletingDemanda(null)}
            isPending={deleteDemanda.isPending}
          />
        )}
      </Dialog>

      {/* Linha 1: filtros de contexto */}
      <div className="flex items-center gap-2 flex-wrap">
        {clientes.length > 0 && (
          <select
            value={filtroClienteId}
            onChange={(e) => {
              setFiltroClienteId(e.target.value);
              setSelectedProjetoIds([]);
              setMostrarGeral(false);
            }}
            className="rounded-lg border bg-background px-3 py-2 text-sm"
          >
            <option value="">Todos os clientes</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        )}

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground">Contexto:</span>
          <button
            onClick={toggleGeral}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
              mostrarGeral ? "bg-violet-600 text-white border-violet-600" : "bg-background hover:bg-muted border-dashed"
            }`}
          >
            Geral
          </button>
          {projetosFiltradosPorCliente.map((p) => (
            <button
              key={p.id}
              onClick={() => toggleProjeto(p.id)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                selectedProjetoIds.includes(p.id)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-muted"
              }`}
            >
              {p.nome}
            </button>
          ))}
          {(selectedProjetoIds.length > 0 || mostrarGeral) && (
            <button
              onClick={() => { setSelectedProjetoIds([]); setMostrarGeral(false); }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="ml-auto">
          <Dialog open={dialogOpen} onOpenChange={resetDialog}>
            <DialogTrigger asChild>
              <Button>Nova demanda</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl flex flex-col max-h-[85vh] p-0 gap-0">
              {/* Header fixo */}
              <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
                <DialogTitle className="text-xl">Nova demanda</DialogTitle>
                <DialogDescription>
                  Registre uma nova necessidade no backlog do projeto.
                </DialogDescription>
              </DialogHeader>

              {/* Body scrollável */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">

                {/* ── Título ── */}
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Label htmlFor="titulo">Título *</Label>
                    {aiFilledFields && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400 px-1.5 py-0.5 rounded">
                        <Sparkles className="h-2.5 w-2.5" />IA
                      </span>
                    )}
                  </div>
                  <Input
                    id="titulo"
                    value={form.titulo}
                    onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                    className="h-11 text-base"
                    placeholder="Título da demanda…"
                    autoFocus
                  />
                </div>

                {/* ── Descrição ── */}
                <div>
                  <Label htmlFor="descricao-nova" className="mb-1.5 block">Descrição</Label>
                  <textarea
                    id="descricao-nova"
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={form.descricao}
                    onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                    placeholder="Contexto adicional, links, detalhes técnicos…"
                  />
                </div>

                {/* ── IA auxiliar ── */}
                <div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setAiOpen((v) => !v)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                    >
                      <Sparkles className="h-3 w-3" />
                      {aiOpen ? "Fechar IA" : "Gerar com IA"}
                    </button>
                  </div>
                  {aiOpen && (
                    <div className="flex gap-2 mt-2 p-3 rounded-lg bg-muted/40 border border-border">
                      <Input
                        placeholder="Descreva a demanda para a IA preencher os campos…"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleAiGenerate(); }}
                        className="h-9 text-sm"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={handleAiGenerate}
                        disabled={aiLoading || !aiPrompt.trim()}
                        className="shrink-0"
                      >
                        {aiLoading
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Sparkles className="h-3.5 w-3.5" />}
                        <span className="ml-1.5">{aiLoading ? "Gerando…" : "Gerar"}</span>
                      </Button>
                    </div>
                  )}
                </div>

                <hr className="border-border" />

                {/* ── Organização ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="projeto-nova" className="mb-1.5 block">Projeto</Label>
                    <select
                      id="projeto-nova"
                      value={novaProjetoId}
                      onChange={(e) => setNovaProjetoId(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Sem projeto (Geral)</option>
                      {projetos.map((p) => (<option key={p.id} value={p.id}>{p.nome}</option>))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="responsavel-nova" className="mb-1.5 block">Responsável</Label>
                    <select
                      id="responsavel-nova"
                      value={novaResponsavelId}
                      onChange={(e) => setNovaResponsavelId(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Sem responsável</option>
                      {(teamMembers as TeamMember[]).map((m) => (<option key={m.id} value={m.id}>{m.nome}</option>))}
                    </select>
                  </div>
                </div>

                <hr className="border-border" />

                {/* ── Classificação ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tipo-nova" className="mb-1.5 block">Tipo</Label>
                    <select
                      id="tipo-nova"
                      value={form.tipo}
                      onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Selecione</option>
                      <option value="Bug">Bug</option>
                      <option value="Feature">Feature</option>
                      <option value="Melhoria">Melhoria</option>
                      <option value="Análise">Análise</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                  <div>
                    <Label className="mb-1.5 block">Prioridade</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {(["BAIXA", "MEDIA", "ALTA", "URGENTE"] as const).map((p) => {
                        const isSelected = novaPrioridade === p;
                        const colorMap: Record<string, string> = {
                          BAIXA: isSelected ? "bg-slate-600 text-white border-slate-600" : "border-input text-muted-foreground hover:border-slate-400 hover:text-slate-700 dark:hover:text-slate-300",
                          MEDIA: isSelected ? "bg-blue-600 text-white border-blue-600" : "border-input text-muted-foreground hover:border-blue-400 hover:text-blue-700 dark:hover:text-blue-400",
                          ALTA: isSelected ? "bg-orange-500 text-white border-orange-500" : "border-input text-muted-foreground hover:border-orange-400 hover:text-orange-600 dark:hover:text-orange-400",
                          URGENTE: isSelected ? "bg-red-600 text-white border-red-600" : "border-input text-muted-foreground hover:border-red-400 hover:text-red-600 dark:hover:text-red-400",
                        };
                        const labelMap: Record<string, string> = { BAIXA: "Baixa", MEDIA: "Média", ALTA: "Alta", URGENTE: "Urgente" };
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setNovaPrioridade(p)}
                            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors flex-1 ${colorMap[p]}`}
                          >
                            {labelMap[p]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

              </div>

              {/* Footer fixo */}
              <DialogFooter className="px-6 py-4 border-t shrink-0 flex-row justify-between sm:justify-between">
                <Button type="button" variant="outline" onClick={() => resetDialog(false)}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  disabled={createDemanda.isPending || !form.titulo.trim()}
                  onClick={() => {
                    if (!form.titulo.trim()) return;
                    createDemanda.mutate({
                      titulo: form.titulo,
                      descricao: form.descricao || undefined,
                      tipo: form.tipo || undefined,
                      prioridade: novaPrioridade,
                    });
                  }}
                >
                  {createDemanda.isPending ? "Criando…" : "✦ Criar demanda"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Linha 2: busca + status + arquivadas + view toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          placeholder="Buscar demandas..."
          value={filtroBusca}
          onChange={(e) => setFiltroBusca(e.target.value)}
          className="max-w-xs"
        />
        <select
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
        >
          <option value="">Todos os status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{STATUS_REFINAMENTO_LABEL[s]}</option>
          ))}
        </select>

        {/* Filtro arquivadas/convertidas */}
        <button
          onClick={() => setMostrarArquivadas((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors ${
            mostrarArquivadas
              ? "bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300"
              : "bg-background hover:bg-muted text-muted-foreground"
          }`}
          title={mostrarArquivadas ? "Ocultar arquivadas e convertidas" : "Ver arquivadas e convertidas"}
        >
          <Archive className="h-3.5 w-3.5" />
          {mostrarArquivadas ? "Ocultar arquivadas" : "Arquivadas"}
        </button>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={limparFiltros}>Limpar tudo</Button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {demandasFiltradas.length} de {(demandas as Demanda[]).length} demandas
        </span>
        {/* View toggle */}
        <div className="flex items-center rounded-lg border overflow-hidden">
          <button
            onClick={() => { setViewMode("grid"); try { localStorage.setItem(BACKLOG_VIEW_LS_KEY, "grid"); } catch {} }}
            className={`p-2 transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}
            title="Visualização em grade"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => { setViewMode("list"); try { localStorage.setItem(BACKLOG_VIEW_LS_KEY, "list"); } catch {} }}
            className={`p-2 transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}
            title="Visualização em lista"
          >
            <LayoutList className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Banner modo arquivadas */}
      {mostrarArquivadas && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-2.5 text-sm text-amber-800 dark:text-amber-300">
          <Archive className="h-4 w-4 shrink-0" />
          <span>Exibindo demandas arquivadas e convertidas em card. Itens desta lista não estão ativos no backlog.</span>
          <button
            onClick={() => setMostrarArquivadas(false)}
            className="ml-auto text-amber-600 hover:text-amber-800 dark:text-amber-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Conteúdo */}
      {isLoading ? (
        viewMode === "grid" ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : (
          <div className="rounded-xl border divide-y">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full rounded-none" />)}
          </div>
        )
      ) : demandasUrl === null ? (
        <EmptyState icon={FolderKanban} title="Nenhum projeto para este cliente" description="Associe projetos a este cliente para ver as demandas." />
      ) : demandasFiltradas.length === 0 && (demandas as Demanda[]).length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title={mostrarGeral ? "Nenhuma demanda geral" : mostrarArquivadas ? "Nenhuma demanda arquivada" : "Nenhuma demanda"}
          description={
            mostrarGeral
              ? "Demandas criadas sem projeto aparecerão aqui."
              : mostrarArquivadas
              ? "Demandas arquivadas e convertidas aparecerão aqui."
              : "Clique em Nova demanda para adicionar ao backlog."
          }
          action={!mostrarArquivadas ? { label: "Nova demanda", onClick: () => setDialogOpen(true) } : undefined}
        />
      ) : demandasFiltradas.length === 0 ? (
        <EmptyState icon={ListTodo} title="Nenhuma demanda corresponde aos filtros" description="Tente ajustar os filtros." />
      ) : viewMode === "grid" ? (
        /* ---- GRID VIEW ---- */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {demandasFiltradas.map((d: Demanda) => (
            <Card
              key={d.id}
              className={`group relative cursor-pointer hover:shadow-md transition-shadow ${d.arquivada || d.convertida ? "opacity-70" : ""}`}
              onClick={() => setEditingDemanda(d)}
            >
              {/* Menu de ações */}
              <span className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
                <DemandaActionsMenu
                  demanda={d}
                  onEdit={() => setEditingDemanda(d)}
                  onArquivar={() => arquivarDemanda.mutate({ id: d.id, arquivada: true })}
                  onDesarquivar={() => arquivarDemanda.mutate({ id: d.id, arquivada: false })}
                  onDelete={() => setDeletingDemanda(d)}
                />
              </span>

              <CardHeader className="pb-2 pr-10">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">{d.titulo}</CardTitle>
                  <PrioridadeBadge prioridade={d.prioridade} className="shrink-0 ml-1" />
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <RefinamentoBadge status={d.statusRefinamento} />
                  <ProjetoTag d={d} />
                  {d.arquivada && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded shrink-0">
                      <Archive className="h-2.5 w-2.5" />Arquivada
                    </span>
                  )}
                  {d.convertida && !d.arquivada && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded shrink-0">
                      ✓ Convertida
                    </span>
                  )}
                  {d.solicitante && (
                    <span className="text-xs text-muted-foreground">por {d.solicitante.nome}</span>
                  )}
                </div>
                {d.responsavel && (
                  <div className="flex items-center gap-1 mt-1">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{d.responsavel.nome}</span>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                {d.descricao && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{d.descricao}</p>
                )}
                {/* Elementos interativos: stopPropagation para não abrir o dialog */}
                <div
                  className="flex gap-2 flex-wrap items-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  {!d.arquivada && !d.convertida && (
                    <select
                      className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                      value={d.statusRefinamento}
                      onChange={(e) => updateStatus.mutate({ id: d.id, statusRefinamento: e.target.value })}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{STATUS_REFINAMENTO_LABEL[s]}</option>
                      ))}
                    </select>
                  )}
                  {!d.arquivada && !d.convertida && d.statusRefinamento === "PRONTO_PARA_SPRINT" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => criarCard.mutate(d.id)}
                      disabled={criarCard.isPending}
                      className="h-7 text-xs border-green-300 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400"
                    >
                      <ArrowRight className="h-3 w-3 mr-1" />
                      Criar card
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* ---- LIST VIEW ---- */
        <div className="rounded-xl border overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-3 px-4 py-2 bg-muted/40 border-b text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Título</span>
            <span className="hidden sm:block w-24 text-center">Status</span>
            <span className="hidden md:block w-16 text-center">Prioridade</span>
            <span className="hidden lg:block w-28">Responsável</span>
            <span className="w-24 text-right">Ações</span>
          </div>

          {demandasFiltradas.map((d: Demanda, idx) => (
            <div
              key={d.id}
              className={`grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors group cursor-pointer ${idx !== 0 ? "border-t" : ""} ${d.arquivada || d.convertida ? "opacity-70" : ""}`}
              onClick={() => setEditingDemanda(d)}
            >
              {/* Título + meta */}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{d.titulo}</p>
                  {d.arquivada && (
                    <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">
                      <Archive className="h-2.5 w-2.5" />Arquivada
                    </span>
                  )}
                  {d.convertida && !d.arquivada && (
                    <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 font-medium">✓ Card</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <ProjetoTag d={d} />
                  {d.responsavel && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 sm:hidden">
                      <User className="h-3 w-3" />{d.responsavel.nome}
                    </span>
                  )}
                  {d.descricao && (
                    <span className="text-[10px] text-muted-foreground/70 hidden lg:block truncate max-w-[200px]">
                      {d.descricao}
                    </span>
                  )}
                </div>
              </div>

              {/* Status select */}
              <div className="hidden sm:block w-36" onClick={(e) => e.stopPropagation()}>
                {!d.arquivada && !d.convertida ? (
                  <select
                    className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                    value={d.statusRefinamento}
                    onChange={(e) => updateStatus.mutate({ id: d.id, statusRefinamento: e.target.value })}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{STATUS_REFINAMENTO_LABEL[s]}</option>
                    ))}
                  </select>
                ) : (
                  <RefinamentoBadge status={d.statusRefinamento} />
                )}
              </div>

              {/* Prioridade */}
              <div className="hidden md:block w-16 text-center">
                <PrioridadeBadge prioridade={d.prioridade} />
              </div>

              {/* Responsável */}
              <div className="hidden lg:block w-28">
                {d.responsavel ? (
                  <span className="text-xs text-muted-foreground truncate block">{d.responsavel.nome}</span>
                ) : (
                  <span className="text-xs text-muted-foreground/50">—</span>
                )}
              </div>

              {/* Ações */}
              <div className="flex items-center gap-1 justify-end w-24" onClick={(e) => e.stopPropagation()}>
                {!d.arquivada && !d.convertida && d.statusRefinamento === "PRONTO_PARA_SPRINT" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 w-7 p-0 border-green-300 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400"
                    title="Criar card no Kanban"
                    onClick={() => criarCard.mutate(d.id)}
                    disabled={criarCard.isPending}
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                )}
                <DemandaActionsMenu
                  demanda={d}
                  onEdit={() => setEditingDemanda(d)}
                  onArquivar={() => arquivarDemanda.mutate({ id: d.id, arquivada: true })}
                  onDesarquivar={() => arquivarDemanda.mutate({ id: d.id, arquivada: false })}
                  onDelete={() => setDeletingDemanda(d)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
