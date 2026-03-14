"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { Pencil, Trash2, Check, X } from "lucide-react";

const EMOJIS = ["👍", "❤️", "🎉", "😄", "😕", "👀"];

type Reacao = { id: string; emoji: string; userId: string; user: { id: string; nome: string } };

type Comentario = {
  id: string;
  conteudo: string;
  user: { id: string; nome: string };
  createdAt: string;
  editadoEm: string | null;
  reacoes: Reacao[];
};

type Usuario = { id: string; nome: string };

function getInitials(nome: string) {
  return nome.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

/** Agrupa reações por emoji */
function agruparReacoes(reacoes: Reacao[]) {
  const map: Record<string, { count: number; nomes: string[]; minha: boolean }> = {};
  for (const r of reacoes) {
    if (!map[r.emoji]) map[r.emoji] = { count: 0, nomes: [], minha: false };
    map[r.emoji].count++;
    map[r.emoji].nomes.push(r.user.nome);
  }
  return map;
}

/** Realça @nome no texto */
function renderMencoes(texto: string) {
  const partes = texto.split(/(@\w+(?:\s\w+)?)/g);
  return partes.map((parte, i) =>
    parte.startsWith("@") ? (
      <mark key={i} className="rounded bg-primary/10 px-1 text-primary font-medium not-italic">
        {parte}
      </mark>
    ) : (
      parte
    )
  );
}

function hasMarkdown(t: string) {
  return /\*\*|\*|`|^#+\s|^-\s/m.test(t);
}

// ─── CommentItem ─────────────────────────────────────────────────────────────

function CommentItem({
  c,
  currentUserId,
  cardId,
}: {
  c: Comentario;
  currentUserId: string;
  cardId: string;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(c.conteudo);
  const [showEmojis, setShowEmojis] = useState(false);
  const isAuthor = c.user.id === currentUserId;

  const agrupadas = agruparReacoes(c.reacoes);
  // Verificar reações do usuário atual
  const minhasReacoes = new Set(c.reacoes.filter((r) => r.userId === currentUserId).map((r) => r.emoji));

  const editMutation = useMutation({
    mutationFn: async (conteudo: string) => {
      const res = await fetch(`/api/cards/${cardId}/comentarios/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conteudo }),
      });
      if (!res.ok) throw new Error("Erro ao editar");
      return res.json();
    },
    onSuccess: () => {
      setEditing(false);
      toast.success("Comentário editado");
      qc.invalidateQueries({ queryKey: ["card-comentarios", cardId] });
    },
    onError: () => toast.error("Erro ao editar comentário"),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/cards/${cardId}/comentarios/${c.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir");
    },
    onSuccess: () => {
      toast.success("Comentário removido");
      qc.invalidateQueries({ queryKey: ["card-comentarios", cardId] });
    },
    onError: () => toast.error("Erro ao excluir comentário"),
  });

  const reacaoMutation = useMutation({
    mutationFn: async (emoji: string) => {
      const res = await fetch(`/api/cards/${cardId}/comentarios/${c.id}/reacoes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
    onSuccess: () => {
      setShowEmojis(false);
      qc.invalidateQueries({ queryKey: ["card-comentarios", cardId] });
    },
  });

  return (
    <li className="group rounded-md border p-3 text-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary text-[10px] font-bold shrink-0">
          {getInitials(c.user.nome)}
        </div>
        <span className="font-medium text-sm">{c.user.nome}</span>
        <span className="text-xs text-muted-foreground">{timeAgo(c.createdAt)}</span>
        {c.editadoEm && (
          <span className="text-[10px] text-muted-foreground/60 italic">(editado)</span>
        )}
        {/* Ações — aparecem no hover */}
        <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            onClick={() => setShowEmojis((v) => !v)}
            title="Reagir"
          >
            😊
          </button>
          {isAuthor && !editing && (
            <>
              <button
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                onClick={() => { setDraft(c.conteudo); setEditing(true); }}
                title="Editar"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                className="p-1 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600 dark:hover:bg-red-950/30"
                onClick={() => {
                  if (confirm("Excluir este comentário?")) deleteMutation.mutate();
                }}
                title="Excluir"
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Picker de emojis */}
      {showEmojis && (
        <div className="flex gap-1 mb-2 flex-wrap">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => reacaoMutation.mutate(emoji)}
              className={`text-base rounded px-1.5 py-0.5 hover:bg-muted transition-colors border ${
                minhasReacoes.has(emoji) ? "border-primary bg-primary/10" : "border-transparent"
              }`}
              title={emoji}
            >
              {emoji}
            </button>
          ))}
          <button
            onClick={() => setShowEmojis(false)}
            className="text-xs text-muted-foreground hover:text-foreground px-1"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Conteúdo ou editor */}
      {editing ? (
        <div className="space-y-2">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={editMutation.isPending || !draft.trim()}
              onClick={() => editMutation.mutate(draft.trim())}
            >
              <Check className="h-3 w-3 mr-1" />
              Salvar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setEditing(false)}
            >
              <X className="h-3 w-3 mr-1" />
              Cancelar
            </Button>
          </div>
        </div>
      ) : hasMarkdown(c.conteudo) ? (
        <MarkdownContent content={c.conteudo} />
      ) : (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
          {renderMencoes(c.conteudo)}
        </p>
      )}

      {/* Reações agrupadas */}
      {Object.keys(agrupadas).length > 0 && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {Object.entries(agrupadas).map(([emoji, { count, nomes, minha: _m }]) => (
            <button
              key={emoji}
              onClick={() => reacaoMutation.mutate(emoji)}
              title={nomes.join(", ")}
              className={`flex items-center gap-0.5 text-xs rounded-full px-2 py-0.5 border transition-colors hover:bg-muted ${
                minhasReacoes.has(emoji)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-muted-foreground/20 text-muted-foreground"
              }`}
            >
              {emoji} {count}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CardComentarios({ cardId }: { cardId: string }) {
  const queryClient = useQueryClient();
  const [texto, setTexto] = useState("");
  const [markdown, setMarkdown] = useState(false);
  const [sugestoes, setSugestoes] = useState<Usuario[]>([]);
  const [cursorAt, setCursorAt] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: comentarios = [], isLoading } = useQuery<Comentario[]>({
    queryKey: ["card-comentarios", cardId],
    queryFn: async () => {
      const res = await fetch(`/api/cards/${cardId}/comentarios`);
      if (!res.ok) throw new Error("Erro ao carregar");
      return res.json();
    },
  });

  // Obter currentUserId via cookie/JWT (simulamos via query de /api/me ou verificamos pelo user nos comentários)
  const { data: team = [] } = useQuery<Usuario[]>({
    queryKey: ["team"],
    queryFn: async () => {
      const res = await fetch("/api/team");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
  });

  // Obter currentUserId via /api/me
  const { data: me } = useQuery<{ id: string }>({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/me");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 60 * 60 * 1000,
  });

  const create = useMutation({
    mutationFn: async (conteudo: string) => {
      const res = await fetch(`/api/cards/${cardId}/comentarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conteudo }),
      });
      if (!res.ok) throw new Error("Erro ao enviar");
      return res.json();
    },
    onMutate: async (conteudo) => {
      await queryClient.cancelQueries({ queryKey: ["card-comentarios", cardId] });
      const previous = queryClient.getQueryData<Comentario[]>(["card-comentarios", cardId]);
      const optimistic: Comentario = {
        id: `temp-${Date.now()}`,
        conteudo,
        user: { id: me?.id ?? "me", nome: "Você" },
        createdAt: new Date().toISOString(),
        editadoEm: null,
        reacoes: [],
      };
      queryClient.setQueryData<Comentario[]>(["card-comentarios", cardId], (old = []) => [
        optimistic,
        ...old,
      ]);
      setTexto("");
      setSugestoes([]);
      return { previous };
    },
    onSuccess: () => toast.success("Comentário enviado!"),
    onError: (_err, _vars, context) => {
      if (context?.previous)
        queryClient.setQueryData(["card-comentarios", cardId], context.previous);
      toast.error("Erro ao enviar comentário.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["card-comentarios", cardId] });
    },
  });

  function handleTextoChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setTexto(val);
    const cursor = e.target.selectionStart ?? val.length;
    const textoAnteCursor = val.slice(0, cursor);
    const match = textoAnteCursor.match(/@(\w*)$/);
    if (match) {
      const q = match[1].toLowerCase();
      setSugestoes(team.filter((u) => u.nome.toLowerCase().includes(q)).slice(0, 5));
      setCursorAt(cursor);
    } else {
      setSugestoes([]);
      setCursorAt(null);
    }
  }

  function inserirMencao(usuario: Usuario) {
    if (cursorAt === null) return;
    const textoAnteCursor = texto.slice(0, cursorAt);
    const posAt = textoAnteCursor.lastIndexOf("@");
    const antes = texto.slice(0, posAt);
    const depois = texto.slice(cursorAt);
    const primeiroNome = usuario.nome.split(" ")[0];
    setTexto(`${antes}@${primeiroNome} ${depois}`);
    setSugestoes([]);
    setCursorAt(null);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Comentários</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Comentários ({comentarios.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!texto.trim()) return;
            create.mutate(texto.trim());
          }}
          className="space-y-2"
        >
          <div className="relative">
            <div className="flex gap-1 mb-1">
              <button
                type="button"
                onClick={() => setMarkdown(false)}
                className={`rounded px-2 py-0.5 text-xs transition-colors ${!markdown ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => setMarkdown(true)}
                className={`rounded px-2 py-0.5 text-xs transition-colors ${markdown ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Prévia
              </button>
            </div>

            {markdown ? (
              <div className="min-h-[80px] rounded-md border px-3 py-2">
                {texto.trim() ? (
                  <MarkdownContent content={texto} />
                ) : (
                  <p className="text-sm text-muted-foreground italic">Nada para visualizar.</p>
                )}
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                value={texto}
                onChange={handleTextoChange}
                placeholder="Escreva um comentário... Use @ para mencionar, **negrito**, *itálico*"
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
              />
            )}

            {sugestoes.length > 0 && (
              <div className="absolute z-10 mt-1 w-48 rounded-md border bg-background shadow-lg">
                {sugestoes.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => inserirMencao(u)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {u.nome[0]}
                    </span>
                    {u.nome}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Suporta **Markdown** · @ mencionar
            </p>
            <Button type="submit" size="sm" disabled={create.isPending || !texto.trim()}>
              {create.isPending ? "Enviando…" : "Enviar"}
            </Button>
          </div>
        </form>

        <ul className="space-y-3">
          {comentarios.map((c) => (
            <CommentItem key={c.id} c={c} currentUserId={me?.id ?? ""} cardId={cardId} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
