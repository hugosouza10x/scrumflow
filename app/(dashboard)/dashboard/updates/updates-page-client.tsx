"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

type Update = {
  id: string;
  data: string;
  trabalheiHoje: string | null;
  concluido: string | null;
  proximoPasso: string | null;
  bloqueio: boolean;
};

export function UpdatesPageClient() {
  const queryClient = useQueryClient();
  const [data, setData] = useState(todayStr());
  const [form, setForm] = useState({
    trabalheiHoje: "",
    concluido: "",
    proximoPasso: "",
    bloqueio: false,
  });

  const { data: updates = [], isLoading } = useQuery({
    queryKey: ["updates"],
    queryFn: async () => {
      const res = await fetch("/api/updates");
      if (!res.ok) throw new Error("Erro ao carregar");
      return res.json();
    },
  });

  const save = useMutation({
    mutationFn: async (payload: typeof form & { data: string }) => {
      const res = await fetch("/api/updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: payload.data,
          trabalheiHoje: payload.trabalheiHoje || undefined,
          concluido: payload.concluido || undefined,
          proximoPasso: payload.proximoPasso || undefined,
          bloqueio: payload.bloqueio,
        }),
      });
      if (!res.ok) throw new Error("Erro ao salvar");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["updates"] });
    },
  });

  const updateForDate = (updates as Update[]).find(
    (u) => u.data.slice(0, 10) === data
  );

  useEffect(() => {
    const u = (updates as Update[]).find((x) => x.data.slice(0, 10) === data);
    setForm({
      trabalheiHoje: u?.trabalheiHoje ?? "",
      concluido: u?.concluido ?? "",
      proximoPasso: u?.proximoPasso ?? "",
      bloqueio: u?.bloqueio ?? false,
    });
  }, [data, updates]);

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Registrar update</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="data">Data</Label>
            <Input
              id="data"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="trabalhei">O que trabalhei hoje</Label>
            <textarea
              id="trabalhei"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.trabalheiHoje}
              onChange={(e) => setForm((f) => ({ ...f, trabalheiHoje: e.target.value }))}
              placeholder="Descreva as atividades do dia"
            />
          </div>
          <div>
            <Label htmlFor="concluido">O que concluí</Label>
            <textarea
              id="concluido"
              className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.concluido}
              onChange={(e) => setForm((f) => ({ ...f, concluido: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="proximo">Próximo passo</Label>
            <textarea
              id="proximo"
              className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.proximoPasso}
              onChange={(e) => setForm((f) => ({ ...f, proximoPasso: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="bloqueio"
              checked={form.bloqueio}
              onChange={(e) => setForm((f) => ({ ...f, bloqueio: e.target.checked }))}
              className="rounded border-input"
            />
            <Label htmlFor="bloqueio">Existe bloqueio?</Label>
          </div>
          <Button
            onClick={() => save.mutate({ ...form, data })}
            disabled={save.isPending}
          >
            {save.isPending ? "Salvando…" : "Salvar update"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico recente</CardTitle>
        </CardHeader>
        <CardContent>
          {(updates as Update[]).length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum update registrado.</p>
          ) : (
            <ul className="space-y-3">
              {(updates as Update[]).slice(0, 7).map((u) => (
                <li key={u.id} className="rounded-md border p-3 text-sm">
                  <p className="font-medium text-muted-foreground">
                    {new Date(u.data).toLocaleDateString("pt-BR", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                  {u.trabalheiHoje && <p>{u.trabalheiHoje}</p>}
                  {u.concluido && <p className="text-muted-foreground">Concluído: {u.concluido}</p>}
                  {u.bloqueio && <p className="text-destructive text-xs">Bloqueio</p>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
