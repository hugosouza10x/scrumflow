import { Skeleton } from "@/components/ui/skeleton";

export default function MeuTrabalhoLoading() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>

      {/* Section label */}
      <Skeleton className="h-4 w-24" />

      {/* Card list */}
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border/60 bg-card px-4 py-3 flex items-center gap-3"
          >
            <Skeleton className="h-5 w-5 rounded shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
