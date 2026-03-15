import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-end justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-4 w-52" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <div className="border-t border-border/50" />

      {/* Bloco 1: Alert chips */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-32 rounded-lg" />
        ))}
      </div>

      {/* Bloco 2: Sprint cards */}
      <div>
        <Skeleton className="h-4 w-28 mb-3" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-16 rounded-md" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
              <div className="flex justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bloco 3: KPI tiles + funil */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          <Skeleton className="h-4 w-32 mb-3" />
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border/60 bg-card p-4 flex gap-3">
                <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-7 w-12" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
          <Skeleton className="h-4 w-28" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-8" />
              </div>
              <Skeleton className="h-2.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Bloco 4: Requer atenção + Bloco 5: Prazos */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28 mb-3" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-32 mb-3" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      </div>

      {/* Bloco 6: Team table */}
      <div>
        <Skeleton className="h-4 w-32 mb-3" />
        <div className="rounded-xl border border-border/60 overflow-hidden">
          <div className="bg-muted/30 px-4 py-3 flex gap-4">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-10" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-4 border-t border-border/40">
              <div className="flex items-center gap-2 flex-1">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-2 w-20 rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
