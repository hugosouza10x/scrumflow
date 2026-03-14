import { getSession } from "@/lib/session";
import { redirect, notFound } from "next/navigation";
import { projetoService } from "@/services/projeto.service";
import { usuarioService } from "@/services/usuario.service";
import { clienteService } from "@/services/cliente.service";
import { hasProjectAccess } from "@/lib/authorization";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormEditarProjeto } from "./form-editar-projeto";

export default async function EditarProjetoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const projeto = await projetoService.getById(id);
  if (!projeto) notFound();

  const temAcesso = await hasProjectAccess(session.id, session.cargo.slug, id);
  if (!temAcesso) notFound();

  const [usuarios, clientes] = await Promise.all([
    usuarioService.listActive(),
    clienteService.list(),
  ]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href={`/dashboard/projetos/${id}`} className="text-sm text-muted-foreground hover:underline">
          ← {projeto.nome}
        </Link>
        <h1 className="text-2xl font-bold mt-1">Editar projeto</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Editar</CardTitle>
        </CardHeader>
        <CardContent>
          <FormEditarProjeto
            projeto={{
              ...projeto,
              clienteId: projeto.clienteId ?? null,
              dataInicio: projeto.dataInicio ? projeto.dataInicio.toISOString().slice(0, 10) : null,
              dataPrevisao: projeto.dataPrevisao ? projeto.dataPrevisao.toISOString().slice(0, 10) : null,
            }}
            usuarios={usuarios}
            clientes={clientes}
          />
        </CardContent>
      </Card>
    </div>
  );
}
