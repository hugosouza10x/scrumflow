import { Suspense } from "react";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { MeuTrabalhoClient } from "./meu-trabalho-client";
import { Skeleton } from "@/components/ui/skeleton";

function MeuTrabalhoSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
      </div>
    </div>
  );
}

export default async function MeuTrabalhoPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Meu Trabalho</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Todas as tarefas atribuídas a você, em todos os projetos e clientes.
        </p>
      </div>
      <Suspense fallback={<MeuTrabalhoSkeleton />}>
        <MeuTrabalhoClient userName={session.nome} />
      </Suspense>
    </div>
  );
}
