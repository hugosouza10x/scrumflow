"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { AiButton } from "@/components/ui/ai-button";
import {
  AlertCircle, Pencil, Check, X, Loader2, ChevronDown,
  Calendar, User, Zap, Hash, ShieldAlert, History,
  Paperclip, Clock, FolderOpen, MessageSquare, Archive, Trash2, MoreVertical,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { CARD_STATUS_LABEL, PRIORIDADE_LABEL } from "@/types";
import type { CardStatus, Prioridade } from "@/types";
import { CardComentarios } from "./card-comentarios";
import { CardSubtarefas } from "./card-subtarefas";

// ─── Types ────────────────────────────────────────────────────────────────────

type SubtarefaLite = { id: string; titulo: string; status: string };
type Historico = {
  id: string;
  campo: string | null;
  valorAnterior: string | null;
  valorNovo: string | null;
  createdAt: string;
  user?: { id: string; nome: string } | null;
};

export type CardDetail = {
  id: string;
  titulo: string;
  descricao: string | null;
  criteriosAceite: string | null;
  status: string;
  prioridade: string;
  estimativa: number | null;
  prazo: string | null;
  bloqueado: boolean;
  motivoBloqueio: string | null;
  bloqueadoPorId: string | null;
  bloqueadoPor: { id: string; titulo: string } | null;
  responsavelId: string | null;
  responsavel: { id: string; nome: string } | null;
  responsaveis?: { user: { id: string; nome: string } }[];
  sprintId: string | null;
  sprint: { id: string; nome: string } | null;
  projeto: { id: string; nome: string } | null;
  projetoId: string | null;
  subtarefas: SubtarefaLite[];
  historicos: Historico[];
  anexos: Array<{ id: string; nome: string; tamanho: number }>;
};

type Usuario = { id: string; nome: string };
type Sprint = { id: string; nome: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const CAMPO_LABEL: Record<string, string> = {
  titulo: "Título",
  descricao: "Descrição",
  criteriosAceite: "Critérios de aceite",
  prioridade: "Prioridade",
  responsavelId: "Responsável",
  estimativa: "Estimativa",
  prazo: "Prazo",
  status: "Status",
  sprintId: "Sprint",
  bloqueado: "Bloqueado",
  epicoId: "Épico",
};

const STATUS_ORDER: CardStatus[] = [
  "BACKLOG", "PRONTO_PARA_SPRINT", "A_FAZER", "EM_ANDAMENTO",
  "EM_REVISAO", "BLOQUEADO", "HOMOLOGACAO", "CONCLUIDO", "CANCELADO",
];

// Dot color per status (for Select options)
const STATUS_DOT: Record<CardStatus, string> = {
  BACKLOG: "bg-slate-400",
  PRONTO_PARA_SPRINT: "bg-blue-500",
  A_FAZER: "bg-indigo-500",
  EM_ANDAMENTO: "bg-sky-500",
  EM_REVISAO: "bg-violet-500",
  BLOQUEADO: "bg-red-500",
  HOMOLOGACAO: "bg-orange-500",
  CONCLUIDO: "bg-green-500",
  CANCELADO: "bg-gray-400",
};

// Badge style per status (header read-only display)
const STATUS_BADGE: Record<CardStatus, string> = {
  BACKLOG: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  PRONTO_PARA_SPRINT: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  A_FAZER: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  EM_ANDAMENTO: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  EM_REVISAO: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  BLOQUEADO: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  HOMOLOGACAO: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  CONCLUIDO: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  CANCELADO: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

const PRIORIDADE_DOT: Record<Prioridade, string> = {
  BAIXA: "bg-slate-400",
  MEDIA: "bg-blue-500",
  ALTA: "bg-orange-500",
  URGENTE: "bg-red-600",
};

const PRIORIDADE_BADGE: Record<Prioridade, string> = {
  BAIXA: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  MEDIA: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300",
  ALTA: "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300",
  URGENTE: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function getInitials(nome: string) {
  return nome.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── InlineTextField ──────────────────────────────────────────────────────────

type InlineTextFieldProps = {
  value: string | null;
  draft: string;
  setDraft: (v: string) => void;
  label: string;
  multiline?: boolean;
  rows?: number;
  isEditing: boolean;
  isSaving: boolean;
  onStartEdit: () => void;
  onSave: (v: string | null) => void;
  onCancel: () => void;
  showAi?: boolean;
  aiLoading?: boolean;
  onAi?: () => void;
  aiLabel?: string;
};

function InlineTextField({
  value, draft, setDraft, label, multiline, rows = 5,
  isEditing, isSaving, onStartEdit, onSave, onCancel,
  showAi, aiLoading, onAi, aiLabel,
}: InlineTextFieldProps) {
  if (!isEditing) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onStartEdit}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onStartEdit(); }}
        className="group relative rounded-md border border-transparent hover:border-border hover:bg-muted/30 cursor-text transition-all px-3 py-2.5 -mx-3"
      >
        {value ? (
          <MarkdownContent content={value} />
        ) : (
          <p className="text-sm text-muted-foreground italic flex items-center gap-1.5">
            <Pencil className="h-3.5 w-3.5 shrink-0" />
            Clique para adicionar {label.toLowerCase()}…
          </p>
        )}
        {value && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-background border rounded px-1.5 py-0.5">
              <Pencil className="h-2.5 w-2.5" /> Editar
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {showAi && onAi && (
        <div className="flex justify-end">
          <AiButton onClick={onAi} loading={!!aiLoading} label={aiLabel ?? "IA"} />
        </div>
      )}
      {multiline ? (
        <textarea
          autoFocus
          rows={rows}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm resize-y outline-none focus:ring-2 focus:ring-ring min-h-[120px]"
        />
      ) : (
        <input
          autoFocus
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave(draft.trim());
            if (e.key === "Escape") onCancel();
          }}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      )}
      <div className="flex items-center gap-2">
        <Button size="sm" disabled={isSaving} onClick={() => onSave(draft.trim() || null)}>
          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
          Salvar
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={isSaving}>
          <X className="h-3.5 w-3.5 mr-1.5" />
          Cancelar
        </Button>
      </div>
    </div>
  );
}

