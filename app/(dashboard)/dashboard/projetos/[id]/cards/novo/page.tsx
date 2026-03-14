import { getSession } from "@/lib/session";
import { redirect, notFound } from "next/navigation";
import { projetoService } from "@/services/projeto.service";
import { prisma } from "@/lib/prisma";
import { hasProjectAccess } from "@/lib/authorization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { FormNovoCard } from "./form-novo-card";

export default async function NovoCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id: projetoId } = await params;
  const projeto = await projetoService.getById(projetoId);
  if (!projeto) notFound();

  const temAcesso = await hasProjectAccess(session.id, session.cargo.slug, projetoId);
  if (!temAcesso) notFound();

  const [usuarios, templates] = await Promise.all([
    prisma.user.findMany({
      where: { status: "ATIVO" },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
    prisma.cardTemplate.findMany({ orderBy: { nome: "asc" } }),
  ]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link
          href={`/dashboard/projetos/${projetoId}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← {projeto.nome}
        </Link>
        <h1 className="text-2xl font-bold mt-1">Novo card</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Criar card</CardTitle>
        </CardHeader>
        <CardContent>
          <FormNovoCard
            projetoId={projetoId}
            usuarios={usuarios}
            templates={templates}
          />
        </CardContent>
      </Card>
    </div>
  );
}
