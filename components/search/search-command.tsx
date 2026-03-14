"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, FolderKanban, Layers } from "lucide-react";
import { CardStatusBadge } from "@/components/ui/status-badge";
import type { CardStatus } from "@/types";

type SearchResult = {
  cards: { id: string; titulo: string; status: string; projeto: { nome: string } | null }[];
  projetos: { id: string; nome: string }[];
  epicos: { id: string; nome: string; projetoId: string }[];
};

interface SearchCommandProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchCommand({ open, onOpenChange }: SearchCommandProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult>({ cards: [], projetos: [], epicos: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults({ cards: [], projetos: [], epicos: [] });
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onOpenChange]);

  useEffect(() => {
    if (query.length < 2) {
      setResults({ cards: [], projetos: [], epicos: [] });
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const navigate = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  if (!open) return null;

  const hasResults =
    results.cards.length > 0 || results.projetos.length > 0 || results.epicos.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-10 w-full max-w-xl rounded-xl border bg-background shadow-2xl">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar cards, projetos, épicos..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {loading && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent shrink-0" />
          )}
          <kbd className="hidden sm:flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs text-muted-foreground">
            Esc
          </kbd>
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {!hasResults && query.length >= 2 && !loading && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum resultado para &ldquo;{query}&rdquo;
            </p>
          )}
          {!hasResults && query.length < 2 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Digite pelo menos 2 caracteres para buscar
            </p>
          )}

          {results.projetos.length > 0 && (
            <div className="mb-2">
              <p className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Projetos
              </p>
              {results.projetos.map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/dashboard/projetos/${p.id}`)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                >
                  <FolderKanban className="h-4 w-4 text-blue-500 shrink-0" />
                  <span className="font-medium">{p.nome}</span>
                </button>
              ))}
            </div>
          )}

          {results.epicos.length > 0 && (
            <div className="mb-2">
              <p className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Épicos
              </p>
              {results.epicos.map((e) => (
                <button
                  key={e.id}
                  onClick={() => navigate(`/dashboard/epicos/${e.id}`)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                >
                  <Layers className="h-4 w-4 text-violet-500 shrink-0" />
                  <span className="font-medium">{e.nome}</span>
                </button>
              ))}
            </div>
          )}

          {results.cards.length > 0 && (
            <div>
              <p className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Cards
              </p>
              {results.cards.map((c) => (
                <button
                  key={c.id}
                  onClick={() => navigate(`/dashboard/cards/${c.id}`)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                >
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{c.titulo}</p>
                    <p className="text-xs text-muted-foreground">{c.projeto?.nome ?? "Tarefa avulsa"}</p>
                  </div>
                  <CardStatusBadge status={c.status as CardStatus} className="shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t px-4 py-2">
          <p className="text-xs text-muted-foreground">
            <kbd className="rounded border px-1 py-0.5">↵</kbd> selecionar ·{" "}
            <kbd className="rounded border px-1 py-0.5">Esc</kbd> fechar ·{" "}
            <kbd className="rounded border px-1 py-0.5">Ctrl K</kbd> abrir
          </p>
        </div>
      </div>
    </div>
  );
}
