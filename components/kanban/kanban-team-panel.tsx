"use client";

import { useQuery } from "@tanstack/react-query";
import { X, Users, AlertCircle, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { TeamWorkloadItem } from "@/app/api/team/workload/route";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type KanbanTeamPanelProps = {
  onSelectResponsavel: (id: string) => void;
  selectedResponsavelId?: string;
  onClose: () => void;
};

export function KanbanTeamPanel({
  onSelectResponsavel,
  selectedResponsavelId,
  onClose,
}: KanbanTeamPanelProps) {
  const { data: workload = [], isLoading } = useQuery<TeamWorkloadItem[]>({
    queryKey: ["team-workload"],
    queryFn: async () => {
      const res = await fetch("/api/team/workload");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const totalCards = workload.reduce((acc, m) => acc + m.total, 0);

  return (
    <div className="flex-shrink-0 w-72 rounded-xl border bg-muted/10 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Carga da Equipe</h3>
          {!isLoading && (
            <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
              {totalCards} cards
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="Fechar painel"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Member list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {/* "Todos" option to clear filter */}
        <button
          onClick={() => onSelectResponsavel("")}
          className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
            !selectedResponsavelId
              ? "bg-primary/10 text-primary font-medium"
              : "hover:bg-muted/60 text-muted-foreground"
          }`}
        >
          <span className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold flex-shrink-0">
            <Users className="h-3.5 w-3.5" />
          </span>
          <span className="flex-1 text-left">Todos</span>
        </button>

        <div className="border-t my-1" />

        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2.5 px-3 py-2">
              <Skeleton className="h-7 w-7 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2.5 w-16" />
              </div>
            </div>
          ))
        ) : workload.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">
            Nenhum membro encontrado
          </p>
        ) : (
          workload.map((member) => {
            const isSelected = selectedResponsavelId === member.user.id;
            return (
              <button
                key={member.user.id}
                onClick={() =>
                  onSelectResponsavel(isSelected ? "" : member.user.id)
                }
                className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isSelected
                    ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                    : "hover:bg-muted/60"
                }`}
              >
                {/* Avatar */}
                <span
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                    isSelected
                      ? "bg-primary/20 text-primary"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {getInitials(member.user.nome)}
                </span>

                {/* Name + stats */}
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-medium truncate leading-tight">
                    {member.user.nome}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-muted-foreground">
                      {member.total === 0
                        ? "sem cards ativos"
                        : `${member.total} ${member.total === 1 ? "card" : "cards"}`}
                    </span>
                    {member.bloqueados > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-red-600 dark:text-red-400">
                        <AlertCircle className="h-2.5 w-2.5" />
                        {member.bloqueados}
                      </span>
                    )}
                    {member.atrasados > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                        <Clock className="h-2.5 w-2.5" />
                        {member.atrasados}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card count badge */}
                {member.total > 0 && (
                  <span
                    className={`text-xs font-semibold rounded-full px-2 py-0.5 flex-shrink-0 ${
                      member.total >= 8
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : member.total >= 5
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {member.total}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Footer legend */}
      <div className="border-t px-3 py-2 bg-background">
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <AlertCircle className="h-2.5 w-2.5 text-red-500" />
            Bloqueados
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-2.5 w-2.5 text-amber-500" />
            Atrasados
          </span>
          <span className="ml-auto">
            <span className="inline-block h-2 w-4 rounded bg-amber-100 mr-0.5" />
            5+ cards
          </span>
        </div>
      </div>
    </div>
  );
}
