import { Skeleton } from "@/components/ui/skeleton";

export default function MeuTrabalhoLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-44" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