// ─── SidebarField ─────────────────────────────────────────────────────────────

function SidebarField({ label, icon: Icon, children }: {
  label: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">{label}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}

// ─── CardBloqueadorSearch ─────────────────────────────────────────────────────

function CardBloqueadorSearch({
  cardId,
  value,
  onChange,
  onClear,
  disabled,
}: {
  cardId: string;
  value: { id: string; titulo: string } | null;
  onChange: (id: string, titulo: string) => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; titulo: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useState<ReturnType<typeof setTimeout> | null>(null);

  function handleSearch(q: string) {
    setQuery(q);
    if (debounceRef[0]) clearTimeout(debounceRef[0]);
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    debounceRef[1](
      setTimeout(async () => {
        setLoading(true);
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&tipo=card`);
          if (!res.ok) return;
          const data = await res.json();
          // Filter out the current card
          setResults((data.cards ?? []).filter((c: { id: string }) => c.id !== cardId).slice(0, 8));
          setOpen(true);
        } finally {
          setLoading(false);
        }
      }, 300)
    );
  }

  if (value) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/10 px-2.5 py-1.5">
        <ShieldAlert className="h-3.5 w-3.5 text-red-600 dark:text-red-400 shrink-0" />
        <span className="text-sm text-red-700 dark:text-red-300 flex-1 truncate" title={value.titulo}>
          {value.titulo}
        </span>
        {!disabled && (
          <button
            onClick={onClear}
            className="text-red-400 hover:text-red-600 transition-colors shrink-0"
            title="Remover card bloqueador"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-md border border-input bg-background px-2.5 py-1.5">
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin shrink-0" />
        ) : (
          <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
        <input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Buscar card bloqueador…"
          disabled={disabled}
          className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground/60 disabled:cursor-not-allowed"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-md py-1 max-h-48 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onMouseDown={() => {
                onChange(r.id, r.titulo);
                setQuery("");
                setResults([]);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors truncate"
            >
              {r.titulo}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CardInlineClient({
  card: initialCard,
  usuarios,
  sprints,
}: {
  card: CardDetail;
  usuarios: Usuario[];
  sprints: Sprint[];
}) {
  const router = useRouter();
  const [card, setCard] = useState<CardDetail>(initialCard);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [prazoEditValue, setPrazoEditValue] = useState<string>("");
  const [aiLoading, setAiLoading] = useState<"descricao" | "criterios" | null>(null);
  const [responsaveisDropdownOpen, setResponsaveisDropdownOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [titleDraft, setTitleDraft] = useState(initialCard.titulo);
  const [descDraft, setDescDraft] = useState(initialCard.descricao ?? "");
  const [critDraft, setCritDraft] = useState(initialCard.criteriosAceite ?? "");
  const [motivoDraft, setMotivoDraft] = useState(initialCard.motivoBloqueio ?? "");
  const [bloqueioEditando, setBloqueioEditando] = useState(false);

  // ─── Validations ────────────────────────────────────────────────────────────

  function validatePrazo(value: string | null): string | null {
    if (!value) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (new Date(value) < today) return "O prazo não pode ser uma data no passado.";
    return null;
  }

  function validateConcluido(): string | null {
    const pendentes = card.subtarefas.filter((s) => s.status !== "CONCLUIDA" && s.status !== "CANCELADA");
    if (pendentes.length > 0) return `Não é possível concluir: ${pendentes.length} subtarefa(s) pendente(s).`;
    return null;
  }

  // ─── Save field ─────────────────────────────────────────────────────────────

  const saveField = useCallback(
    async (field: string, value: unknown, extra?: Record<string, unknown>) => {
      if (field === "prazo") {
        const err = validatePrazo(value as string | null);
        if (err) { toast.error(err); return; }
      }
      if (field === "status" && value === "CONCLUIDO") {
        const err = validateConcluido();
        if (err) { toast.error(err); return; }
      }
      if (field === "titulo") {
        const v = String(value).trim();
        if (v.length < 2) { toast.error("Título deve ter pelo menos 2 caracteres."); return; }
        if (v.length > 200) { toast.error("Título muito longo (máx. 200 caracteres)."); return; }
      }
      if (field === "estimativa" && value != null) {
        const n = Number(value);
        if (!Number.isInteger(n) || n < 0) { toast.error("Estimativa deve ser um número inteiro positivo."); return; }
      }

      setSavingField(field);
      try {
        const res = await fetch(`/api/cards/${card.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: value, ...extra }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message ?? "Erro ao salvar");
        }
        const updated = await res.json();
        setCard((prev) => ({
          ...prev,
          ...updated,
          subtarefas: prev.subtarefas,
          historicos: updated.historicos ?? prev.historicos,
          anexos: prev.anexos,
        }));
        setEditingField(null);
        toast.success("Salvo");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar");
      } finally {
        setSavingField(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [card.id, card.subtarefas]
  );

  // ─── Confirmar prazo (explicit save for date field) ─────────────────────────

  const handleAbrirPrazoEdit = () => {
    setPrazoEditValue(card.prazo?.slice(0, 10) ?? "");
    setEditingField("prazo");
  };

  const handleConfirmarPrazo = () => {
    const v = prazoEditValue;
    setEditingField(null);
    if (v !== (card.prazo?.slice(0, 10) ?? "")) {
      saveField("prazo", v || null);
    }
  };

  // ─── Archive / Delete ───────────────────────────────────────────────────────

  async function handleArquivar() {
    setIsArchiving(true);
    try {
      const res = await fetch(`/api/cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ arquivado: true }),
      });
      if (!res.ok) throw new Error("Erro ao arquivar");
      toast.success("Card arquivado.");
      router.push("/dashboard/kanban");
    } catch {
      toast.error("Erro ao arquivar card.");
    } finally {
      setIsArchiving(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/cards/${card.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir");
      toast.success("Card excluído.");
      router.push("/dashboard/kanban");
    } catch {
      toast.error("Erro ao excluir card.");
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  }

  // ─── AI ─────────────────────────────────────────────────────────────────────

  async function handleAi(action: "improve-description" | "generate-criteria") {
    const isDesc = action === "improve-description";
    setAiLoading(isDesc ? "descricao" : "criterios");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, titulo: card.titulo, descricao: descDraft }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (isDesc) setDescDraft(data.descricao ?? descDraft);
      else setCritDraft(data.criteriosAceite ?? critDraft);
      toast.success("IA aplicada — revise e salve.");
    } catch {
      toast.error("Erro ao chamar IA.");
    } finally {
      setAiLoading(null);
    }
  }

  // ─── Format history values ──────────────────────────────────────────────────

  function formatHistoricoValue(campo: string | null, valor: string | null): string {
    if (valor == null) return "—";
    if (!campo) return valor;

    if (campo === "responsavelId") {
      const user = usuarios.find((u) => u.id === valor);
      return user ? user.nome : valor;
    }
    if (campo === "status") {
      return CARD_STATUS_LABEL[valor as CardStatus] ?? valor;
    }
    if (campo === "prioridade") {
      return PRIORIDADE_LABEL[valor as Prioridade] ?? valor;
    }
    if (campo === "sprintId") {
      const sprint = sprints.find((s) => s.id === valor);
      return sprint ? sprint.nome : valor;
    }
    if (campo === "bloqueado") {
      return valor === "true" ? "Sim" : "Não";
    }
    if (campo === "prazo") {
      try { return formatDate(valor); } catch { return valor; }
    }
    return valor;
  }

  // ─── Derived ────────────────────────────────────────────────────────────────

  const responsaveisLista: { id: string; nome: string }[] =
    card.responsaveis?.length
      ? card.responsaveis.map((r) => r.user)
      : card.responsavel
      ? [card.responsavel]
      : [];

  const isOverdue = card.prazo
    && !["CONCLUIDO", "CANCELADO"].includes(card.status)
    && new Date(card.prazo) < new Date(new Date().setHours(0, 0, 0, 0));

  const statusStyle = STATUS_BADGE[card.status as CardStatus] ?? "bg-muted text-muted-foreground";
  const prioStyle = PRIORIDADE_BADGE[card.prioridade as Prioridade] ?? "bg-muted text-muted-foreground";
  const statusDot = STATUS_DOT[card.status as CardStatus] ?? "bg-muted-foreground";
  const prioDot = PRIORIDADE_DOT[card.prioridade as Prioridade] ?? "bg-muted-foreground";

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 max-w-6xl">

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir card</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. O card será removido permanentemente, incluindo subtarefas, comentários e histórico.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
            <p className="text-sm font-medium">{card.titulo}</p>
            {card.projeto && (
              <p className="text-xs text-muted-foreground mt-0.5">{card.projeto.nome}</p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              {isDeleting ? "Excluindo…" : "Excluir card"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Breadcrumb + Actions ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {card.projeto ? (
          <>
            <FolderOpen className="h-4 w-4 shrink-0" />
            <Link
              href={`/dashboard/projetos/${card.projetoId}`}
              className="hover:text-foreground hover:underline transition-colors"
            >
              {card.projeto.nome}
            </Link>
            <span>/</span>
          </>
        ) : (
          <>
            <Hash className="h-4 w-4 shrink-0" />
            <span>Tarefa avulsa</span>
            <span>/</span>
          </>
        )}
        <span className="text-foreground/60 truncate">Detalhes do card</span>

        {/* Card lifecycle actions */}
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={handleArquivar}
            disabled={isArchiving}
            title="Arquivar este card (remove do kanban, preserva histórico)"
          >
            {isArchiving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">Arquivar</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir card
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Title ──────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {editingField === "titulo" ? (
          <div className="space-y-2">
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveField("titulo", titleDraft.trim());
                if (e.key === "Escape") { setEditingField(null); setTitleDraft(card.titulo); }
              }}
              className="text-2xl font-bold w-full border-b-2 border-primary bg-transparent outline-none py-1 leading-tight"
              placeholder="Título do card"
            />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                disabled={savingField === "titulo"}
                onClick={() => saveField("titulo", titleDraft.trim())}
              >
                {savingField === "titulo"
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  : <Check className="h-3.5 w-3.5 mr-1.5" />}
                Salvar título
              </Button>
              <Button
                size="sm" variant="ghost"
                onClick={() => { setEditingField(null); setTitleDraft(card.titulo); }}
              >
                <X className="h-3.5 w-3.5 mr-1.5" /> Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="group flex items-start gap-2">
            <h1
              role="button"
              tabIndex={0}
              onClick={() => { setEditingField("titulo"); setTitleDraft(card.titulo); }}
              onKeyDown={(e) => { if (e.key === "Enter") { setEditingField("titulo"); setTitleDraft(card.titulo); } }}
              className="text-2xl font-bold cursor-text leading-tight flex-1"
            >
              {card.titulo}
            </h1>
            <button
              onClick={() => { setEditingField("titulo"); setTitleDraft(card.titulo); }}
              className="mt-1 p-1.5 rounded-md text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted transition-all shrink-0"
              title="Editar título"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Quick-info badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyle}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${statusDot}`} />
            {CARD_STATUS_LABEL[card.status as CardStatus] ?? card.status}
          </span>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${prioStyle}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${prioDot}`} />
            {PRIORIDADE_LABEL[card.prioridade as Prioridade] ?? card.prioridade}
          </span>
          {card.sprint && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground font-medium">
              <Clock className="h-3 w-3" />
              {card.sprint.nome}
            </span>
          )}
          {responsaveisLista.map((r) => (
            <span key={r.id} className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground font-medium">
              <span className="h-4 w-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[8px] font-bold shrink-0">
                {getInitials(r.nome)}
              </span>
              {r.nome.split(" ")[0]}
            </span>
          ))}
        </div>
      </div>

      {/* ── Block alert ────────────────────────────────────────────────────── */}
      {card.bloqueado && (
        <div className="flex items-start gap-3 rounded-lg border-l-4 border-destructive bg-destructive/5 p-4">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-destructive">Card bloqueado</p>
            {card.motivoBloqueio && (
              <p className="text-sm text-destructive/80 mt-0.5 break-words">{card.motivoBloqueio}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Two-column layout ──────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">

        {/* ── LEFT ─────────────────────────────────────────────────────────── */}
        <div className="space-y-4 min-w-0">

          {/* Description */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Descrição
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <InlineTextField
                value={card.descricao} draft={descDraft} setDraft={setDescDraft} label="Descrição"
                multiline rows={5}
                isEditing={editingField === "descricao"} isSaving={savingField === "descricao"}
                onStartEdit={() => { setEditingField("descricao"); setDescDraft(card.descricao ?? ""); }}
                onSave={(v) => saveField("descricao", v)}
                onCancel={() => { setEditingField(null); setDescDraft(card.descricao ?? ""); }}
                showAi aiLoading={aiLoading === "descricao"} onAi={() => handleAi("improve-description")} aiLabel="Melhorar com IA"
              />
            </CardContent>
          </Card>

          {/* Acceptance criteria */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Critérios de aceite
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <InlineTextField
                value={card.criteriosAceite} draft={critDraft} setDraft={setCritDraft} label="Critérios de aceite"
                multiline rows={4}
                isEditing={editingField === "criteriosAceite"} isSaving={savingField === "criteriosAceite"}
                onStartEdit={() => { setEditingField("criteriosAceite"); setCritDraft(card.criteriosAceite ?? ""); }}
                onSave={(v) => saveField("criteriosAceite", v)}
                onCancel={() => { setEditingField(null); setCritDraft(card.criteriosAceite ?? ""); }}
                showAi aiLoading={aiLoading === "criterios"} onAi={() => handleAi("generate-criteria")} aiLabel="Gerar critérios"
              />
            </CardContent>
          </Card>

          {/* Subtasks */}
          <CardSubtarefas
            cardId={card.id}
            onSubtarefasChange={(subs) => setCard((c) => ({ ...c, subtarefas: subs }))}
          />

          {/* Attachments — always visible */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Anexos
                {card.anexos.length > 0 && (
                  <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs font-normal">
                    {card.anexos.length}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {card.anexos.length > 0 ? (
                <ul className="space-y-1.5">
                  {card.anexos.map((a) => (
                    <li key={a.id} className="flex items-center gap-2.5 rounded-md px-2.5 py-2 bg-muted/40 text-sm">
                      <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="flex-1 min-w-0 truncate">{a.nome}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatFileSize(a.tamanho)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground italic">Nenhum anexo adicionado</p>
              )}
            </CardContent>
          </Card>

          {/* Tabs: Comments + History */}
          <Tabs defaultValue="comentarios">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="comentarios" className="gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                Comentários
              </TabsTrigger>
              <TabsTrigger value="historico" className="gap-1.5">
                <History className="h-3.5 w-3.5" />
                Histórico
                {card.historicos.length > 0 && (
                  <span className="ml-1 rounded-full bg-background px-1.5 py-0.5 text-[10px] font-semibold">
                    {card.historicos.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="comentarios" className="mt-4">
              <CardComentarios cardId={card.id} />
            </TabsContent>

            <TabsContent value="historico" className="mt-4">
              {card.historicos.length > 0 ? (
                <ul className="space-y-3">
                  {card.historicos.map((h) => (
                    <li key={h.id} className="flex gap-3">
                      <div className="shrink-0 h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground mt-0.5">
                        {h.user ? getInitials(h.user.nome) : "?"}
                      </div>
                      <div className="flex-1 min-w-0 rounded-md border bg-muted/20 px-3 py-2.5 text-sm">
                        <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium">{h.user?.nome ?? "Sistema"}</span>
                            <span className="text-muted-foreground">alterou</span>
                            <span className="font-medium text-primary">
                              {CAMPO_LABEL[h.campo ?? ""] ?? h.campo}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {new Date(h.createdAt).toLocaleString("pt-BR", {
                              day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
                            })}
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-start gap-1.5 text-xs">
                            <span className="shrink-0 text-muted-foreground/60 font-medium pt-px">De:</span>
                            <span className="text-muted-foreground line-through break-words">{formatHistoricoValue(h.campo, h.valorAnterior)}</span>
                          </div>
                          <div className="flex items-start gap-1.5 text-xs">
                            <span className="shrink-0 text-muted-foreground/60 font-medium pt-px">Para:</span>
                            <span className="break-words">{formatHistoricoValue(h.campo, h.valorNovo)}</span>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-10">
                  Nenhuma alteração registrada
                </p>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* ── RIGHT Sidebar ─────────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Details card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Detalhes</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-5">

              {/* Status */}
              <SidebarField label="Status" icon={Zap}>
                <div className="relative">
                  {savingField === "status" && (
                    <Loader2 className="absolute right-8 top-2.5 h-3.5 w-3.5 animate-spin text-primary z-10" />
                  )}
                  <Select
                    value={card.status}
                    onValueChange={(v) => saveField("status", v)}
                    disabled={savingField === "status"}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue>
                        <span className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full shrink-0 ${STATUS_DOT[card.status as CardStatus] ?? "bg-muted-foreground"}`} />
                          {CARD_STATUS_LABEL[card.status as CardStatus] ?? card.status}
                        </span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_ORDER.map((s) => (
                        <SelectItem key={s} value={s}>
                          <span className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full shrink-0 ${STATUS_DOT[s]}`} />
                            {CARD_STATUS_LABEL[s]}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </SidebarField>

              {/* Priority */}
              <SidebarField label="Prioridade" icon={Hash}>
                <div className="relative">
                  {savingField === "prioridade" && (
                    <Loader2 className="absolute right-8 top-2.5 h-3.5 w-3.5 animate-spin text-primary z-10" />
                  )}
                  <Select
                    value={card.prioridade}
                    onValueChange={(v) => saveField("prioridade", v)}
                    disabled={savingField === "prioridade"}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue>
                        <span className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full shrink-0 ${PRIORIDADE_DOT[card.prioridade as Prioridade] ?? "bg-muted-foreground"}`} />
                          {PRIORIDADE_LABEL[card.prioridade as Prioridade] ?? card.prioridade}
                        </span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PRIORIDADE_LABEL) as Prioridade[]).map((p) => (
                        <SelectItem key={p} value={p}>
                          <span className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full shrink-0 ${PRIORIDADE_DOT[p]}`} />
                            {PRIORIDADE_LABEL[p]}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </SidebarField>

              {/* Assignees */}
              <SidebarField label="Responsáveis" icon={User}>
                <div className="space-y-1.5">
                  {/* Chips */}
                  {responsaveisLista.length > 0 && (
                    <div className="flex flex-wrap gap-1 px-0.5">
                      {responsaveisLista.map((r) => (
                        <span key={r.id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                          <span className="h-4 w-4 rounded-full bg-primary/25 flex items-center justify-center text-[8px] font-bold shrink-0">
                            {getInitials(r.nome)}
                          </span>
                          {r.nome.split(" ")[0]}
                          <button
                            type="button"
                            disabled={!!savingField}
                            onClick={() => {
                              const newIds = responsaveisLista.filter((u) => u.id !== r.id).map((u) => u.id);
                              saveField("responsaveisIds", newIds);
                            }}
                            className="ml-0.5 hover:text-destructive transition-colors disabled:opacity-50"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </span>
                      ))}
                      {savingField === "responsaveisIds" && <Loader2 className="h-3 w-3 animate-spin text-primary self-center" />}
                    </div>
                  )}
                  {/* Dropdown to add/toggle */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setResponsaveisDropdownOpen((v) => !v)}
                      disabled={!!savingField}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm flex items-center justify-between text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    >
                      <span className="text-xs truncate">
                        {responsaveisLista.length === 0 ? "Adicionar responsável…" : "Adicionar / remover…"}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
                    </button>
                    {responsaveisDropdownOpen && (
                      <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-md py-1 max-h-48 overflow-y-auto">
                        {usuarios.map((u) => {
                          const isSelected = responsaveisLista.some((r) => r.id === u.id);
                          return (
                            <label key={u.id} className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  const newIds = isSelected
                                    ? responsaveisLista.filter((r) => r.id !== u.id).map((r) => r.id)
                                    : [...responsaveisLista.map((r) => r.id), u.id];
                                  saveField("responsaveisIds", newIds);
                                  setResponsaveisDropdownOpen(false);
                                }}
                                className="h-3.5 w-3.5 rounded accent-primary"
                              />
                              <span className="h-5 w-5 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[9px] font-bold shrink-0">
                                {getInitials(u.nome)}
                              </span>
                              {u.nome}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </SidebarField>

              {/* Sprint */}
              <SidebarField label="Sprint" icon={Clock}>
                <div className="relative">
                  {savingField === "sprintId" && (
                    <Loader2 className="absolute right-8 top-2.5 h-3.5 w-3.5 animate-spin text-primary z-10" />
                  )}
                  <Select
                    value={card.sprintId ?? "__none__"}
                    onValueChange={(v) => saveField("sprintId", v === "__none__" ? null : v)}
                    disabled={savingField === "sprintId"}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Nenhuma sprint" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">
                        <span className="text-muted-foreground">Nenhuma</span>
                      </SelectItem>
                      {sprints.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </SidebarField>

              {/* Due date */}
              <SidebarField label="Prazo" icon={Calendar}>
                {savingField === "prazo" && <Loader2 className="h-3 w-3 animate-spin text-primary mb-1" />}
                {editingField === "prazo" ? (
                  <div className="space-y-1.5">
                    <input
                      autoFocus
                      type="date"
                      value={prazoEditValue}
                      onChange={(e) => setPrazoEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); handleConfirmarPrazo(); }
                        if (e.key === "Escape") setEditingField(null);
                      }}
                      className="text-sm border border-input rounded-md px-2.5 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleConfirmarPrazo}
                        className="flex-1 h-7 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                      >
                        Confirmar
                      </button>
                      {card.prazo && (
                        <button
                          type="button"
                          onClick={() => { saveField("prazo", null); setEditingField(null); }}
                          className="h-7 px-2 rounded-md border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          Limpar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditingField(null)}
                        className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                        aria-label="Cancelar"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleAbrirPrazoEdit}
                    className={`text-sm text-left w-full rounded-md px-2.5 py-1.5 border border-transparent hover:border-border hover:bg-muted/30 transition-all flex items-center gap-1.5 ${
                      isOverdue ? "text-red-600 font-medium" : card.prazo ? "text-foreground" : "text-muted-foreground italic"
                    }`}
                  >
                    <Calendar className="h-3.5 w-3.5 shrink-0 opacity-50" />
                    {card.prazo ? formatDate(card.prazo) : "Definir prazo"}
                    {isOverdue && (
                      <span className="ml-auto text-[10px] font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 rounded-full px-1.5 py-0.5 shrink-0">
                        Vencido
                      </span>
                    )}
                  </button>
                )}
              </SidebarField>

              {/* Estimation */}
              <SidebarField label="Estimativa (story points)" icon={Hash}>
                {savingField === "estimativa" && <Loader2 className="h-3 w-3 animate-spin text-primary mb-1" />}
                {editingField === "estimativa" ? (
                  <input
                    autoFocus type="number" min={0} step={1}
                    defaultValue={card.estimativa ?? ""}
                    onBlur={(e) => {
                      setEditingField(null);
                      const v = e.target.value;
                      const num = v !== "" ? parseInt(v, 10) : null;
                      if (num !== card.estimativa) saveField("estimativa", num === null ? undefined : num);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setEditingField(null);
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    }}
                    className="text-sm border border-input rounded-md px-2.5 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                ) : (
                  <button
                    onClick={() => setEditingField("estimativa")}
                    className="text-sm text-left w-full rounded-md px-2.5 py-1.5 border border-transparent hover:border-border hover:bg-muted/30 transition-all flex items-center gap-2"
                  >
                    {card.estimativa != null ? (
                      <>
                        <span className="font-semibold text-base">{card.estimativa}</span>
                        <span className="text-muted-foreground">pts</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground italic">Definir estimativa</span>
                    )}
                  </button>
                )}
              </SidebarField>

            </CardContent>
          </Card>

          {/* Block card */}
          <Card className={card.bloqueado ? "border-destructive/50 bg-destructive/5" : ""}>
            <CardHeader className="pb-3">
              <CardTitle className={`text-sm font-semibold flex items-center gap-2 ${card.bloqueado ? "text-destructive" : ""}`}>
                <ShieldAlert className="h-4 w-4" />
                Bloqueio
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {/* Toggle */}
              <div className="flex items-center gap-2">
                {savingField === "bloqueado" && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={card.bloqueado}
                    disabled={!!savingField}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setMotivoDraft("");
                        setBloqueioEditando(true);
                      } else {
                        saveField("bloqueado", false, { motivoBloqueio: null, bloqueadoPorId: null });
                        setBloqueioEditando(false);
                      }
                    }}
                    className="h-4 w-4 rounded border-input accent-destructive"
                  />
                  <span className={`text-sm font-medium ${card.bloqueado ? "text-destructive" : "text-muted-foreground"}`}>
                    {card.bloqueado ? "Card bloqueado" : "Marcar como bloqueado"}
                  </span>
                </label>
              </div>

              {/* Bloqueio ativo: campos expandidos */}
              {(card.bloqueado || bloqueioEditando) && (
                <div className="space-y-3 pl-1">
                  {/* Card bloqueador */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Card que está bloqueando</label>
                    <CardBloqueadorSearch
                      cardId={card.id}
                      value={card.bloqueadoPor ?? null}
                      disabled={!!savingField}
                      onChange={(id, titulo) => {
                        saveField("bloqueadoPorId", id);
                        // Optimistic update via setCard (handled in saveField's updated response)
                      }}
                      onClear={() => saveField("bloqueadoPorId", null)}
                    />
                  </div>

                  {/* Motivo externo */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Motivo externo (opcional)</label>
                    <input
                      type="text"
                      value={motivoDraft}
                      onChange={(e) => setMotivoDraft(e.target.value)}
                      placeholder="Ex: aguardando cliente, deploy pendente…"
                      disabled={!!savingField && savingField !== "motivoBloqueio"}
                      className="text-sm border border-input rounded-md px-2.5 py-2 w-full focus:outline-none focus:ring-1 focus:ring-destructive/50"
                      onBlur={() => {
                        const trimmed = motivoDraft.trim();
                        if (trimmed !== (card.motivoBloqueio ?? "")) {
                          saveField("motivoBloqueio", trimmed || null);
                        }
                      }}
                    />
                  </div>

                  {/* Confirmar bloqueio (se ainda não bloqueado) */}
                  {bloqueioEditando && !card.bloqueado && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={!!savingField}
                        onClick={() => {
                          saveField("bloqueado", true, { motivoBloqueio: motivoDraft.trim() || null });
                          setBloqueioEditando(false);
                        }}
                      >
                        {savingField === "bloqueado"
                          ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                          : <ShieldAlert className="h-3 w-3 mr-1.5" />}
                        Confirmar bloqueio
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => { setBloqueioEditando(false); setMotivoDraft(card.motivoBloqueio ?? ""); }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Project link */}
          {card.projeto && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
              <FolderOpen className="h-3.5 w-3.5 shrink-0" />
              <span>Projeto:</span>
              <Link
                href={`/dashboard/projetos/${card.projetoId}`}
                className="text-primary hover:underline font-medium"
              >
                {card.projeto.nome}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
