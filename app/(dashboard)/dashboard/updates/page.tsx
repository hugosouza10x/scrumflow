import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UpdatesPageClient } from "./updates-page-client";

export default async function UpdatesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Meus updates diários</h1>
        <p className="text-muted-foreground">
          Registre o que fez hoje, o que concluiu e o próximo passo.
        </p>
      </div>
      <UpdatesPageClient />
    </div>
  );
}
