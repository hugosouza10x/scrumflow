"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Usuario = { id: string; nome: string };
type Cliente = { id: string; nome: string };

export function FormNovoProjeto({ usuarios, clientes }: { usuarios: Usuario[]; clientes: Cliente[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    nome: "",
    descricao: "",
    liderId: "",
    clienteId: "",
    dataInicio: "",
    dataPrevisao: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/projetos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: form.nome,
          descricao: form.descricao || undefined,
          liderId: form.liderId || undefined,
          clienteId: form.clienteId || undefined,
          dataInicio: form.dataInicio || undefined,
          dataPrevisao: form.dataPrevisao || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Erro ao criar projeto.");
        return;
      }
      router.push(`/dashboard/projetos/${data.id}`);
      router.refresh();
    } catch {
      setError("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="nome">Nome *</Label>
        <Input
          id="nome"
          value={form.nome}
          onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
          required
        />
      </div>
      <div>
        <Label htmlFor="descricao">Descrição</Label>
        <textarea
          id="descricao"
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={form.descricao}
          onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
        />
      </div>
      <div>
        <Label htmlFor="lider">Líder</Label>
        <select
          id="lider"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={form.liderId}
          onChange={(e) => setForm((f) => ({ ...f, liderId: e.target.value }))}
        >
          <option value="">Selecione</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>{u.nome}</option>
          ))}
        </select>
      </div>
      {clientes.length > 0 && (
        <div>
          <Label htmlFor="cliente">Cliente</Label>
          <select
            id="cliente"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.clienteId}
            onChange={(e) => setForm((f) => ({ ...f, clienteId: e.target.value }))}
          >
            <option value="">Sem cliente</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="dataInicio">Data início</Label>
          <Input
            id="dataInicio"
            type="date"
            value={form.dataInicio}
            onChange={(e) => setForm((f) => ({ ...f, dataInicio: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="dataPrevisao">Previsão</Label>
          <Input
            id="dataPrevisao"
            type="date"
            value={form.dataPrevisao}
            onChange={(e) => setForm((f) => ({ ...f, dataPrevisao: e.target.value }))}
          />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Criando…" : "Criar projeto"}
      </Button>
    </form>
  );
}
