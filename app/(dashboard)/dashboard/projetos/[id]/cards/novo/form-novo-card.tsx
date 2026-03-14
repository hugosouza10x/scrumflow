"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Usuario = { id: string; nome: string };
type Template = { id: string; nome: string; slug: string; subtarefasSugeridas: unknown };

export function FormNovoCard({
  projetoId,
  usuarios,
  templates,
}: {
  projetoId: string;
  usuarios: Usuario[];
  templates: Template[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [responsavelId, setResponsavelId] = useState("");
  const [templateId, setTemplateId] = useState("");

  const template = templates.find((t) => t.id === templateId);
  const subtarefasSugeridas = Array.isArray(template?.subtarefasSugeridas)
    ? (template!.subtarefasSugeridas as { titulo: string }[])
    : [];
  const [subtarefas, setSubtarefas] = useState<{ titulo: string }[]>([]);

  function applyTemplate() {
    if (subtarefasSugeridas.length) setSubtarefas(subtarefasSugeridas.map((s) => ({ titulo: s.titulo })));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo,
          descricao: descricao || undefined,
          responsavelId: responsavelId || undefined,
          projetoId,
          subtarefas: subtarefas.length ? subtarefas : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Erro ao criar card.");
        return;
      }
      router.push(`/dashboard/cards/${data.id}`);
      router.refresh();
    } catch {
      setError("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="titulo">Título *</Label>
        <Input
          id="titulo"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="descricao">Descrição</Label>
        <textarea
          id="descricao"
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="responsavel">Responsável</Label>
        <select
          id="responsavel"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={responsavelId}
          onChange={(e) => setResponsavelId(e.target.value)}
        >
          <option value="">Selecione</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>{u.nome}</option>
          ))}
        </select>
      </div>
      {templates.length > 0 && (
        <div className="space-y-2">
          <Label>Template (sugere subtarefas)</Label>
          <div className="flex gap-2">
            <select
              className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={templateId}
              onChange={(e) => {
                setTemplateId(e.target.value);
                const t = templates.find((x) => x.id === e.target.value);
                const subs = Array.isArray(t?.subtarefasSugeridas)
                  ? (t!.subtarefasSugeridas as { titulo: string }[]).map((s) => ({ titulo: s.titulo }))
                  : [];
                setSubtarefas(subs);
              }}
            >
              <option value="">Nenhum</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
            <Button type="button" variant="outline" size="sm" onClick={applyTemplate}>
              Aplicar
            </Button>
          </div>
        </div>
      )}
      {subtarefas.length > 0 && (
        <div className="space-y-2">
          <Label>Subtarefas</Label>
          <ul className="space-y-1 rounded-md border p-2">
            {subtarefas.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <Input
                  value={s.titulo}
                  onChange={(e) => {
                    const next = [...subtarefas];
                    next[i] = { titulo: e.target.value };
                    setSubtarefas(next);
                  }}
                  placeholder="Título da subtarefa"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setSubtarefas((prev) => prev.filter((_, j) => j !== i))}
                >
                  ×
                </Button>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSubtarefas((prev) => [...prev, { titulo: "" }])}
          >
            + Subtarefa
          </Button>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Criando…" : "Criar card"}
      </Button>
    </form>
  );
}
