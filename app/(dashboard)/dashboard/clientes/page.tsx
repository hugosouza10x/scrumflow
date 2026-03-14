"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import {
  Building2, Plus, Pencil, Trash2, Mail, Phone,
  FolderKanban, LayoutList, ArrowRight, X, Loader2,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

const COR_PRESETS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
  "#f97316", "#6366f1",
];

type Cliente = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  cor: string | null;
  ativo: boolean;
  _count: { projetos: number; cards: number };
};

function ClienteFormDialog({
  initial,
  onClose,
  onSave,
  saving,
}: {
  initial?: Partial<Cliente>;
  onClose: () => void;
  onSave: (data: Partial<Cliente>) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    nome: initial?.nome ?? "",
    email: initial?.email ?? "",
    telefone: initial?.telefone ?? "",
    cor: initial?.cor ?? COR_PRESETS[0],
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl border bg-background shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{initial?.id ? "Editar cliente" : "Novo cliente"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nome *</label>
            <input
              value={form.nome}
              onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
              className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Ex: Empresa ABC"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">E-mail</label>
              <input
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="contato@empresa.com"
                type="email"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Telefone</label>
              <input
                value={form.telefone}
                onChange={(e) => setForm((p) => ({ ...p, telefone: e.target.value }))}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Cor identificadora</label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {COR_PRESETS.map((cor) => (
                <button
                  key={cor}
                  onClick={() => setForm((p) => ({ ...p, cor }))}
                  className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${
                    form.cor === cor ? "border-foreground scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: cor }}
                  title={cor}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-6">
          <button
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={!form.nome.trim() || saving}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {initial?.id ? "Salvar" : "Criar cliente"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClientesPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);

  const { data: clientes = [], isLoading } = useQuery<Cliente[]>({
    queryKey: ["clientes"],
    queryFn: async () => {
      const res = await fetch("/api/clientes");
      if (!res.ok) throw new Error("Erro ao carregar");
      return res.json();
    },
  });

  const create = useMutation({
    mutationFn: async (data: Partial<Cliente>) => {
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Erro ao criar cliente");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      setFormOpen(false);
      toast.success("Cliente criado!");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao criar cliente"),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Cliente> & { id: string }) => {
      const res = await fetch(`/api/clientes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erro ao atualizar");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      setEditing(null);
      toast.success("Cliente atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar cliente"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/clientes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      toast.success("Cliente removido.");
    },
    onError: () => toast.error("Não foi possível remover o cliente."),
  });

  const handleSave = (data: Partial<Cliente>) => {
    if (editing) {
      update.mutate({ id: editing.id, ...data });
    } else {
      create.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie os clientes atendidos pela equipe.
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setFormOpen(true); }}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" /> Novo cliente
        </button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : clientes.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Nenhum cliente cadastrado"
          description="Cadastre os clientes atendidos pela equipe para organizar projetos e tarefas."
          action={{ label: "Cadastrar cliente", href: "#" }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clientes.map((cliente) => (
            <div
              key={cliente.id}
              className="rounded-xl border bg-card hover:shadow-md transition-shadow overflow-hidden"
            >
              {/* Header colorido */}
              <div
                className="h-2"
                style={{ backgroundColor: cliente.cor ?? "#94a3b8" }}
              />
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ backgroundColor: cliente.cor ?? "#94a3b8" }}
                    >
                      {cliente.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-sm leading-tight">{cliente.nome}</p>
                      {!cliente.ativo && (
                        <span className="text-[10px] text-muted-foreground">Inativo</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => { setEditing(cliente); setFormOpen(true); }}
                      className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Remover o cliente "${cliente.nome}"?`)) {
                          remove.mutate(cliente.id);
                        }
                      }}
                      className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-muted-foreground">
                  {cliente.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3 w-3" /> {cliente.email}
                    </div>
                  )}
                  {cliente.telefone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3" /> {cliente.telefone}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1 border-t">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FolderKanban className="h-3 w-3" />
                      {cliente._count.projetos} projeto{cliente._count.projetos !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <LayoutList className="h-3 w-3" />
                      {cliente._count.cards} card{cliente._count.cards !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <Link
                    href={`/dashboard/clientes/${cliente.id}`}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Ver <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(formOpen || editing) && (
        <ClienteFormDialog
          initial={editing ?? undefined}
          onClose={() => { setFormOpen(false); setEditing(null); }}
          onSave={handleSave}
          saving={create.isPending || update.isPending}
        />
      )}
    </div>
  );
}
