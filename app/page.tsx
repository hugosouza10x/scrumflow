import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Link from "next/link";

export default async function HomePage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 bg-gradient-to-b from-background to-muted/30">
      <h1 className="text-4xl font-bold text-primary">ScrumFlow</h1>
      <p className="text-muted-foreground text-center max-w-md">
        Gestão de projetos e tarefas para times de tecnologia. Backlog, Sprint, Cards e visibilidade gerencial.
      </p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition"
        >
          Entrar
        </Link>
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-md border border-border hover:bg-muted transition"
        >
          Dashboard
        </Link>
      </div>
    </main>
  );
}
