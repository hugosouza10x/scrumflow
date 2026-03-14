"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Pencil, ShieldOff, ShieldCheck } from "lucide-react";

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutos

function isOnline(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_THRESHOLD_MS;
}

type User = {
  id: string;
  nome: string;
  email: string;
  status: string;
  lastSeenAt: string | null;
  cargo: { id: string; nome: string; slug: string };
};

async function fetchUsers(): Promise<User[]> {
  const res = await fetch("/api/usuarios");
  if (!res.ok) throw new Error("Erro ao carregar usuários");
  return res.json();
}

async function fetchCargos(): Promise<{ id: string; nome: string; slug: string }[]> {
  const res = await fetch("/api/usuarios/cargos");
  if (!res.ok) throw new Error("Erro ao carregar cargos");
  return res.json();
}

async function createUser(data: { nome: string; email: string; password: string; cargoId: string }) {
  const res = await fetch("/api/usuarios", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const d = await res.json();
    throw new Error(d.message ?? "Erro ao criar");
  }
  return res.json();
}

async function updateUser(id: string, data: { nome?: string; email?: string; password?: string; cargoId?: string; status?: string }) {
  const res = await fetch(`/api/usuarios/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const d = await res.json();
    throw new Error(d.message ?? "Erro ao atualizar");
  }
  return res.json();
}

type EditForm = { nome: string; email: string; password: string; cargoId: string };

function EditDialog({ user, cargos, onClose }: { user: User; cargos: { id: string; nome: string }[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<EditForm>({
    nome: user.nome,
    email: user.email,
    password: "",
    cargoId: user.cargo.id,
  });
  const [error, setError] = useState("");

  const updateMutation = useMutation({
    mutationFn: (data: Partial<EditForm>) => updateUser(user.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      toast.success("Usuário atualizado.");
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const payload: Partial<EditForm> = {
      nome: form.nome,
      email: form.email,
      cargoId: form.cargoId,
    };
    if (form.password) payload.password = form.password;
    updateMutation.mutate(payload);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-nome">Nome</Label>
        <Input
          id="edit-nome"
          value={form.nome}
          onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
          required
          minLength={2}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-email">E-mail</Label>
        <Input
          id="edit-email"
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-password">Nova senha (opcional)</Label>
        <Input
          id="edit-password"
          type="password"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          minLength={6}
          placeholder="Deixe em branco para não alterar"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-cargo">Cargo</Label>
        <select
          id="edit-cargo"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={form.cargoId}
          onChange={(e) => setForm((f) => ({ ...f, cargoId: e.target.value }))}
        >
          {cargos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={updateMutation.isPending}>
        {updateMutation.isPending ? "Salvando…" : "Salvar"}
      </Button>
    </form>
  );
}

function RevokeDialog({
  user,
  onConfirm,
  onClose,
  isPending,
}: {
  user: User;
  onConfirm: () => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const isRevoking = user.status === "ATIVO";
  return (
    <>
      <DialogHeader>
        <DialogTitle>{isRevoking ? "Revogar acesso" : "Restaurar acesso"}</DialogTitle>
        <DialogDescription>
          {isRevoking
            ? `${user.nome} perderá acesso ao sistema imediatamente. O cadastro não será excluído e pode ser restaurado a qualquer momento.`
            : `${user.nome} voltará a ter acesso ao sistema com seu cargo e permissões anteriores.`}
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="mt-4">
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          Cancelar
        </Button>
        <Button
          variant={isRevoking ? "destructive" : "default"}
          onClick={onConfirm}
          disabled={isPending}
        >
          {isPending
            ? "Aguarde…"
            : isRevoking
              ? "Revogar acesso"
              : "Restaurar acesso"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function ListaUsuarios({ initialUsers }: { initialUsers: User[] }) {
  const queryClient = useQueryClient();
  const { data: users = initialUsers } = useQuery({
    queryKey: ["usuarios"],
    queryFn: fetchUsers,
    initialData: initialUsers,
    refetchInterval: 30 * 1000, // atualiza status online a cada 30s
  });
  const { data: cargos = [] } = useQuery({
    queryKey: ["cargos"],
    queryFn: fetchCargos,
  });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      setCreateOpen(false);
      setCreateForm({ nome: "", email: "", password: "", cargoId: "" });
      toast.success("Usuário criado.");
    },
    onError: (err: Error) => setCreateError(err.message),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateUser(id, { status }),
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      toast.success(status === "INATIVO" ? "Acesso revogado." : "Acesso restaurado.");
      setRevokeTarget(null);
    },
    onError: () => toast.error("Erro ao alterar acesso."),
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ nome: "", email: "", password: "", cargoId: "" });
  const [createError, setCreateError] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<User | null>(null);

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    if (!createForm.cargoId) {
      setCreateError("Selecione um cargo.");
      return;
    }
    createMutation.mutate(createForm);
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Criar usuário */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>Novo usuário</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo usuário</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={createForm.nome}
                  onChange={(e) => setCreateForm((f) => ({ ...f, nome: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cargo">Cargo</Label>
                <select
                  id="cargo"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={createForm.cargoId}
                  onChange={(e) => setCreateForm((f) => ({ ...f, cargoId: e.target.value }))}
                >
                  <option value="">Selecione</option>
                  {cargos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>
              {createError && <p className="text-sm text-destructive">{createError}</p>}
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Criando…" : "Criar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog editar */}
        <Dialog open={!!editingUser} onOpenChange={(open) => { if (!open) setEditingUser(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar usuário</DialogTitle>
            </DialogHeader>
            {editingUser && (
              <EditDialog
                user={editingUser}
                cargos={cargos}
                onClose={() => setEditingUser(null)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog revogar/restaurar acesso */}
        <Dialog open={!!revokeTarget} onOpenChange={(open) => { if (!open) setRevokeTarget(null); }}>
          <DialogContent>
            {revokeTarget && (
              <RevokeDialog
                user={revokeTarget}
                isPending={toggleStatusMutation.isPending}
                onConfirm={() =>
                  toggleStatusMutation.mutate({
                    id: revokeTarget.id,
                    status: revokeTarget.status === "ATIVO" ? "INATIVO" : "ATIVO",
                  })
                }
                onClose={() => setRevokeTarget(null)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Tabela */}
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 w-8"></th>
                <th className="p-3 text-left font-medium">Nome</th>
                <th className="p-3 text-left font-medium">E-mail</th>
                <th className="p-3 text-left font-medium">Cargo</th>
                <th className="p-3 text-left font-medium">Status</th>
                <th className="p-3 text-left font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const online = isOnline(u.lastSeenAt);
                return (
                  <tr key={u.id} className="border-b last:border-0">
                    {/* Indicador online */}
                    <td className="p-3 text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className={`inline-block w-2.5 h-2.5 rounded-full ${
                              online
                                ? "bg-green-500 shadow-[0_0_4px_1px_rgba(34,197,94,0.6)]"
                                : "bg-gray-300 dark:bg-gray-600"
                            }`}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          {online
                            ? "Online agora"
                            : u.lastSeenAt
                              ? `Último acesso: ${new Date(u.lastSeenAt).toLocaleString("pt-BR")}`
                              : "Nunca acessou"}
                        </TooltipContent>
                      </Tooltip>
                    </td>
                    <td className="p-3 font-medium">{u.nome}</td>
                    <td className="p-3 text-muted-foreground">{u.email}</td>
                    <td className="p-3">{u.cargo.nome}</td>
                    <td className="p-3">
                      <Badge variant={u.status === "ATIVO" ? "default" : "secondary"}>
                        {u.status === "ATIVO" ? "Ativo" : "Acesso revogado"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingUser(u)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setRevokeTarget(u)}
                            >
                              {u.status === "ATIVO" ? (
                                <ShieldOff className="h-4 w-4 text-destructive" />
                              ) : (
                                <ShieldCheck className="h-4 w-4 text-green-600" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {u.status === "ATIVO" ? "Revogar acesso" : "Restaurar acesso"}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </TooltipProvider>
  );
}
