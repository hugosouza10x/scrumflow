import { Skeleton } from "@/components/ui/skeleton";

export default function KanbanLoading() {
  const cols = [
    { cards: 3 },
    { cards: 2 },
    { cards: 4 },
    { cards: 1 },
    { cards: 3 },
  ];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-9 ml-auto rounded-lg" />
      </div>

      {/* Board */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {cols.map((col, i) => (
          <div
            key={i}
            className="shrink-0 w-72 rounded-xl border border-border/60 bg-card/50 p-3 space-y-2.5"
          >
            {/* Column header */}
            <div className="flex items-center justify-between px-1 pb-1">
              <div className="flex items-center gap-2">
                <Skeleton className="h-2 w-2 rounded-full" />
                <Skeleton className="h-3.5 w-24" />
              </div>
              <Skeleton className="h-5 w-6 rounded-md" />
            </div>

            {/* Cards */}
            {Array.from({ length: col.cards }).map((_, j) => (
              <div
                key={j}
                className="rounded-lg border border-border/50 bg-card p-3 space-y-2"
              >
                <Skeleton className="h-3.5 w-4/5" />
                <Skeleton className="h-3 w-3/5" />
                <div className="flex items-center justify-between pt-1">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-5 rounded-full" />
                </div>
              </div>
            ))}

            {/* Add card ghost */}
            <Skeleton className="h-8 w-full rounded-lg opacity-40" />
          </div>
        ))}
      </div>
    </div>
  );
}
