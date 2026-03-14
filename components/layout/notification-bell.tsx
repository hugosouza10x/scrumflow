"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect, useCallback } from "react";
import { Bell, AtSign, UserCheck, MessageSquare, ShieldAlert } from "lucide-react";
import Link from "next/link";

type Notification = {
  id: string;
  tipo: "MENCAO" | "ATRIBUICAO" | "COMENTARIO" | "BLOQUEADO";
  titulo: string;
  mensagem: string | null;
  lida: boolean;
  cardId: string | null;
  createdAt: string;
  remetente: { id: string; nome: string } | null;
};

const TIPO_CONFIG: Record<
  Notification["tipo"],
  { icon: React.ElementType; color: string }
> = {
  MENCAO: { icon: AtSign, color: "text-violet-500" },
  ATRIBUICAO: { icon: UserCheck, color: "text-blue-500" },
  COMENTARIO: { icon: MessageSquare, color: "text-sky-500" },
  BLOQUEADO: { icon: ShieldAlert, color: "text-red-500" },
};

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
  return `${Math.floor(h / 24)}d`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) return { notifications: [], total: 0 };
      return res.json();
    },
    refetchInterval: 2 * 60_000,
    refetchIntervalInBackground: false,
    staleTime: 90_000,
  });

  const notifications: Notification[] = data?.notifications ?? [];
  const total = data?.total ?? 0;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const marcarLida = useCallback(
    async (id: string) => {
      await fetch(`/api/notifications/${id}/lida`, { method: "PATCH" });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    [qc]
  );

  const marcarTodasLidas = useCallback(async () => {
    await fetch("/api/notifications/marcar-todas-lidas", { method: "PATCH" });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }, [qc]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted transition-colors"
        aria-label="Notificações"
      >
        <Bell className="h-4 w-4" />
        {total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {total > 9 ? "9+" : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border bg-background shadow-xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Notificações</h3>
            {total > 0 && (
              <button
                onClick={marcarTodasLidas}
                className="text-xs text-primary hover:underline"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <Bell className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">Tudo em dia!</p>
              </div>
            ) : (
              <ul className="p-2 space-y-0.5">
                {notifications.map((n) => {
                  const cfg = TIPO_CONFIG[n.tipo];
                  const Icon = cfg.icon;
                  const inner = (
                    <div
                      className={`flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted cursor-pointer ${
                        n.lida ? "opacity-60" : ""
                      }`}
                      onClick={() => !n.lida && marcarLida(n.id)}
                    >
                      {/* Avatar remetente ou ícone */}
                      <div className="shrink-0 mt-0.5">
                        {n.remetente ? (
                          <div className="h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">
                            {getInitials(n.remetente.nome)}
                          </div>
                        ) : (
                          <div className={`h-7 w-7 rounded-full bg-muted flex items-center justify-center`}>
                            <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <p className={`font-medium leading-snug ${!n.lida ? "text-foreground" : "text-muted-foreground"}`}>
                            {n.titulo}
                          </p>
                          <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                            {timeAgo(n.createdAt)}
                          </span>
                        </div>
                        {n.mensagem && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {n.mensagem}
                          </p>
                        )}
                      </div>

                      {/* Dot não lida */}
                      {!n.lida && (
                        <div className="shrink-0 h-2 w-2 rounded-full bg-primary mt-1.5" />
                      )}
                    </div>
                  );

                  return (
                    <li key={n.id}>
                      {n.cardId ? (
                        <Link
                          href={`/dashboard/cards/${n.cardId}`}
                          onClick={() => { setOpen(false); if (!n.lida) marcarLida(n.id); }}
                        >
                          {inner}
                        </Link>
                      ) : (
                        inner
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t px-4 py-2 text-xs text-muted-foreground text-center">
            Atribuições, menções e comentários
          </div>
        </div>
      )}
    </div>
  );
}
