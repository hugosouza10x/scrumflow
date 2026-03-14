import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { usuarioService } from "@/services/usuario.service";
import { clienteService } from "@/services/cliente.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormNovoProjeto } from "./form-novo-projeto";

export default async function NovoProjetoPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [usuarios, clientes] = await Promise.all([
    usuarioService.listActive(),
    clienteService.list(),
  ]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href="/dashboard/projetos" className="text-sm text-muted-foreground hover:underline">
          ← Projetos
        </Link>
        <h1 className="text-2xl font-bold mt-1">Novo projeto</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Criar projeto</CardTitle>
        </CardHeader>
        <CardContent>
          <FormNovoProjeto usuarios={usuarios} clientes={clientes} />
        </CardContent>
      </Card>
    </div>
  );
}
