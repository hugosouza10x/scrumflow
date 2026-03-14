"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SPRINT_STATUS_LABEL } from "@/types";
import { Play, CheckCheck, Zap } from "lucide-react";
import type { SprintStatus } from "@/types";

type Projeto = { id: string; nome: string };
type Sprint = {
  id: string;
  nome: string;
  objetivo: string | null;
  dataInicio: string;
  dataFim: string;
  capacidadeTotal: number | null;
  status: string;
  projetoId: string;
  projeto: { id: string; nome: string };
  _count: { cards: number };
};

const STATUS_STYLE: Record<string, string> = {
  EM_ANDAMENTO: "border-primary/40 bg-primary/5",
  PLANEJADA: "",
  CONCLUIDA: "opacity-70",
  CANCELADA: "opacity-50",
};

export function SprintsPageClient({ projetos }: { projetos: Projeto[] }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [projetoId, setProjetoId] = useState(projetos[0]?.id ?? "");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    objetivo: "",
    dataInicio: "",
    dataFim: "",
    capacidadeTotal: "",
  });

  const queryKey = ["sprints", projetoId];

  const { data: sprints = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/sprints?projetoId=${projetoId}`);
      if (!res.ok) throw new Error("Erro ao carregar sprints");
      return res.json();
    },
    enabled: !!projetoId,
  });

  const createSprint = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch("/api/sprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: data.nome,
          objetivo: data.objetivo || undefined,
          dataInicio: data.dataInicio,
          dataFim: data.dataFim,
          capacidadeTotal: data.capacidadeTotal ? parseInt(data.capacidadeTotal, 10) : undefined,
          projetoId,
        }),
      });
      if (!res.ok) throw new Error("Erro ao criar sprint");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setDialogOpen(false);
      setForm({ nome: "", objetivo: "", dataInicio: "", dataFim: "", capacidadeTotal: "" });
      toast.success("Sprint criada!");
    },
    onError: () => toast.error("Erro ao criar sprint."),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/sprints/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar sprint");
      return res.json();
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Sprint[]>(queryKey);
      queryClient.setQueryData<Sprint[]>(queryKey, (old = []) =>
        old.map((s) => (s.id === id ? { ...s, status } : s))
      );
      return { previous };
    },
    onSuccess: (_data, { status }) => {
      const label = SPRINT_STATUS_LABEL[status as SprintStatus] ?? status;
      toast.success(`Sprint marcada como "${label}"`);
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous);
      toast.error("Erro ao atualizar status da sprint.");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  if (projetos.length === 0) {
    return <p className="text-muted-foreground">Crie um projeto primeiro.</p>;
  }

  function diasRestantes(dataFim: string) {
    const diff = Math.ceil(
      (new Date(dataFim).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return diff;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-sm font-medium">Projeto:</label>
        <select
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={projetoId}
          onChange={(e) => setProjetoId(e.target.value)}
        >
          {projetos.map((p) => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </select>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>Nova sprint</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova sprint</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createSprint.mutate(form);
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  placeholder="ex: Sprint 1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="objetivo">Objetivo</Label>
                <Input
                  id="objetivo"
                  value={form.objetivo}
                  onChange={(e) => setForm((f) => ({ ...f, objetivo: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dataInicio">Data início *</Label>
                  <Input
                    id="dataInicio"
                    type="date"
                    value={form.dataInicio}
                    onChange={(e) => setForm((f) => ({ ...f, dataInicio: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="dataFim">Data fim *</Label>
                  <Input
                    id="dataFim"
                    type="date"
                    value={form.dataFim}
                    onChange={(e) => setForm((f) => ({ ...f, dataFim: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="capacidadeTotal">Capacidade total (pontos)</Label>
                <Input
                  id="capacidadeTotal"
                  type="number"
                  min={0}
                  value={form.capacidadeTotal}
                  onChange={(e) => setForm((f) => ({ ...f, capacidadeTotal: e.target.value }))}
                />
              </div>
              <Button type="submit" disabled={createSprint.isPending}>
                {createSprint.isPending ? "Criando…" : "Criar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : sprints.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhuma sprint. Clique em &quot;Nova sprint&quot; para criar.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(sprints as Sprint[]).map((s) => {
            const dias = diasRestantes(s.dataFim);
            const isAtiva = s.status === "EM_ANDAMENTO";
            const isPlanejada = s.status === "PLANEJADA";

            return (
              <Card
                key={s.id}
                className={`flex flex-col cursor-pointer hover:shadow-md transition-shadow ${STATUS_STYLE[s.status] ?? ""}`}
                onClick={() => router.push(`/dashboard/sprints/${s.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">
                      <Link
                        href={`/dashboard/sprints/${s.id}`}
                        className="hover:underline"
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        {s.nome}
                      </Link>
                    </CardTitle>
                    {isAtiva && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0">
                        <Zap className="h-2.5 w-2.5" /> Ativa
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {SPRINT_STATUS_LABEL[s.status as SprintStatus]} · {s._count.cards} cards
                  </p>
                </CardHeader>

                <CardContent className="flex flex-col flex-1 gap-3">
                  <div className="text-sm text-muted-foreground">
                    {new Date(s.dataInicio).toLocaleDateString("pt-BR")} –{" "}
                    {new Date(s.dataFim).toLocaleDateString("pt-BR")}
                  </div>

                  {isAtiva && (
                    <p className={`text-xs font-medium ${dias < 0 ? "text-red-500" : dias <= 2 ? "text-orange-500" : "text-muted-foreground"}`}>
                      {dias < 0
                        ? `Encerrou há ${Math.abs(dias)} dia${Math.abs(dias) !== 1 ? "s" : ""}`
                        : dias === 0
                        ? "Encerra hoje"
                        : `${dias} dia${dias !== 1 ? "s" : ""} restante${dias !== 1 ? "s" : ""}`}
                    </p>
                  )}

                  <div
                    className="mt-auto flex items-center gap-2 flex-wrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isPlanejada && (
                      <Button
                        size="sm"
                        variant="default"
                        disabled={updateStatus.isPending}
                        onClick={() => updateStatus.mutate({ id: s.id, status: "EM_ANDAMENTO" })}
                      >
                        <Play className="h-3.5 w-3.5 mr-1" />
                        Iniciar
                      </Button>
                    )}

                    {isAtiva && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-green-300 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950/30"
                        disabled={updateStatus.isPending}
                        onClick={() => updateStatus.mutate({ id: s.id, status: "CONCLUIDA" })}
                      >
                        <CheckCheck className="h-3.5 w-3.5 mr-1" />
                        Encerrar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
