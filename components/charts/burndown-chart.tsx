"use client";

import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

type BurndownPoint = {
  dia: string;
  ideal: number;
  real: number;
};

function formatDia(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export function BurndownChart({ sprintId }: { sprintId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["burndown", sprintId],
    queryFn: async () => {
      const res = await fetch(`/api/sprints/${sprintId}/burndown`);
      if (!res.ok) throw new Error("Erro ao carregar burndown");
      return res.json();
    },
  });

  if (isLoading) return <Skeleton className="h-56 w-full" />;
  if (!data || data.data?.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Sem dados suficientes para o burndown.
      </p>
    );
  }

  const chartData = (data.data as BurndownPoint[]).map((p) => ({
    ...p,
    dia: formatDia(p.dia),
  }));

  return (
    <div>
      <div className="flex gap-4 text-sm mb-4">
        <div className="flex items-center gap-2">
          <span className="inline-block h-0.5 w-6 bg-muted-foreground/50 border-dashed border-t-2" />
          <span className="text-muted-foreground">Ideal</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-0.5 w-6 bg-blue-500" />
          <span className="text-muted-foreground">Real</span>
        </div>
        <span className="ml-auto text-muted-foreground">
          Total: <strong>{data.totalPontos} pts</strong> · {data.totalCards} cards
        </span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(value, name) => [
              `${value} pts`,
              name === "ideal" ? "Ideal" : "Real",
            ]}
          />
          <Line
            type="linear"
            dataKey="ideal"
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="5 5"
            strokeWidth={1.5}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="real"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
