import { Skeleton } from "@/components/ui/skeleton";

export default function CardDetalheLoading() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
      {/* Main column */}
      <div className="space-y-5">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-3 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>

        {/* Title */}
        <Skeleton className="h-7 w-4/5" />

        {/* Status chips */}
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-24 rounded-full" />
          ))}
        </div>

        {/* Description */}
        <div className="space-y-2 pt-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>

        {/* Acceptance criteria */}
        <div className="rounded-xl border border-border/60 p-4 space-y-2">
          <Skeleton className="h-4 w-36 mb-3" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded shrink-0" />
              <Skeleton className="h-3.5 w-full" />
            </div>
          ))}
        </div>

        {/* Comments */}
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-8 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
