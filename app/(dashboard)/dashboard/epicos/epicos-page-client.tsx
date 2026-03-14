"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import Link from "next/link";
import { Layers } from "lucide-react";

type Projeto = { id: string; nome: string };
type Epico = {
  id: string;
  nome: string;
  descricao: string | null;
  status: string;
  projetoId: string;
  projeto: { nome: string };
  _count: { cards: number };
  cardsConcluidosCount: number;
};

const STATUS_LABEL: Record<string, string> = {
  ABERTO: "Aberto",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};
const STATUS_COLOR: Record<string, string> = {
  ABERTO: "bg-slate-100 text-slate-600",
  EM_ANDAMENTO: "bg-sky-100 text-sky-700",
  CONCLUIDO: "bg-green-100 text-green-700",
  CANCELADO: "bg-gray-100 text-gray-500",
};

function ProgressBar({ total, concluidos }: { total: number; concluidos: number }) {
  if (total === 0) return null;
  const pct = Math.round((concluidos / total) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{concluidos}/{total} cards concluídos</span>
        <span className="font-medium">{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            pct === 100 ? "bg-green-500" : pct >= 50 ? "bg-primary" : "bg-primary/60"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function EpicosPageClient({ projetos }: { projetos: Projeto[] }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [projetoId, setProjetoId] = useState(projetos[0]?.id ?? "");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", descricao: "" });

  const { data: epicos = [], isLoading } = useQuery({
    queryKey: ["epicos", projetoId],
    queryFn: async () => {
      const res = await fetch(`/api/epicos?projetoId=${projetoId}`);
      if (!res.ok) throw new Error("Erro ao carregar épicos");
      return res.json();
    },
    enabled: !!projetoId,
  });

  const createEpico = useMutation({
    mutationFn: async (data: { nome: string; descricao?: string }) => {
      const res = await fetch("/api/epicos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, projetoId }),
      });
      if (!res.ok) throw new Error("Erro ao criar épico");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["epicos", projetoId] });
      setDialogOpen(false);
      setForm({ nome: "", descricao: "" });
      toast.success("Épico criado com sucesso!");
    },
    onError: () => toast.error("Erro ao criar épico."),
  });

  if (projetos.length === 0) {
    return (
      <EmptyState
        icon={Layers}
        title="Nenhum projeto disponível"
        description="Crie um projeto primeiro para usar épicos."
        action={{ label: "Criar projeto", href: "/dashboard/projetos/novo" }}
      />
    );
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
            <Button>Novo épico</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo épico</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createEpico.mutate({
                  nome: form.nome,
                  descricao: form.descricao || undefined,
                });
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  placeholder="ex: Módulo de autenticação"
                  required
                />
              </div>
              <div>
                <Label htmlFor="desc">Descrição (Markdown)</Label>
                <MarkdownEditor
                  id="desc"
                  value={form.descricao}
                  onChange={(v) => setForm((f) => ({ ...f, descricao: v }))}
                  rows={4}
                />
              </div>
              <Button type="submit" disabled={createEpico.isPending}>
                {createEpico.isPending ? "Criando…" : "Criar épico"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-lg border bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : epicos.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Nenhum épico neste projeto"
          description="Crie épicos para agrupar cards relacionados."
          action={{ label: "Novo épico", onClick: () => setDialogOpen(true) }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(epicos as Epico[]).map((e) => (
            <Card
              key={e.id}
              className="flex flex-col cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/dashboard/epicos/${e.id}`)}
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-base leading-snug">
                  <Link
                    href={`/dashboard/epicos/${e.id}`}
                    className="hover:underline"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    {e.nome}
                  </Link>
                </CardTitle>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold shrink-0 ml-2 ${STATUS_COLOR[e.status] ?? ""}`}
                >
                  {STATUS_LABEL[e.status] ?? e.status}
                </span>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 gap-3">
                {e.descricao && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{e.descricao}</p>
                )}

                <div className="mt-auto space-y-3">
                  <ProgressBar total={e._count.cards} concluidos={e.cardsConcluidosCount} />
                  <div className="flex items-center justify-between">
                    {e._count.cards === 0 && (
                      <span className="text-xs text-muted-foreground">Sem cards ainda</span>
                    )}
                    <div className="ml-auto" onClick={(ev) => ev.stopPropagation()}>
                      <Link href={`/dashboard/epicos/${e.id}`} onClick={(ev) => ev.stopPropagation()}>
                        <Button variant="outline" size="sm">Ver épico</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
