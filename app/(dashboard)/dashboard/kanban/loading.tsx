import { Skeleton } from "@/components/ui/skeleton";

export default function KanbanLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-24 ml-auto" />
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {Array.from({ length: 5 }).map((_, col) => (
          <div key={col} className="shrink-0 w-72 space-y-3">
            <Skeleton className="h-8 w-full rounded-lg" />
            {Array.from({ length: col % 2 === 0 ? 3 : 2 }).map((_, card) => (
              <Skeleton key={card} className="h-28 w-full rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
