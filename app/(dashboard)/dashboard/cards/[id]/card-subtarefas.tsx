"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckSquare2, Plus, Trash2, Loader2 } from "lucide-react";

type Subtarefa = {
  id: string;
  titulo: string;
  status: string;
  responsavel: { id: string; nome: string } | null;
};

export function CardSubtarefas({
  cardId,
  onSubtarefasChange,
}: {
  cardId: string;
  onSubtarefasChange?: (subs: { id: string; titulo: string; status: string }[]) => void;
}) {
  const queryClient = useQueryClient();
  const [titulo, setTitulo] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: subtarefas = [], isLoading } = useQuery<Subtarefa[]>({
    queryKey: ["card-subtarefas", cardId],
    queryFn: async () => {
      const res = await fetch(`/api/cards/${cardId}/subtarefas`);
      if (!res.ok) throw new Error("Erro ao carregar");
      const data = await res.json();
      onSubtarefasChange?.(data);
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async (t: string) => {
      const res = await fetch(`/api/cards/${cardId}/subtarefas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo: t }),
      });
      if (!res.ok) throw new Error("Erro ao criar");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["card-subtarefas", cardId] });
      setTitulo("");
    },
    onError: () => toast.error("Erro ao criar subtarefa"),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ subId, status }: { subId: string; status: string }) => {
      const res = await fetch(`/api/cards/${cardId}/subtarefas/${subId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar");
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["card-subtarefas", cardId] });
      const updated = subtarefas.map((s) =>
        s.id === vars.subId ? { ...s, status: vars.status } : s
      );
      onSubtarefasChange?.(updated);
    },
    onError: () => toast.error("Erro ao atualizar subtarefa"),
  });

  const deleteSubtarefa = useMutation({
    mutationFn: async (subId: string) => {
      const res = await fetch(`/api/cards/${cardId}/subtarefas/${subId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erro ao excluir");
    },
    onSuccess: (_, subId) => {
      queryClient.invalidateQueries({ queryKey: ["card-subtarefas", cardId] });
      const updated = subtarefas.filter((s) => s.id !== subId);
      onSubtarefasChange?.(updated);
      setDeletingId(null);
    },
    onError: () => {
      toast.error("Erro ao excluir subtarefa");
      setDeletingId(null);
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckSquare2 className="h-4 w-4 text-muted-foreground" />
            Subtarefas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const total = subtarefas.length;
  const concluidas = subtarefas.filter((s) => s.status === "CONCLUIDA").length;
  const pct = total > 0 ? Math.round((concluidas / total) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckSquare2 className="h-4 w-4 text-muted-foreground" />
            Subtarefas
            {total > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                · {concluidas}/{total} concluída{concluidas !== 1 ? "s" : ""}
              </span>
            )}
          </CardTitle>
          {total > 0 && (
            <span className="text-xs font-semibold text-muted-foreground">{pct}%</span>
          )}
        </div>
        {total > 0 && (
          <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <ul className="space-y-1">
          {subtarefas.map((s) => {
            const isDone = s.status === "CONCLUIDA";
            const isDeleting = deletingId === s.id && deleteSubtarefa.isPending;
            return (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded-md px-2 py-2 group hover:bg-muted/50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={isDone}
                  onChange={(e) =>
                    updateStatus.mutate({
                      subId: s.id,
                      status: e.target.checked ? "CONCLUIDA" : "PENDENTE",
                    })
                  }
                  disabled={updateStatus.isPending}
                  className="h-4 w-4 rounded border-input shrink-0 cursor-pointer accent-primary"
                />
                <span
                  className={`flex-1 text-sm leading-snug ${
                    isDone ? "line-through text-muted-foreground" : ""
                  }`}
                >
                  {s.titulo}
                </span>
                <button
                  onClick={() => {
                    setDeletingId(s.id);
                    deleteSubtarefa.mutate(s.id);
                  }}
                  disabled={isDeleting}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground/50 shrink-0"
                  title="Excluir subtarefa"
                >
                  {isDeleting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {subtarefas.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-3">
            Nenhuma subtarefa ainda
          </p>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!titulo.trim()) return;
            create.mutate(titulo.trim());
          }}
          className="flex gap-2 pt-1"
        >
          <Input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Nova subtarefa..."
            className="flex-1 h-8 text-sm"
          />
          <Button
            type="submit"
            size="sm"
            className="h-8 gap-1.5"
            disabled={create.isPending || !titulo.trim()}
          >
            {create.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Adicionar
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
