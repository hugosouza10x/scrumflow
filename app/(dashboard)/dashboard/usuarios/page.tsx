import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { usuarioService } from "@/services/usuario.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListaUsuarios } from "./lista-usuarios";

export default async function UsuariosPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.cargo.slug !== "admin") redirect("/dashboard");

  const rawUsers = await usuarioService.list();
  const users = rawUsers.map(({ passwordHash: _, ...u }) => ({
    ...u,
    lastSeenAt: u.lastSeenAt ? u.lastSeenAt.toISOString() : null,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Usuários</h1>
        <p className="text-muted-foreground">
          Gerencie usuários e cargos. Apenas administradores.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Lista de usuários</CardTitle>
        </CardHeader>
        <CardContent>
          <ListaUsuarios initialUsers={users} />
        </CardContent>
      </Card>
    </div>
  );
}
