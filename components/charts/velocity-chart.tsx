"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

type VelocityPoint = {
  nome: string;
  pontos: number;
  meta: number | null;
};

export function VelocityChart({ projetoId }: { projetoId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["velocity", projetoId],
    queryFn: async () => {
      const res = await fetch(`/api/sprints?projetoId=${projetoId}&includeVelocity=true`);
      if (!res.ok) throw new Error("Erro ao carregar velocity");
      return res.json();
    },
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  const sprints = Array.isArray(data) ? data : [];
  const concluidas = sprints
    .filter((s: { status: string }) => s.status === "CONCLUIDA")
    .slice(-8);

  if (concluidas.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Nenhuma sprint concluída para calcular velocity.
      </p>
    );
  }

  const chartData: VelocityPoint[] = concluidas.map(
    (s: { nome: string; velocidade?: number; capacidadeTotal?: number }) => ({
      nome: s.nome.length > 10 ? s.nome.slice(0, 10) + "…" : s.nome,
      pontos: s.velocidade ?? 0,
      meta: s.capacidadeTotal ?? null,
    })
  );

  const media = Math.round(
    chartData.reduce((acc, s) => acc + s.pontos, 0) / chartData.length
  );

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-4">
        <span className="text-muted-foreground">Últimas {concluidas.length} sprints concluídas</span>
        <span className="font-medium">
          Média: <strong className="text-primary">{media} pts</strong>
        </span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
          <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={(value) => [`${value} pts`, "Entregue"]} />
          <ReferenceLine y={media} stroke="hsl(var(--primary))" strokeDasharray="4 4" label="" />
          <Bar dataKey="pontos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
