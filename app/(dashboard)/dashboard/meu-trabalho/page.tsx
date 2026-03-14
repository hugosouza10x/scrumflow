import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { MeuTrabalhoClient } from "./meu-trabalho-client";

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
      <MeuTrabalhoClient userName={session.nome} />
    </div>
  );
}
